import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { EmpireManager } from '../../src/core/EmpireManager';
import { WorktreeManager } from '../../src/core/WorktreeManager';
import { findTemplateDir } from './helpers';

const TEMPLATE = findTemplateDir(__dirname);

test('spawns per-agent worktrees with shared symlinks; list reports them', async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'empire-worktree-'));
  const manager = new EmpireManager({ templateDirs: [TEMPLATE] });
  const ref = await manager.create({ name: 'wt-test', parentDir: parent });

  // Make the shared dirs meaningful.
  fs.mkdirSync(path.join(ref.paths.root, 'src', 'website'), { recursive: true });
  fs.writeFileSync(path.join(ref.paths.root, 'src', 'website', 'app.tsx'), 'export const App = () => null;');
  fs.writeFileSync(path.join(ref.paths.root, 'design', 'tokens.json'), '{}');

  const worktrees = new WorktreeManager();
  const claude = await worktrees.spawn(ref.paths.root, 'claude');

  assert.ok(fs.existsSync(claude.worktreePath), 'worktree dir exists');
  assert.equal(claude.branch, 'empire/claude');

  // Shared dirs are symlinked into the worktree.
  const srcLink = path.join(claude.worktreePath, 'src');
  assert.ok(fs.lstatSync(srcLink).isSymbolicLink(), 'src/ is a symlink');
  const resolved = fs.realpathSync(srcLink);
  assert.equal(resolved, path.join(ref.paths.root, 'src'));
  // The agent sees the shared source file through the link.
  assert.equal(
    fs.readFileSync(path.join(claude.worktreePath, 'src', 'website', 'app.tsx'), 'utf8'),
    'export const App = () => null;'
  );

  const codex = await worktrees.spawn(ref.paths.root, 'codex');
  const list = await worktrees.list(ref.paths.root);
  const ids = list.map((w) => w.agentId).sort();
  assert.deepEqual(ids, ['claude', 'codex']);
  assert.ok(list.some((w) => w.worktreePath === codex.worktreePath));

  // Removal cleans up.
  await worktrees.remove(ref.paths.root, 'claude');
  assert.ok(!fs.existsSync(claude.worktreePath));
  const after = await worktrees.list(ref.paths.root);
  assert.deepEqual(after.map((w) => w.agentId), ['codex']);
});

test('spawn on a non-git folder throws a helpful error', async () => {
  const plain = fs.mkdtempSync(path.join(os.tmpdir(), 'empire-nogit-'));
  await assert.rejects(
    () => new WorktreeManager().spawn(plain, 'claude'),
    /not a git repository/
  );
});
