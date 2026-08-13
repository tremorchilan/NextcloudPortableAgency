import { test } from 'node:test';
import * as assert from 'node:assert';
import * as http from 'node:http';
import * as fs from 'node:fs';
import { bootServer, bootUpstream } from './helpers';

const MASTER = '0123456789abcdef0123456789abcdef';
const ADMIN = 'admin-token-for-tests';

/** Absolute-form request through the proxy (as a configured HTTP proxy client would send). */
function proxyRequest(
  proxyUrl: string,
  upstreamUrl: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {}
): Promise<{ status: number; body: string }> {
  const proxy = new URL(proxyUrl);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: proxy.hostname,
        port: Number(proxy.port),
        method: options.method ?? 'GET',
        path: upstreamUrl,
        headers: { ...options.headers, ...(options.body ? { 'Content-Length': Buffer.byteLength(options.body) } : {}) }
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
      }
    );
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

test('end-to-end: placeholders swapped in headers and body, upstream sees real keys', async () => {
  const server = await bootServer(MASTER, ADMIN);
  const upstream = await bootUpstream();
  try {
    server.vault.set('OPENAI_API_KEY', 'sk-real-123456', ['hermes']);

    const res = await proxyRequest(server.url, `${upstream.url}/v1/chat`, {
      method: 'POST',
      headers: {
        'X-OneCLI-Service': 'hermes',
        Authorization: 'Bearer {{OPENAI_API_KEY}}',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: 'gpt', key: '{{OPENAI_API_KEY}}' })
    });

    assert.equal(res.status, 200, res.body);
    const seen = await upstream.lastRequest;
    assert.equal(seen.headers.authorization, 'Bearer sk-real-123456');
    assert.equal(seen.method, 'POST');
    assert.equal(seen.path, '/v1/chat');
    assert.deepEqual(JSON.parse(seen.body), { model: 'gpt', key: 'sk-real-123456' });

    // Audit trail records the swap.
    const auditRaw = fs.readFileSync(server.auditFile, 'utf8');
    const events = auditRaw.split('\n').filter(Boolean).map((l) => JSON.parse(l));
    assert.ok(events.some((e) => e.event === 'swap' && e.service === 'hermes' && e.status === 200));
  } finally {
    await upstream.close();
    await server.close();
  }
});

test('placeholder not allowed for the service → 403, upstream never hit', async () => {
  const server = await bootServer(MASTER, ADMIN);
  const upstream = await bootUpstream();
  try {
    server.vault.set('MAILGUN_API_KEY', 'mg-real', ['n8n']);
    const res = await proxyRequest(server.url, `${upstream.url}/send`, {
      headers: { 'X-OneCLI-Service': 'hermes', Authorization: 'Bearer {{MAILGUN_API_KEY}}' }
    });
    assert.equal(res.status, 403);
    assert.match(res.body, /not allowed/);

    const auditRaw = fs.readFileSync(server.auditFile, 'utf8');
    assert.ok(auditRaw.includes('"event":"deny"'));
  } finally {
    await upstream.close();
    await server.close();
  }
});

test('missing service header → 403 with guidance', async () => {
  const server = await bootServer(MASTER, ADMIN);
  try {
    const res = await proxyRequest(server.url, 'http://example.com/', {});
    assert.equal(res.status, 403);
    assert.match(res.body, /x-onecli-service/i);
  } finally {
    await server.close();
  }
});

test('header placeholder missing from the vault → 502, never forwarded literally', async () => {
  const server = await bootServer(MASTER, ADMIN);
  const upstream = await bootUpstream();
  try {
    const res = await proxyRequest(server.url, `${upstream.url}/x`, {
      headers: { 'X-OneCLI-Service': 'hermes', Authorization: 'Bearer {{OPENAI_API_KEY}}' }
    });
    assert.equal(res.status, 502);
    assert.match(res.body, /could not resolve/);
    assert.match(res.body, /OPENAI_API_KEY/);

    // Give any (buggy) forwarding a moment, then prove the upstream was never hit.
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(upstream.hits, 0, 'upstream must never receive an unresolved placeholder');

    const auditRaw = fs.readFileSync(server.auditFile, 'utf8');
    assert.ok(auditRaw.includes('"event":"miss"'));
  } finally {
    await upstream.close();
    await server.close();
  }
});

test('origin-form requests are rejected with a hint to use OneCLI as proxy', async () => {
  const server = await bootServer(MASTER, ADMIN);
  try {
    const status = await new Promise<number>((resolve, reject) => {
      const req = http.request(`${server.url}/some/path`, (res) => resolve(res.statusCode ?? 0));
      req.setHeader('X-OneCLI-Service', 'hermes');
      req.on('error', reject);
      req.end();
    });
    assert.equal(status, 400);
  } finally {
    await server.close();
  }
});

test('required token enforced when policy demands one', async () => {
  const server = await bootServer(MASTER, ADMIN);
  const upstream = await bootUpstream();
  try {
    server.vault.set('GUARDED_KEY', 'guarded-value', ['guarded']);
    const denied = await proxyRequest(server.url, `${upstream.url}/x`, {
      headers: { 'X-OneCLI-Service': 'guarded', Authorization: 'Bearer {{GUARDED_KEY}}' }
    });
    assert.equal(denied.status, 403);

    const allowed = await proxyRequest(server.url, `${upstream.url}/x`, {
      headers: { 'X-OneCLI-Service': 'guarded', 'X-OneCLI-Token': 'secret-token', Authorization: 'Bearer {{GUARDED_KEY}}' }
    });
    assert.equal(allowed.status, 200);
    const seen = await upstream.lastRequest;
    assert.equal(seen.headers.authorization, 'Bearer guarded-value');
  } finally {
    await upstream.close();
    await server.close();
  }
});
