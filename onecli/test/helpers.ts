// Shared test helpers: real VaultStore on a temp dir, in-memory policy,
// and a bootable OneCLI server on an ephemeral port.

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { VaultStore } from '../src/vault/storage';
import { AuditLogger } from '../src/audit/logger';
import { AlertTracker } from '../src/audit/alert';
import { Policy, type PolicyConfig } from '../src/proxy/policy';
import { createProxyServer } from '../src/proxy/interceptor';

export function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function testPolicy(): PolicyConfig {
  return {
    defaultAllow: false,
    services: new Map([
      ['hermes', { allowedPlaceholders: new Set(['HERMES_API_KEY', 'OPENAI_API_KEY']), token: null }],
      ['n8n', { allowedPlaceholders: new Set(['MAILGUN_API_KEY']), token: null }],
      ['guarded', { allowedPlaceholders: new Set(['GUARDED_KEY']), token: 'secret-token' }]
    ])
  };
}

export interface TestServer {
  url: string;
  close: () => Promise<void>;
  vault: VaultStore;
  audit: AuditLogger;
  auditFile: string;
}

export async function bootServer(masterKey: string, adminToken: string): Promise<TestServer> {
  const dir = tempDir('onecli-test-');
  const vault = new VaultStore(dir, 'vault.enc', masterKey);
  vault.load();
  const audit = new AuditLogger(dir, 'audit.jsonl');
  const alerts = new AlertTracker(audit, { maxDenialsPerMinute: 10, maxFailedKeyLookupsPerMinute: 20 });
  const policy = new Policy(testPolicy());
  const deps = {
    vault,
    audit,
    policy,
    alerts,
    adminToken,
    config: { maxBodySwapBytes: 1024 * 1024, requestTimeoutMs: 5000 },
    reloadPolicy: async (): Promise<void> => undefined
  };
  const server = createProxyServer(deps);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No port');
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => {
      server.closeAllConnections?.();
      server.close(() => resolve());
    }),
    vault,
    audit,
    auditFile: path.join(dir, 'audit.jsonl')
  };
}

/** Boot a fake upstream HTTP server; returns {url, lastRequest, hits}. */
export async function bootUpstream(): Promise<{
  url: string;
  lastRequest: Promise<{ method: string; path: string; headers: Record<string, string | string[] | undefined>; body: string }>;
  hits: number;
  close: () => Promise<void>;
}> {
  const http = await import('node:http');
  let resolveReq!: (r: { method: string; path: string; headers: Record<string, string | string[] | undefined>; body: string }) => void;
  let hits = 0;
  const lastRequest = new Promise<{ method: string; path: string; headers: Record<string, string | string[] | undefined>; body: string }>((resolve) => {
    resolveReq = resolve;
  });
  const server = http.createServer((req, res) => {
    hits++;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      resolveReq({
        method: req.method ?? 'GET',
        path: req.url ?? '/',
        headers: req.headers,
        body: Buffer.concat(chunks).toString('utf8')
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  return {
    url: `http://127.0.0.1:${(address as { port: number }).port}`,
    lastRequest,
    get hits() { return hits; },
    close: () => new Promise((resolve) => {
      server.closeAllConnections?.();
      server.close(() => resolve());
    })
  };
}
