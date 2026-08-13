import * as fs from 'node:fs';
import * as path from 'node:path';
import { OneCLIClient } from './OneCLIClient';
import { randomHex } from '../utils/files';
import type { EmpirePaths, Host } from '../core/types';

const MASTER_KEY_SECRET = 'empire.onecli.masterKey';
const ADMIN_TOKEN_SECRET = 'empire.onecli.adminToken';

/**
 * Secrets for OneCLI live in the host's SecretStorage (VS Code secrets), never
 * on disk inside the Empire. The master key is injected as an env var when the
 * stack starts; the admin token authenticates Meta-Harness → OneCLI API calls.
 */
export class SecretManager {
  constructor(private host: Host) {}

  /** The per-host OneCLI vault master key (created on first use). */
  async ensureMasterKey(): Promise<string> {
    const existing = await this.host.getSecret(MASTER_KEY_SECRET);
    if (existing) return existing;
    const fresh = randomHex(32);
    await this.host.setSecret(MASTER_KEY_SECRET, fresh);
    return fresh;
  }

  async getMasterKey(): Promise<string | undefined> {
    return this.host.getSecret(MASTER_KEY_SECRET);
  }

  /** Admin token used by Meta-Harness to authenticate against OneCLI. */
  async ensureAdminToken(): Promise<string> {
    const existing = await this.host.getSecret(ADMIN_TOKEN_SECRET);
    if (existing) return existing;
    const fresh = randomHex(24);
    await this.host.setSecret(ADMIN_TOKEN_SECRET, fresh);
    return fresh;
  }

  async getAdminToken(): Promise<string | undefined> {
    return this.host.getSecret(ADMIN_TOKEN_SECRET);
  }

  /** Environment injected when the stack is started (never written to .env). */
  async startEnvironment(paths: EmpirePaths): Promise<Record<string, string>> {
    const env: Record<string, string> = {
      ONECLI_MASTER_KEY: await this.ensureMasterKey(),
      ONECLI_ADMIN_TOKEN: await this.ensureAdminToken()
    };
    // Per-Empire override: .env may pin a specific admin token (dev convenience).
    const envFile = path.join(paths.root, '.env');
    if (fs.existsSync(envFile)) {
      const match = fs.readFileSync(envFile, 'utf8').match(/^ONECLI_ADMIN_TOKEN=(.+)$/m);
      if (match && match[1].trim() && !match[1].includes('GENERATE_ME')) {
        env.ONECLI_ADMIN_TOKEN = match[1].trim();
      }
    }
    return env;
  }

  /** Client bound to the Empire's OneCLI host port. */
  clientFor(paths: EmpirePaths, port: number): OneCLIClient {
    return new OneCLIClient(`http://127.0.0.1:${port}`, () => this.getAdminToken());
  }

  async registerKey(client: OneCLIClient, placeholder: string, value: string, services: string[]): Promise<void> {
    const trimmed = placeholder.trim();
    if (!/^[A-Za-z][A-Za-z0-9_]{2,63}$/.test(trimmed)) {
      throw new Error('Placeholder must look like a key name, e.g. OPENAI_API_KEY (A-Z, 0-9, _).');
    }
    const normalized = trimmed.toUpperCase();
    await client.registerKey(normalized, value, services.map((s) => s.trim()).filter(Boolean));
  }
}
