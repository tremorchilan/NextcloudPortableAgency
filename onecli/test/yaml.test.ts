import { test } from 'node:test';
import * as assert from 'node:assert';
import { parseYaml } from '../src/util/yaml';

test('parses nested maps, lists, scalars and comments', () => {
  const parsed = parseYaml(`
# top comment
server:
  host: 0.0.0.0
  port: 8080
  max_body_swap_bytes: 1048576

policy:
  default: deny
  services:
    hermes:
      allowed_placeholders: [A, B]
      token: null
    n8n:
      allowed_placeholders: []
alert:
  max_denials_per_minute: 10
`) as Record<string, unknown>;

  const server = parsed.server as Record<string, unknown>;
  assert.equal(server.host, '0.0.0.0');
  assert.equal(server.port, 8080);
  assert.equal(server.max_body_swap_bytes, 1048576);

  const services = (parsed.policy as Record<string, unknown>).services as Record<string, unknown>;
  const hermes = services.hermes as Record<string, unknown>;
  assert.deepEqual(hermes.allowed_placeholders, ['A', 'B']);
  assert.equal(hermes.token, null);
  assert.deepEqual((services.n8n as Record<string, unknown>).allowed_placeholders, []);
});

test('handles quoted strings, booleans, inline lists', () => {
  const parsed = parseYaml(`
name: "shop alpha"
enabled: true
disabled: false
nothing: null
ratio: 1.5
mixed: ["a", 2]
`) as Record<string, unknown>;
  assert.equal(parsed.name, 'shop alpha');
  assert.equal(parsed.enabled, true);
  assert.equal(parsed.disabled, false);
  assert.equal(parsed.nothing, null);
  assert.equal(parsed.ratio, 1.5);
  assert.deepEqual(parsed.mixed, ['a', 2]);
});

test('rejects tabs', () => {
  assert.throws(() => parseYaml('a:\n\tb: 1'), /tabs/);
});

test('rejects malformed lines', () => {
  assert.throws(() => parseYaml('just a sentence without a colon'), /expected "key: value"/);
});
