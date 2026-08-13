import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { EmpireManager } from '../../src/core/EmpireManager';
import { findTemplateDir } from './helpers';

const TEMPLATE = findTemplateDir(__dirname);

test('create scaffolds a full Empire from the template', async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'empire-create-'));
  const manager = new EmpireManager({ engineVersion: '0.0.0-test', templateDirs: [TEMPLATE] });

  const ref = await manager.create({ name: 'shop-alpha', parentDir: parent });
  assert.equal(ref.manifest.empire, 'shop-alpha');
  assert.ok(ref.manifest.id.startsWith('shop-alpha-'));
  assert.equal(ref.manifest.template, 'empire-engine/default');
  assert.equal(ref.manifest.engineVersion, '0.0.0-test');
  assert.deepEqual(ref.manifest.services, ['dockge', 'onecli']);

  // Layout present.
  for (const rel of [
    '.empire/context.md', '.empire/state.json', '.empire/manifest.json',
    'docker-compose.yml', '.env.example', '.env', '.gitignore',
    'design/tokens.json', 'design/pages/home.json',
    'src/website/README.md', 'services/onecli/policy.yaml',
    'workflows/README.md', 'docs/README.md', '.vscode/tasks.json'
  ]) {
    assert.ok(fs.existsSync(path.join(ref.paths.root, rel)), `missing ${rel}`);
  }

  // Placeholder substitution happened.
  const compose = fs.readFileSync(path.join(ref.paths.root, 'docker-compose.yml'), 'utf8');
  assert.ok(compose.includes(`name: ${ref.manifest.id}`), 'compose project name = empire id');
  assert.ok(!compose.includes('{{EMPIRE_NAME}}'), 'no raw placeholders left in compose');
  const context = fs.readFileSync(ref.paths.contextPath, 'utf8');
  assert.ok(context.includes('# Empire Context: shop-alpha'));
  const home = fs.readFileSync(path.join(ref.paths.root, 'design/pages/home.json'), 'utf8');
  assert.ok(home.includes('shop-alpha'));

  // .env GENERATE_ME markers replaced with real random values, never exported-style.
  const env = fs.readFileSync(path.join(ref.paths.root, '.env'), 'utf8');
  assert.ok(!env.includes('GENERATE_ME'));
  assert.match(env, /ONECLI_MASTER_KEY=[0-9a-f]{64}/);

  // Git repo initialized (so worktrees can spawn).
  assert.ok(fs.existsSync(path.join(ref.paths.root, '.git')));

  // Validation round-trip.
  const validated = manager.validate(ref.paths.root);
  assert.equal(validated.manifest.id, ref.manifest.id);
});

test('create rejects invalid names and existing targets', async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'empire-create-'));
  const manager = new EmpireManager({ templateDirs: [TEMPLATE] });

  await assert.rejects(() => manager.create({ name: '', parentDir: parent }), /must not be empty/);
  await assert.rejects(() => manager.create({ name: 'bad/name', parentDir: parent }), /only contain letters/);

  fs.mkdirSync(path.join(parent, 'taken'));
  await assert.rejects(() => manager.create({ name: 'taken', parentDir: parent }), /already exists/);
});

test('validate rejects non-Empires; detectInWorkspace finds Empires', async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'empire-detect-'));
  const manager = new EmpireManager({ templateDirs: [TEMPLATE] });
  const ref = await manager.create({ name: 'detect-me', parentDir: parent });

  assert.equal(manager.isEmpire(ref.paths.root), true);
  assert.throws(() => manager.validate(parent), /Not an Empire/);

  const detected = manager.detectInWorkspace([{ uri: { fsPath: ref.paths.root } }]);
  assert.equal(detected?.manifest.empire, 'detect-me');
  assert.equal(manager.detectInWorkspace([{ uri: { fsPath: parent } }]), undefined);
});
