// AES-256-GCM encryption for the OneCLI vault.
//
// The master key comes from ONECLI_MASTER_KEY (hex), injected by Meta-Harness
// at container start from the host's SecretStorage. We derive the 256-bit
// AES key with SHA-256 and use a fresh random 12-byte nonce per encryption.

import * as crypto from 'node:crypto';

export function deriveKey(masterKey: string): Buffer {
  const hex = masterKey.trim().replace(/^0x/, '');
  const raw = /^[0-9a-fA-F]{8,}$/.test(hex) && hex.length % 2 === 0
    ? Buffer.from(hex, 'hex')
    : Buffer.from(masterKey, 'utf8');
  if (raw.length < 16) {
    throw new Error('ONECLI_MASTER_KEY is too short (minimum 16 bytes / 32 hex chars).');
  }
  return crypto.createHash('sha256').update(raw).digest();
}

/** Encrypt → base64(nonce | ciphertext | tag). */
export function encrypt(key: Buffer, plaintext: Buffer): string {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([nonce, ciphertext, tag]).toString('base64');
}

/** Decrypt a base64(nonce | ciphertext | tag) payload. Throws on wrong key. */
export function decrypt(key: Buffer, payload: string): Buffer {
  let combined: Buffer;
  try {
    combined = Buffer.from(payload, 'base64');
  } catch {
    throw new Error('Vault payload is not valid base64.');
  }
  if (combined.length < 12 + 16) {
    throw new Error('Vault payload is truncated.');
  }
  const nonce = combined.subarray(0, 12);
  const tag = combined.subarray(combined.length - 16);
  const ciphertext = combined.subarray(12, combined.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error(
      'Vault decryption failed — the master key does not match this vault (or the file is corrupt).'
    );
  }
}

/** Random secret generator used by key rotation. */
export function generateSecretValue(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}
