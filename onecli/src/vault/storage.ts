// Encrypted key-value store: the vault file is a single AES-256-GCM blob
// containing JSON. Atomic writes (tmp+rename); safe against torn writes.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { decrypt, deriveKey, encrypt } from './encryption';

export interface VaultEntry {
  value: string;
  services: string[];
  createdAt: string;
  updatedAt: string;
  rotatedAt: string | null;
}

interface VaultFile {
  version: 1;
  entries: Record<string, VaultEntry>;
}

export interface MaskedEntry {
  placeholder: string;
  services: string[];
  createdAt: string;
  updatedAt: string;
  rotatedAt: string | null;
  maskedValue: string;
}

export class VaultStore {
  private key: Buffer;
  private entries: Record<string, VaultEntry> = {};
  private filePath: string;

  constructor(dataDir: string, vaultFile: string, masterKey: string) {
    this.key = deriveKey(masterKey);
    this.filePath = path.join(dataDir, vaultFile);
  }

  load(): void {
    if (!fs.existsSync(this.filePath)) {
      this.entries = {};
      return;
    }
    const payload = fs.readFileSync(this.filePath, 'utf8').trim();
    if (!payload) {
      this.entries = {};
      return;
    }
    const plain = decrypt(this.key, payload);
    const parsed = JSON.parse(plain.toString('utf8')) as VaultFile;
    if (parsed.version !== 1 || typeof parsed.entries !== 'object' || parsed.entries === null) {
      throw new Error('Vault file has an unsupported format version.');
    }
    this.entries = parsed.entries;
  }

  save(): void {
    const file: VaultFile = { version: 1, entries: this.entries };
    const payload = encrypt(this.key, Buffer.from(JSON.stringify(file, null, 2), 'utf8'));
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, payload, 'utf8');
    fs.renameSync(tmp, this.filePath);
  }

  get(placeholder: string): VaultEntry | undefined {
    return this.entries[placeholder];
  }

  set(placeholder: string, value: string, services: string[]): VaultEntry {
    const now = new Date().toISOString();
    const existing = this.entries[placeholder];
    const entry: VaultEntry = {
      value,
      services,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      rotatedAt: existing ? now : null
    };
    this.entries[placeholder] = entry;
    this.save();
    return entry;
  }

  delete(placeholder: string): boolean {
    if (!(placeholder in this.entries)) return false;
    delete this.entries[placeholder];
    this.save();
    return true;
  }

  list(masked: boolean): MaskedEntry[] {
    return Object.entries(this.entries)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([placeholder, entry]) => ({
        placeholder,
        services: entry.services,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        rotatedAt: entry.rotatedAt,
        maskedValue: masked ? mask(entry.value) : entry.value
      }));
  }

  get rawEntries(): Record<string, VaultEntry> {
    return this.entries;
  }
}

function mask(value: string): string {
  if (value.length <= 8) return '********';
  return `${value.slice(0, 3)}…${value.slice(-3)} (${value.length} chars)`;
}
