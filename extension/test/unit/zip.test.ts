import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { ZipWriter, ZipReader, crc32 } from '../../src/utils/zip';

function tmpFile(prefix: string): string {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), prefix)), 'archive.zip');
}

test('zip writer/reader round-trips files and directories', () => {
  const zipPath = tmpFile('zip-roundtrip-');
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'zip-extract-'));
  try {
    const writer = new ZipWriter(zipPath);
    writer.addDirectory('empire');
    writer.addDirectory('empire/sub');
    writer.addFile(Buffer.from('hello zip world'), 'empire/hello.txt');
    writer.addFile(Buffer.from(JSON.stringify({ nested: { value: 42 } })), 'empire/sub/data.json');
    writer.close();

    const reader = new ZipReader(zipPath);
    const entries = reader.listEntries();
    assert.deepEqual(
      entries.filter((e) => !e.isDirectory).map((e) => e.name).sort(),
      ['empire/hello.txt', 'empire/sub/data.json']
    );

    const extracted = reader.extractAll(dest);
    assert.ok(extracted.some((f) => f.endsWith('empire/hello.txt')));
    assert.equal(fs.readFileSync(path.join(dest, 'empire/hello.txt'), 'utf8'), 'hello zip world');
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(dest, 'empire/sub/data.json'), 'utf8')),
      { nested: { value: 42 } }
    );
  } finally {
    fs.rmSync(zipPath, { force: true });
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('crc32 matches known value', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
});

test('zip-slip paths are rejected on extraction', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zip-slip-'));
  const zipPath = path.join(dir, 'evil.zip');
  const writer = new ZipWriter(zipPath);
  writer.addFile(Buffer.from('evil'), '../outside.txt');
  writer.close();

  const reader = new ZipReader(zipPath);
  assert.throws(() => reader.extractAll(path.join(dir, 'out')), /Unsafe path/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('rejects non-zip files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notzip-'));
  const file = path.join(dir, 'x.bin');
  fs.writeFileSync(file, 'definitely not a zip archive');
  assert.throws(() => new ZipReader(file).listEntries(), /Not a ZIP archive/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('large text files compress (deflate method is exercised)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zip-deflate-'));
  const zipPath = path.join(dir, 'big.zip');
  const big = 'abcdefghij'.repeat(5000); // 50 KB — above the 32-byte store threshold
  const writer = new ZipWriter(zipPath);
  writer.addFile(Buffer.from(big), 'big.txt');
  const result = writer.close();
  assert.ok(result.size < big.length, 'deflated output should be smaller than input');

  const reader = new ZipReader(zipPath);
  const entries = reader.listEntries();
  assert.equal(entries[0].method, 8);
  const out = path.join(dir, 'out');
  reader.extractAll(out);
  assert.equal(fs.readFileSync(path.join(out, 'big.txt'), 'utf8'), big);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('supports unicode file names', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zip-unicode-'));
  const zipPath = path.join(dir, 'u.zip');
  const writer = new ZipWriter(zipPath);
  writer.addFile(Buffer.from('ünïcødé'), '帝国/笔记.txt');
  writer.close();
  const reader = new ZipReader(zipPath);
  assert.deepEqual(reader.listEntries().map((e) => e.name), ['帝国/笔记.txt']);
  const out = path.join(dir, 'out');
  reader.extractAll(out);
  assert.equal(fs.readFileSync(path.join(out, '帝国', '笔记.txt'), 'utf8'), 'ünïcødé');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('unused crypto import sanity (deterministic ids come from node:crypto)', () => {
  assert.ok(crypto.randomBytes(4).length === 4);
});
