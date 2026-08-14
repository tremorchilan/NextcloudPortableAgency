import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import { tempDir } from './helpers';
import { VaultStore } from '../src/vault/storage';
import { decrypt, deriveKey, encrypt, generateSecretValue } from '../src/vault/encryption';
import { rotateKey } from '../src/vault/rotation';

test('encrypt/decrypt round-trip', () => {
  const key = deriveKey('0123456789abcdef0123456789abcdef');
  const cipher = encrypt(key, Buffer.from('hello empire'));
  const plain = decrypt(key, cipher);
  assert.equal(plain.toString('utf8'), 'hello empire');
});

test('wrong master key fails decryption with a clear error', () => {
  const key = deriveKey('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  const cipher = encrypt(key, Buffer.from('secret'));
  assert.throws(() => decrypt(deriveKey('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'), cipher), /master key does not match|decryption failed/);
});

test('vault store persists, reloads and masks', () => {
  const dir = tempDir('vault-');
  const master = '0123456789abcdef0123456789abcdef';
  const store = new VaultStore(dir, 'vault.enc', master);
  store.load();
  store.set('OPENAI_API_KEY', 'sk-super-secret-value', ['hermes']);
  assert.equal(store.get('OPENAI_API_KEY')?.value, 'sk-super-secret-value');

  // Reload from disk with the same key.
  const store2 = new VaultStore(dir, 'vault.enc', master);
  store2.load();
  assert.equal(store2.get('OPENAI_API_KEY')?.value, 'sk-super-secret-value');
  const masked = store2.list(true)[0];
  assert.ok(masked.maskedValue.includes('…'));
  assert.ok(!masked.maskedValue.includes('super-secret-value'));

  // Wrong key must fail loudly.
  const store3 = new VaultStore(dir, 'vault.enc', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  assert.throws(() => store3.load(), /master key/);

  fs.rmSync(dir, { recursive: true, force: true });
});

test('key rotation replaces values and keeps services', () => {
  const dir = tempDir('vault-');
  const store = new VaultStore(dir, 'vault.enc', '0123456789abcdef0123456789abcdef');
  store.load();
  store.set('MAILGUN_API_KEY', 'old-key', ['n8n']);
  const result = rotateKey(store, 'MAILGUN_API_KEY');
  assert.equal(result.rotated, true);
  assert.ok(store.get('MAILGUN_API_KEY')?.value !== 'old-key');
  assert.deepEqual(store.get('MAILGUN_API_KEY')?.services, ['n8n']);

  const result2 = rotateKey(store, 'MAILGUN_API_KEY', 'chosen-new-value');
  assert.equal(store.get('MAILGUN_API_KEY')?.value, 'chosen-new-value');
  assert.equal(result2.rotated, true);
  assert.throws(() => rotateKey(store, 'MISSING_KEY'), /No key registered/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('generateSecretValue produces distinct values', () => {
  assert.notEqual(generateSecretValue(), generateSecretValue());
  assert.ok(generateSecretValue().length >= 32);
});
