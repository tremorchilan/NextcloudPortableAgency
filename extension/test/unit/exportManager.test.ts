import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { EmpireManager } from '../../src/core/EmpireManager';
import { ExportManager } from '../../src/core/ExportManager';
import { findTemplateDir } from './helpers';

const TEMPLATE = findTemplateDir(__dirname);

async function makeEmpire(name: string): Promise<{ root: string; manager: EmpireManager }> {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), `empire-export-${name}-`));
  const manager = new EmpireManager({ templateDirs: [TEMPLATE] });
  const ref = await manager.create({ name, parentDir: parent });
  return { root: ref.paths.root, manager };
}

test('export → import round-trip preserves the Empire, strips secrets', async () => {
  const { root, manager } = await makeEmpire('bakery');
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'empire-export-work-'));
  const zipPath = path.join(work, 'bakery.zip');
  const dest = path.join(work, 'imported');

  // Plant sensitive + non-sensitive state.
  fs.writeFileSync(path.join(root, 'src', 'website', 'index.html'), '<h1>Hello</h1>');
  fs.writeFileSync(path.join(root, '.env'), 'ONECLI_MASTER_KEY=do-not-leak\n');
  fs.mkdirSync(path.join(root, 'data', 'onecli'), { recursive: true });
  fs.writeFileSync(path.join(root, 'data', 'onecli', 'vault.enc'), 'ENCRYPTED-VAULT-DO-NOT-EXPORT');
  fs.mkdirSync(path.join(root, 'logs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'logs', 'audit.jsonl'), '{"event":"swap"}');

  const exporter = new ExportManager(manager);
  const result = await exporter.exportEmpire(root, zipPath, { includeLogs: false, includeData: true, includeGit: false });
  assert.ok(result.fileCount > 0);
  // .env and the vault must always be excluded.
  assert.ok(result.skipped.includes('.env'));
  assert.ok(result.skipped.includes('data/onecli/vault.enc'));
  assert.ok(!result.skipped.includes('data/onecli/vault.enc.bak')); // only planted entries listed

  // Verify the zip genuinely lacks the secrets.
  const { ZipReader } = await import('../../src/utils/zip');
  const entries = new ZipReader(zipPath).listEntries().map((e) => e.name);
  assert.ok(!entries.some((n) => n.endsWith('/.env')), '.env must not be inside the archive');
  assert.ok(!entries.some((n) => n.includes('vault.enc')), 'vault must not be inside the archive');
  assert.ok(entries.some((n) => n.endsWith('src/website/index.html')), 'source files survive');
  assert.ok(!entries.some((n) => n.includes('/logs/')), 'logs excluded by option');

  // Import into a new location.
  const imported = await exporter.importEmpire(zipPath, dest);
  assert.equal(imported.name, 'bakery');
  assert.ok(fs.existsSync(path.join(imported.empirePath, 'src', 'website', 'index.html')));
  assert.ok(fs.existsSync(path.join(imported.empirePath, '.empire', 'manifest.json')));
  // Imported .env is restored from .env.example (placeholders only).
  const env = fs.readFileSync(path.join(imported.empirePath, '.env'), 'utf8');
  assert.ok(!env.includes('do-not-leak'));
  assert.ok(env.includes('GENERATE_ME'), 'imported .env only holds template markers');
  // Vault never travels.
  assert.ok(!fs.existsSync(path.join(imported.empirePath, 'data', 'onecli', 'vault.enc')));
  // Git re-initialized so worktrees work on the new machine.
  assert.ok(fs.existsSync(path.join(imported.empirePath, '.git')));
  // Imported Empire validates.
  assert.equal(manager.validate(imported.empirePath).manifest.id, manager.validate(root).manifest.id);
});

test('import rejects archives that are not Empires', async () => {
  const { manager } = await makeEmpire('target');
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'empire-badzip-'));
  const zipPath = path.join(work, 'not-empire.zip');
  const { ZipWriter } = await import('../../src/utils/zip');
  const writer = new ZipWriter(zipPath);
  writer.addFile(Buffer.from('just a file'), 'random/thing.txt');
  writer.close();

  await assert.rejects(
    () => new ExportManager(manager).importEmpire(zipPath, work),
    /Not an Empire archive/
  );
});

test('export with data=false skips data/ entirely', async () => {
  const { root, manager } = await makeEmpire('lean');
  fs.mkdirSync(path.join(root, 'data', 'n8n'), { recursive: true });
  fs.writeFileSync(path.join(root, 'data', 'n8n', 'db.sqlite'), 'sqlite-bytes');

  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'empire-lean-'));
  const result = await new ExportManager(manager).exportEmpire(
    root, path.join(work, 'lean.zip'), { includeData: false, includeLogs: false, includeGit: false }
  );
  const { ZipReader } = await import('../../src/utils/zip');
  const entries = new ZipReader(result.zipPath).listEntries().map((e) => e.name);
  assert.ok(!entries.some((n) => n.includes('data/n8n')), 'data/ excluded');
});
