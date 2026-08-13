import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { EmpireManager } from '../../src/core/EmpireManager';
import { ContextEngine } from '../../src/core/ContextEngine';
import { StateManager } from '../../src/core/StateManager';
import { WorktreeManager } from '../../src/core/WorktreeManager';
import { AgentSpawner } from '../../src/agents/AgentSpawner';
import { AgentRegistry } from '../../src/agents/AgentRegistry';
import { ContextInjector, EMPIRE_CONTEXT_ENV } from '../../src/agents/ContextInjector';
import type { AgentInfo } from '../../src/core/types';
import { FakeHost, findTemplateDir } from './helpers';

const TEMPLATE = findTemplateDir(__dirname);

function claudeAgent(): AgentInfo {
  return {
    id: 'claude',
    name: 'Claude Code',
    command: 'claude',
    executable: '/usr/local/bin/claude',
    version: '1.0.0',
    available: true,
    adapter: 'claude'
  };
}

test('spawn injects context, records state and writes the handoff', async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'empire-spawn-'));
  const manager = new EmpireManager({ templateDirs: [TEMPLATE] });
  const empire = await manager.create({ name: 'spawn-test', parentDir: parent });

  const host = new FakeHost();
  const context = new ContextEngine();
  const state = new StateManager();
  const worktrees = new WorktreeManager();
  const spawner = new AgentSpawner(host, worktrees, context, state);

  // Seed some prior activity so the injector has content to carry over.
  context.appendActivity(empire.paths, 'opencode', 'Built the signup form.');

  const result = await spawner.spawn(empire, claudeAgent());
  assert.equal(result.previousAgent, null); // state.lastAgent was null
  assert.equal(result.worktreePath, path.join(empire.paths.root, 'worktrees', 'claude'));

  // Terminal opened in the worktree with the right env.
  const terminal = host.terminals[0];
  assert.equal(terminal.options.name, 'Empire: Claude Code');
  assert.equal(terminal.options.cwd, result.worktreePath);
  assert.ok(terminal.sent.some((t) => t.includes('claude')), 'terminal starts the agent CLI');
  assert.ok(terminal.sent.some((t) => t.includes('worktrees/claude')), 'terminal cds into the worktree');

  // Injected env carries the context and Empire pointers.
  const env = terminal.options.env ?? {};
  assert.ok(env[EMPIRE_CONTEXT_ENV]?.includes('Built the signup form.'));
  assert.ok(env[EMPIRE_CONTEXT_ENV]?.includes('spawn-test'));
  assert.equal(env.EMPIRE_PATH, empire.paths.root);
  assert.equal(env.EMPIRE_ID, empire.manifest.id);
  assert.equal(env.EMPIRE_AGENT, 'claude');

  // Adapter-specific standing file written into the worktree.
  assert.ok(fs.existsSync(path.join(result.worktreePath, 'CLAUDE.md')));
  const claudeMd = fs.readFileSync(path.join(result.worktreePath, 'CLAUDE.md'), 'utf8');
  assert.ok(claudeMd.includes('What Was Done Last'));

  // State updated.
  const current = state.read(empire.paths);
  assert.equal(current.lastAgent, 'claude');
  assert.equal(current.agents.find((a) => a.agent === 'claude')?.sessions, 1);
});

test('switching agents records a handoff and continues the context', async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'empire-handoff-'));
  const manager = new EmpireManager({ templateDirs: [TEMPLATE] });
  const empire = await manager.create({ name: 'handoff-test', parentDir: parent });

  const host = new FakeHost();
  const context = new ContextEngine();
  const state = new StateManager();
  const spawner = new AgentSpawner(host, new WorktreeManager(), context, state);

  await spawner.spawn(empire, claudeAgent());
  // Claude "worked" and appended to shared memory.
  context.appendActivity(empire.paths, 'claude', 'Created the customer-onboarding workflow (half done).');

  const codexAgent: AgentInfo = { ...claudeAgent(), id: 'codex', name: 'Codex', command: 'codex', executable: '/usr/local/bin/codex', adapter: 'codex' };
  const result = await spawner.spawn(empire, codexAgent);

  assert.equal(result.previousAgent, 'claude');
  const doc = context.read(empire.paths);
  assert.ok(doc.includes('Handoff: claude → codex'), 'handoff recorded in shared memory');
  assert.ok(doc.includes('customer-onboarding workflow (half done).'), 'prior work still visible');

  // The fresh agent's prompt says who it is continuing from.
  const env = host.terminals[1].options.env ?? {};
  assert.ok(env[EMPIRE_CONTEXT_ENV]?.includes('continuing work started by the agent "claude"'));

  // Codex gets AGENTS.md (its standing file), not CLAUDE.md.
  assert.ok(fs.existsSync(path.join(result.worktreePath, 'AGENTS.md')));
});

test('spawn refuses agents that are not installed', async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'empire-missing-'));
  const manager = new EmpireManager({ templateDirs: [TEMPLATE] });
  const empire = await manager.create({ name: 'missing-test', parentDir: parent });

  const host = new FakeHost();
  const spawner = new AgentSpawner(host, new WorktreeManager(), new ContextEngine(), new StateManager());
  await assert.rejects(
    () => spawner.spawn(empire, { ...claudeAgent(), available: false }),
    /was not found on this host/
  );
});

test('ContextInjector emits EMPIRE_CONTEXT with the full context document', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'empire-inject-'));
  fs.mkdirSync(path.join(root, '.empire'), { recursive: true });
  fs.writeFileSync(path.join(root, '.empire', 'context.md'), '# Empire Context: bakery\n\n## What Is Next\n- Ship it\n');
  const empire = {
    paths: {
      root,
      empireDir: path.join(root, '.empire'),
      contextPath: path.join(root, '.empire', 'context.md'),
      statePath: path.join(root, '.empire', 'state.json'),
      manifestPath: path.join(root, '.empire', 'manifest.json')
    },
    manifest: { empire: 'bakery', id: 'bakery-x1', template: 'default', createdAt: 'now', engineVersion: '0.1.0', services: [] }
  };
  const context = new ContextEngine();
  const state = new StateManager();
  state.recordAgentSession(empire.paths, 'claude', new Date().toISOString());

  const injector = new ContextInjector(context, state);
  const { ClaudeCodeAdapter } = require('../../src/agents/adapters');
  const injected = injector.inject(empire, new ClaudeCodeAdapter(), root, ['docker compose available']);

  assert.ok(injected.prompt.includes('Ship it'));
  assert.ok(injected.prompt.includes('continuing work started by the agent "claude"'));
  assert.ok(injected.prompt.includes('PLACEHOLDER_'));
  assert.ok(injected.prompt.includes('docker compose available'));
  assert.equal(injected.env.EMPIRE_PATH, root);
});

test('registry discovers fake agents on a fake PATH', async () => {
  const fakeBin = fs.mkdtempSync(path.join(os.tmpdir(), 'empire-fakebin-'));
  fs.writeFileSync(path.join(fakeBin, 'claude'), '#!/bin/sh\necho "claude 1.2.3"\n');
  fs.chmodSync(path.join(fakeBin, 'claude'), 0o755);
  fs.writeFileSync(path.join(fakeBin, 'codex'), '#!/bin/sh\necho "codex 0.4.0"\n');
  fs.chmodSync(path.join(fakeBin, 'codex'), 0o755);

  const registry = new AgentRegistry({ pathEnv: fakeBin });
  const agents = await registry.discover();
  const claude = agents.find((a) => a.id === 'claude');
  const codex = agents.find((a) => a.id === 'codex');
  const aider = agents.find((a) => a.id === 'aider');

  assert.equal(claude?.available, true);
  assert.match(claude?.version ?? '', /claude 1\.2\.3/);
  assert.equal(codex?.available, true);
  assert.equal(aider?.available, false);
  assert.equal(aider?.executable, 'aider'); // fallback command name for messaging
});
