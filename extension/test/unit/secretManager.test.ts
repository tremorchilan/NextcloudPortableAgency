import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { SecretManager } from '../../src/onecli/SecretManager';
import { FakeHost } from './helpers';

test('master key and admin token live in SecretStorage, never on disk', async () => {
  const host = new FakeHost();
  const manager = new SecretManager(host);

  const master = await manager.ensureMasterKey();
  assert.match(master, /^[0-9a-f]{64}$/);
  assert.equal(await manager.getMasterKey(), master);
  assert.equal(host.secrets.get('empire.onecli.masterKey'), master);

  const token = await manager.ensureAdminToken();
  assert.match(token, /^[0-9a-f]{48}$/);
  assert.equal(await manager.getAdminToken(), token);

  // Same values are returned on subsequent calls (no regeneration).
  assert.equal(await manager.ensureMasterKey(), master);
  assert.equal(await manager.ensureAdminToken(), token);
});

test('startEnvironment merges injected secrets with per-Empire .env override', async () => {
  const host = new FakeHost();
  const manager = new SecretManager(host);
  await manager.ensureMasterKey();
  await manager.ensureAdminToken();

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'empire-secret-env-'));
  fs.writeFileSync(path.join(root, '.env'), 'ONECLI_ADMIN_TOKEN=empire-pinned-token\n');

  const env = await manager.startEnvironment({
    root,
    empireDir: path.join(root, '.empire'),
    contextPath: path.join(root, '.empire', 'context.md'),
    statePath: path.join(root, '.empire', 'state.json'),
    manifestPath: path.join(root, '.empire', 'manifest.json')
  });

  assert.equal(env.ONECLI_ADMIN_TOKEN, 'empire-pinned-token');
  assert.match(env.ONECLI_MASTER_KEY, /^[0-9a-f]{64}$/);
});

test('registerKey normalizes placeholders and rejects junk', async () => {
  const host = new FakeHost();
  const manager = new SecretManager(host);
  const client = manager.clientFor(
    {
      root: '/tmp/x',
      empireDir: '/tmp/x/.empire',
      contextPath: '/tmp/x/.empire/context.md',
      statePath: '/tmp/x/.empire/state.json',
      manifestPath: '/tmp/x/.empire/manifest.json'
    },
    58080
  );
  await assert.rejects(() => manager.registerKey(client, 'not valid!', 'v', []), /must look like a key name/);
  await assert.rejects(() => manager.registerKey(client, 'x', 'v', []), /must look like a key name/);
  // Valid-looking calls hit the HTTP client, which fails here (no server) —
  // but the placeholder validation must pass first.
  await assert.rejects(
    () => manager.registerKey(client, 'openai_key', 'v', ['hermes']),
    (e: Error) => e.message.includes('OneCLI request failed') // fetch refused, not a validation error
  );
});
