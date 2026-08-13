// The interceptor: an HTTP forward proxy that sits between Empire services
// and the outside world.
//
//   GET http://api.example.com/v1/…  →  swap placeholders → forward
//
// Header values and JSON/text bodies are scanned for placeholders; each
// resolved placeholder must be allowed by the policy for the calling service.
// Header misses are fatal (502 + audit denial) — a secret that is needed but
// missing must never be sent to the upstream as a placeholder. Body misses
// are non-fatal (left untouched) but audited and alerted.

import * as http from 'node:http';
import * as https from 'node:https';
import type { VaultStore } from '../vault/storage';
import type { Policy } from './policy';
import type { AuditLogger } from '../audit/logger';
import type { AlertTracker } from '../audit/alert';
import { swapBody, swapHeaderValue, type SwapReport } from './swapper';
import { createApiHandler, isApiPath, type ApiDeps } from '../api/routes';

export interface ProxyConfig {
  maxBodySwapBytes: number;
  requestTimeoutMs: number;
}

export interface ProxyDeps extends ApiDeps {
  config: ProxyConfig;
  alerts: AlertTracker;
}

const SERVICE_HEADER = 'x-onecli-service';
const TOKEN_HEADER = 'x-onecli-token';

export function createProxyServer(deps: ProxyDeps): http.Server {
  const apiHandler = createApiHandler(deps);

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://onecli.local');

    if (isApiPath(url.pathname)) {
      apiHandler(req, res);
      return;
    }
    void handleProxy(deps, req, res).catch((e) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `OneCLI proxy failure: ${(e as Error).message}` }));
    });
  });

  server.on('clientError', (_err, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });
  return server;
}

async function handleProxy(deps: ProxyDeps, req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const started = Date.now();

  // --- identify the caller ------------------------------------------------
  const service = singleHeader(req.headers[SERVICE_HEADER]);
  if (!service) {
    deps.alerts.recordDenial();
    deps.audit.log({ event: 'deny', detail: `missing ${SERVICE_HEADER} header`, status: 403 });
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `OneCLI requires the ${SERVICE_HEADER} header.` }));
    return;
  }
  const tokenCheck = deps.policy.acceptsToken(service, singleHeader(req.headers[TOKEN_HEADER]));
  if (!tokenCheck.ok) {
    deps.alerts.recordDenial();
    deps.audit.log({ event: 'deny', service, detail: tokenCheck.reason, status: 403 });
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: tokenCheck.reason }));
    return;
  }

  // --- parse the upstream target (absolute-form required) ------------------
  if (!urlIsAbsolute(req.url)) {
    deps.audit.log({ event: 'deny', service, detail: 'origin-form request — configure this client to use OneCLI as its HTTP(S) proxy', status: 400 });
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'OneCLI is a forward proxy: send absolute-form requests (set HTTP_PROXY/HTTPS_PROXY=http://onecli:8080).' }));
    return;
  }
  const target = new URL(req.url!);
  const upstreamHost = target.host;

  // --- resolver bounded by policy -----------------------------------------
  const report: SwapReport = { resolved: [], missed: [] };
  const resolve = (placeholder: string): string | undefined => {
    if (!deps.policy.allows(service, placeholder)) {
      deps.alerts.recordDenial();
      deps.audit.log({ event: 'deny', service, placeholder, upstream: upstreamHost, detail: 'placeholder not allowed for this service' });
      throw new PolicyViolation(`Placeholder ${placeholder} is not allowed for service "${service}".`);
    }
    const entry = deps.vault.get(placeholder);
    if (!entry) {
      deps.alerts.recordMiss();
      deps.audit.log({ event: 'miss', service, placeholder, upstream: upstreamHost });
      return undefined;
    }
    return entry.value;
  };

  // --- swap headers ---------------------------------------------------------
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(req.headers)) {
    const lower = name.toLowerCase();
    if (lower === SERVICE_HEADER || lower === TOKEN_HEADER || lower === 'host' || lower === 'content-length' || lower === 'connection' || lower === 'proxy-authorization' || lower === 'transfer-encoding') {
      continue;
    }
    const text = Array.isArray(value) ? value.join(', ') : (value ?? '');
    try {
      headers[name] = swapHeaderValue(text, resolve, report);
    } catch (e) {
      if (e instanceof PolicyViolation) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
        return;
      }
      throw e;
    }
  }
  headers.Host = target.host;
  if (target.username) {
    headers['Proxy-Authorization'] = `Basic ${Buffer.from(decodeURIComponent(target.username) + ':' + decodeURIComponent(target.password)).toString('base64')}`;
  }

  // --- body ------------------------------------------------------------------
  let body: Buffer | null = null;
  const contentLength = Number(req.headers['content-length'] ?? 0);
  if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') && contentLength > 0 && contentLength <= deps.config.maxBodySwapBytes) {
    body = swapBody(await readBody(req, contentLength), resolve, report);
  }

  // --- forward ---------------------------------------------------------------
  const transport = target.protocol === 'https:' ? https : http;
  const upstreamReq = transport.request(
    {
      host: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      method: req.method,
      path: target.pathname + target.search,
      headers: body ? { ...headers, 'Content-Length': body.length } : headers,
      timeout: deps.config.requestTimeoutMs
    },
    (upstreamRes) => {
      const responseHeaders: Record<string, string> = {};
      for (const [name, value] of Object.entries(upstreamRes.headers)) {
        const lower = name.toLowerCase();
        if (lower === 'transfer-encoding' || lower === 'connection' || lower === 'keep-alive') continue;
        responseHeaders[name] = Array.isArray(value) ? value.join(', ') : (value ?? '');
      }
      res.writeHead(upstreamRes.statusCode ?? 502, responseHeaders);
      upstreamRes.pipe(res);
      upstreamRes.on('end', () => {
        deps.audit.log({
          event: 'swap',
          service,
          upstream: upstreamHost,
          method: req.method,
          status: upstreamRes.statusCode,
          latency_ms: Date.now() - started,
          detail: report.resolved.length ? `resolved: ${report.resolved.join(', ')}` : undefined
        });
      });
    }
  );
  upstreamReq.on('timeout', () => {
    upstreamReq.destroy(new Error(`upstream timeout after ${deps.config.requestTimeoutMs}ms`));
  });
  upstreamReq.on('error', (e) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
    }
    deps.audit.log({ event: 'upstream_error', service, upstream: upstreamHost, detail: e.message, status: 502 });
    res.end(JSON.stringify({ error: `Upstream unreachable: ${e.message}` }));
  });
  if (body) upstreamReq.write(body);
  else req.pipe(upstreamReq);
}

class PolicyViolation extends Error {}

function readBody(req: http.IncomingMessage, contentLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > contentLength) {
        reject(new Error('Body exceeds declared Content-Length.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function singleHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function urlIsAbsolute(url: string | undefined): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
}
