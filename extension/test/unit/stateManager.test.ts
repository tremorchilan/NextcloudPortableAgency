import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { StateManager } from '../../src/core/StateManager';
import { empirePaths } from '../../src/core/types';

test('tracks agent sessions, lastAgent, services and stack status', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'empire-state-'));
  const paths = empirePaths(root);
  fs.mkdirSync(paths.empireDir, { recursive: true });

  const manager = new StateManager();
  assert.equal(manager.read(paths).lastAgent, null);

  manager.recordAgentSession(paths, 'claude', '2026-08-12T14:30:00.000Z');
  manager.recordAgentSession(paths, 'codex', '2026-08-12T15:00:00.000Z');
  manager.recordAgentSession(paths, 'codex', '2026-08-12T16:00:00.000Z');

  const state = manager.read(paths);
  assert.equal(state.lastAgent, 'codex');
  assert.equal(state.agents.find((a) => a.agent === 'codex')?.sessions, 2);
  assert.equal(state.agents.find((a) => a.agent === 'claude')?.sessions, 1);

  manager.setServiceStatus(paths, 'n8n', 'running');
  manager.setStackStatus(paths, 'running');
  const final = manager.read(paths);
  assert.deepEqual(final.services, [{ name: 'n8n', status: 'running' }]);
  assert.equal(final.stackStatus, 'running');

  // Persisted as valid JSON on disk.
  const onDisk = JSON.parse(fs.readFileSync(paths.statePath, 'utf8'));
  assert.equal(onDisk.lastAgent, 'codex');
  assert.equal(onDisk.schemaVersion, 1);
});

test('tolerates missing or corrupt state files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'empire-state-'));
  const paths = empirePaths(root);
  fs.mkdirSync(paths.empireDir, { recursive: true });
  fs.writeFileSync(paths.statePath, 'not-json{{{');

  const manager = new StateManager();
  const state = manager.read(paths);
  assert.equal(state.lastAgent, null);
  assert.deepEqual(state.services, []);
});
