import { test } from 'node:test';
import * as assert from 'node:assert';
import { bootServer } from './helpers';

const MASTER = '0123456789abcdef0123456789abcdef';
const ADMIN = 'admin-token-for-tests';

async function api(base: string, method: string, path: string, token?: string, body?: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

test('health is open; everything else requires the admin token', async () => {
  const server = await bootServer(MASTER, ADMIN);
  try {
    const health = await api(server.url, 'GET', '/health');
    assert.equal(health.status, 200);
    assert.equal(health.json.ok, true);

    const unauthorized = await api(server.url, 'GET', '/api/vault/keys');
    assert.equal(unauthorized.status, 401);

    const wrongToken = await api(server.url, 'GET', '/api/vault/keys', 'nope');
    assert.equal(wrongToken.status, 401);
  } finally {
    await server.close();
  }
});

test('register → list(masked) → rotate → delete → audit trail', async () => {
  const server = await bootServer(MASTER, ADMIN);
  try {
    const register = await api(server.url, 'PUT', '/api/vault/keys/OPENAI_API_KEY', ADMIN, {
      value: 'sk-very-secret-value-999',
      services: ['hermes']
    });
    assert.equal(register.status, 200);

    const list = await api(server.url, 'GET', '/api/vault/keys?masked=1', ADMIN);
    assert.equal(list.status, 200);
    const keys = list.json as unknown as Array<{ placeholder: string; maskedValue: string }>;
    assert.equal(keys.length, 1);
    assert.equal(keys[0].placeholder, 'OPENAI_API_KEY');
    assert.ok(!keys[0].maskedValue.includes('sk-very-secret-value-999'));
    assert.ok(keys[0].maskedValue.includes('…'));

    const rotate = await api(server.url, 'POST', '/api/vault/rotate', ADMIN, { placeholder: 'OPENAI_API_KEY' });
    assert.equal(rotate.status, 200);
    assert.equal(rotate.json.rotated, true);

    const remove = await api(server.url, 'DELETE', '/api/vault/keys/OPENAI_API_KEY', ADMIN);
    assert.equal(remove.status, 200);
    assert.equal(remove.json.removed, true);

    const audit = await api(server.url, 'GET', '/api/audit?limit=50', ADMIN);
    const events = audit.json as unknown as Array<{ event: string }>;
    assert.deepEqual(
      events.map((e) => e.event),
      ['unregister', 'rotate', 'register']
    );
  } finally {
    await server.close();
  }
});

test('register rejects bad placeholders and missing values', async () => {
  const server = await bootServer(MASTER, ADMIN);
  try {
    const badName = await api(server.url, 'PUT', '/api/vault/keys/not-valid!', ADMIN, { value: 'x', services: [] });
    assert.equal(badName.status, 500);

    const missingValue = await api(server.url, 'PUT', '/api/vault/keys/GOOD_NAME', ADMIN, { value: '', services: [] });
    assert.equal(missingValue.status, 500);
  } finally {
    await server.close();
  }
});

test('policy endpoint returns masked service tokens; unknown endpoints 404', async () => {
  const server = await bootServer(MASTER, ADMIN);
  try {
    const policy = await api(server.url, 'GET', '/api/policy', ADMIN);
    assert.equal(policy.status, 200);
    const body = policy.json as { services: Record<string, { token: string | null }> };
    assert.equal(body.services.guarded.token, '********');
    assert.equal(body.services.hermes.token, null);

    const notFound = await api(server.url, 'GET', '/api/nope', ADMIN);
    assert.equal(notFound.status, 404);
  } finally {
    await server.close();
  }
});
