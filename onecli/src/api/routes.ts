// Meta-Harness API endpoints (admin-token protected):
//
//   GET    /health
//   GET    /api/vault/keys[?masked=1]
//   PUT    /api/vault/keys/:placeholder        { value, services }
//   DELETE /api/vault/keys/:placeholder
//   POST   /api/vault/rotate                    { placeholder, newValue? }
//   GET    /api/audit[?limit=100&since=ISO]
//   GET    /api/policy
//   POST   /api/policy/reload

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { VaultStore } from '../vault/storage';
import { rotateKey } from '../vault/rotation';
import type { AuditLogger } from '../audit/logger';
import type { Policy } from '../proxy/policy';
import { ONECLI_VERSION } from './models';

export interface ApiDeps {
  vault: VaultStore;
  audit: AuditLogger;
  policy: Policy;
  adminToken: string;
  reloadPolicy: () => Promise<void>;
}

export const API_PREFIX = '/api';

export function isApiPath(pathname: string): boolean {
  return pathname === '/health' || pathname.startsWith(API_PREFIX);
}

export function createApiHandler(deps: ApiDeps) {
  return (req: IncomingMessage, res: ServerResponse): void => {
    const pathname = new URL(req.url ?? '/', 'http://onecli.local').pathname;
    const method = req.method ?? 'GET';

    if (pathname === '/health' && method === 'GET') {
      sendJson(res, 200, { ok: true, version: ONECLI_VERSION });
      return;
    }
    if (!authorized(req, deps.adminToken)) {
      sendJson(res, 401, { error: 'unauthorized — provide ONECLI_ADMIN_TOKEN as a Bearer token.' });
      return;
    }

    handle(deps, method, pathname, req, res).catch((e: Error) => {
      if (!res.headersSent) {
        sendJson(res, 500, { error: e.message });
      } else {
        res.end();
      }
    });
  };
}

async function handle(deps: ApiDeps, method: string, pathname: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
  // /api/vault/keys
  if (pathname === `${API_PREFIX}/vault/keys` && method === 'GET') {
    const url = new URL(req.url ?? '/', 'http://onecli.local');
    const masked = (url.searchParams.get('masked') ?? '1') !== '0';
    sendJson(res, 200, deps.vault.list(masked));
    return;
  }

  // /api/vault/keys/:placeholder
  const keyMatch = pathname.match(new RegExp(`^${API_PREFIX}/vault/keys/([^/]+)$`));
  if (keyMatch) {
    const placeholder = decodeURIComponent(keyMatch[1]);
    if (method === 'PUT') {
      const body = await readJsonBody(req);
      const value = String(body.value ?? '');
      const services = Array.isArray(body.services) ? body.services.map(String) : [];
      if (!value) throw new Error('"value" is required.');
      if (!/^[A-Z][A-Z0-9_]{2,63}$/.test(placeholder)) {
        throw new Error('Placeholder must match /^[A-Z][A-Z0-9_]{2,63}$/.');
      }
      deps.vault.set(placeholder, value, services);
      deps.audit.log({ event: 'register', placeholder, service: services.join(',') || undefined, detail: 'key registered' });
      sendJson(res, 200, { ok: true, placeholder, maskedValue: mask(value) });
      return;
    }
    if (method === 'DELETE') {
      const removed = deps.vault.delete(placeholder);
      deps.audit.log({ event: removed ? 'unregister' : 'unregister_miss', placeholder });
      sendJson(res, 200, { ok: true, removed });
      return;
    }
    throw new Error(`Unsupported method ${method} for /api/vault/keys/:placeholder`);
  }

  // /api/vault/rotate
  if (pathname === `${API_PREFIX}/vault/rotate` && method === 'POST') {
    const body = await readJsonBody(req);
    const placeholder = String(body.placeholder ?? '');
    const result = rotateKey(deps.vault, placeholder, typeof body.newValue === 'string' ? body.newValue : undefined);
    deps.audit.log({ event: 'rotate', placeholder, detail: 'key rotated' });
    sendJson(res, 200, result);
    return;
  }

  // /api/audit
  if (pathname === `${API_PREFIX}/audit` && method === 'GET') {
    const url = new URL(req.url ?? '/', 'http://onecli.local');
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10) || 100, 1000);
    const since = url.searchParams.get('since') ?? undefined;
    sendJson(res, 200, deps.audit.tail(limit, since));
    return;
  }

  // /api/policy/reload
  if (pathname === `${API_PREFIX}/policy/reload` && method === 'POST') {
    await deps.reloadPolicy();
    deps.audit.log({ event: 'policy_reload' });
    sendJson(res, 200, { ok: true, policy: deps.policy.describe() });
    return;
  }

  // /api/policy
  if (pathname === `${API_PREFIX}/policy`) {
    if (method === 'GET') {
      sendJson(res, 200, deps.policy.describe());
      return;
    }
    throw new Error(`Unsupported method ${method} for /api/policy`);
  }

  sendJson(res, 404, { error: `No such endpoint: ${method} ${pathname}` });
}

function authorized(req: IncomingMessage, adminToken: string): boolean {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  return token.length > 0 && timingSafeEqual(token, adminToken);
}

function timingSafeEqual(a: string, b: string): boolean {
  const crypto = require('node:crypto') as typeof import('node:crypto');
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        reject(new Error('Request body too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? (JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>) : {});
      } catch {
        reject(new Error('Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function mask(value: string): string {
  return value.length <= 8 ? '********' : `${value.slice(0, 3)}…${value.slice(-3)}`;
}
