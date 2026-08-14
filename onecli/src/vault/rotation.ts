// Key rotation: replace a vault value with a fresh random secret (or a
// caller-supplied one) and record the rotation in the audit trail.

import { generateSecretValue } from './encryption';
import type { VaultStore } from './storage';

export interface RotationResult {
  placeholder: string;
  rotated: boolean;
  rotatedAt: string;
}

export function rotateKey(vault: VaultStore, placeholder: string, newValue?: string): RotationResult {
  const existing = vault.get(placeholder);
  if (!existing) {
    throw new Error(`No key registered for placeholder "${placeholder}".`);
  }
  const next = newValue && newValue.length > 0 ? newValue : generateSecretValue();
  const entry = vault.set(placeholder, next, existing.services);
  return {
    placeholder,
    rotated: entry.rotatedAt !== null,
    rotatedAt: entry.rotatedAt ?? entry.updatedAt
  };
}
