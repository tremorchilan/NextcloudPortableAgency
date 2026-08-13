import { test } from 'node:test';
import * as assert from 'node:assert';
import { policyFromConfig, Policy } from '../src/proxy/policy';
import { testPolicy } from './helpers';

test('allows only declared placeholders per service', () => {
  const policy = new Policy(testPolicy());
  assert.equal(policy.allows('hermes', 'HERMES_API_KEY'), true);
  assert.equal(policy.allows('hermes', 'MAILGUN_API_KEY'), false);
  assert.equal(policy.allows('n8n', 'MAILGUN_API_KEY'), true);
  assert.equal(policy.allows('unknown-service', 'ANYTHING'), false); // default deny
});

test('token check when policy requires one', () => {
  const policy = new Policy(testPolicy());
  assert.deepEqual(policy.acceptsToken('guarded', 'secret-token'), { ok: true });
  assert.equal(policy.acceptsToken('guarded', 'wrong').ok, false);
  assert.equal(policy.acceptsToken('guarded', undefined).ok, false);
  assert.equal(policy.acceptsToken('hermes', undefined).ok, true); // token: null → header-only
  assert.equal(policy.acceptsToken('nobody', undefined).ok, false);
});

test('describe masks tokens', () => {
  const policy = new Policy(testPolicy());
  const described = policy.describe() as { services: Record<string, { token: string | null }> };
  assert.equal(described.services.guarded.token, '********');
  assert.equal(described.services.hermes.token, null);
});

test('policyFromConfig reads yaml maps and lists', () => {
  const policy = new Policy(policyFromConfig({
    policy: {
      default: 'deny',
      services: {
        a: { allowed_placeholders: ['X', 'Y'], token: null },
        b: { allowed_placeholders: [], token: 't' }
      }
    }
  }));
  assert.equal(policy.allows('a', 'X'), true);
  assert.equal(policy.allows('b', 'X'), false);
  assert.deepEqual(policy.acceptsToken('b', 't'), { ok: true });
});
