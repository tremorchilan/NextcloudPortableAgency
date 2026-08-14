// OneCLI entry point.
//
// Environment (all optional, sensible dev defaults):
//   ONECLI_MASTER_KEY   vault master key (hex) — inject from host SecretStorage
//   ONECLI_ADMIN_TOKEN  bearer token for the Meta-Harness API
//   ONECLI_HOST/PORT    bind address
//   ONECLI_DATA_DIR     vault + audit location
//   ONECLI_CONFIG       config yaml (defaults: ./config/default.yaml, or
//                       /etc/onecli/policy.yaml when mounted by an Empire)

import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';
import { parseYaml, type YamlValue } from './util/yaml';
import { VaultStore } from './vault/storage';
import { policyFromConfig, Policy } from './proxy/policy';
import { AuditLogger } from './audit/logger';
import { AlertTracker } from './audit/alert';
import { createProxyServer } from './proxy/interceptor';
import { ONECLI_VERSION } from './api/models';

const DEV_MASTER_KEY = 'dev-master-key-do-not-use';
const DEV_ADMIN_TOKEN = 'dev-admin-token-do-not-use';

function env(name: string, fallback: string): string {
  return process.env[name] && process.env[name].trim() ? process.env[name]!.trim() : fallback;
}

function resolveConfigPath(): string {
  const candidates = [
    process.env.ONECLI_CONFIG,
    '/etc/onecli/policy.yaml',
    path.join(__dirname, '..', 'config', 'default.yaml'),
    path.join(process.cwd(), 'config', 'default.yaml')
  ].filter(Boolean) as string[];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`No OneCLI config found. Searched: ${candidates.join(', ')}`);
}

interface ServerSection {
  host: string;
  port: number;
  dataDir: string;
  vaultFile: string;
  auditFile: string;
  maxBodySwapBytes: number;
  requestTimeoutMs: number;
}

function parseConfig(configPath: string): { server: ServerSection; policy: Policy; alerts: AlertTracker; audit: AuditLogger } {
  const raw = parseYaml(fs.readFileSync(configPath, 'utf8')) as Record<string, YamlValue>;
  const serverRaw = (raw.server ?? {}) as Record<string, YamlValue>;
  const dataDir = String(serverRaw.data_dir ?? env('ONECLI_DATA_DIR', './data'));
  const auditFile = String(serverRaw.audit_file ?? 'audit.jsonl');

  const audit = new AuditLogger(dataDir, auditFile);
  const policy = new Policy(policyFromConfig(raw));
  const alerts = new AlertTracker(audit, {
    maxDenialsPerMinute: Number((raw.alert as Record<string, YamlValue>)?.max_denials_per_minute ?? 10),
    maxFailedKeyLookupsPerMinute: Number((raw.alert as Record<string, YamlValue>)?.max_failed_key_lookups_per_minute ?? 20)
  });
  const server: ServerSection = {
    host: String(serverRaw.host ?? env('ONECLI_HOST', '0.0.0.0')),
    port: Number(serverRaw.port ?? env('ONECLI_PORT', '8080')),
    dataDir,
    vaultFile: String(serverRaw.vault_file ?? 'vault.enc'),
    auditFile,
    maxBodySwapBytes: Number(serverRaw.max_body_swap_bytes ?? 1048576),
    requestTimeoutMs: Number(serverRaw.request_timeout_ms ?? 60000)
  };
  return { server, policy, alerts, audit };
}

async function main(): Promise<void> {
  const masterKey = env('ONECLI_MASTER_KEY', DEV_MASTER_KEY);
  const adminToken = env('ONECLI_ADMIN_TOKEN', DEV_ADMIN_TOKEN);
  if (masterKey === DEV_MASTER_KEY || adminToken === DEV_ADMIN_TOKEN) {
    console.warn('[onecli] WARNING: running with the dev master key / admin token. Set ONECLI_MASTER_KEY and ONECLI_ADMIN_TOKEN (Meta-Harness injects them when starting the stack).');
  }

  const configPath = resolveConfigPath();
  const { server, policy, alerts, audit } = parseConfig(configPath);

  const vault = new VaultStore(server.dataDir, server.vaultFile, masterKey);
  vault.load();

  const reloadPolicy = async (): Promise<void> => {
    const raw = parseYaml(fs.readFileSync(configPath, 'utf8')) as Record<string, YamlValue>;
    policy.replace(policyFromConfig(raw));
  };

  const deps = {
    vault,
    audit,
    policy,
    alerts,
    adminToken,
    config: { maxBodySwapBytes: server.maxBodySwapBytes, requestTimeoutMs: server.requestTimeoutMs },
    reloadPolicy
  };

  const serverHandle = createProxyServer(deps);

  await new Promise<void>((resolve, reject) => {
    serverHandle.once('error', reject);
    serverHandle.listen(server.port, server.host, () => {
      console.log(`[onecli] ${ONECLI_VERSION} listening on http://${server.host}:${server.port}`);
      console.log(`[onecli] config: ${configPath}`);
      console.log(`[onecli] vault: ${path.join(server.dataDir, server.vaultFile)} (${Object.keys(vault.rawEntries).length} keys)`);
      resolve();
    });
  });

  const shutdown = (signal: string): void => {
    console.log(`[onecli] ${signal} received — saving vault and shutting down.`);
    try {
      vault.save();
    } catch (e) {
      console.error(`[onecli] vault save failed: ${(e as Error).message}`);
    }
    serverHandle.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

void main().catch((e) => {
  console.error(`[onecli] fatal: ${(e as Error).message}`);
  process.exit(1);
});
