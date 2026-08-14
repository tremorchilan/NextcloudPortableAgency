// Dependency-free ZIP archive writer/reader.
//
// Empire Engine needs portable export/import (P5) without shipping a native
// dependency: we write and read standard ZIP archives using only node:zlib.
//
// Writer: always sets sizes/CRC in the local header (no data descriptors),
// stores with deflate (method 8) — plain and simple to parse.
// Reader: trusts the central directory for sizes, so archives produced by
// other tools (including data-descriptor ones) extract fine. ZIP64 (archives
// > 4 GiB) is not supported and throws a clear error.

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';

// ---------------------------------------------------------------------------
// CRC-32
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ---------------------------------------------------------------------------
// Writer
// ---------------------------------------------------------------------------

interface CentralEntry {
  name: Buffer;
  crc: number;
  compressedSize: number;
  uncompressedSize: number;
  method: number;
  dosTime: number;
  dosDate: number;
  localOffset: number;
}

function dosDateTime(d: Date): { dosTime: number; dosDate: number } {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { dosTime: time, dosDate: date };
}

export interface ZipAddOptions {
  /** Override stored data (else file content is read from disk). */
  data?: Buffer;
  /** Force method 0 (store). */
  store?: boolean;
  mtime?: Date;
}

export class ZipWriter {
  private entries: CentralEntry[] = [];
  private fd: number;
  private offset = 0;

  constructor(private outPath: string) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    this.fd = fs.openSync(outPath, 'w');
  }

  /** Add a file, stored under `nameInZip` (use forward slashes, no leading slash). */
  addFile(filePath: string | Buffer, nameInZip: string, options: ZipAddOptions = {}): void {
    const data = options.data ?? (Buffer.isBuffer(filePath) ? filePath : fs.readFileSync(filePath));
    if (!options.store && data.length > 32) {
      this.writeEntry(nameInZip, data, zlib.deflateRawSync(data, { level: 9 }), 8, options.mtime);
    } else {
      this.writeEntry(nameInZip, data, data, 0, options.mtime);
    }
  }

  /** Add an empty directory entry. */
  addDirectory(nameInZip: string): void {
    const name = Buffer.from(nameInZip.endsWith('/') ? nameInZip : `${nameInZip}/`, 'utf8');
    const crc = 0;
    const { dosTime, dosDate } = dosDateTime(new Date());
    const localOffset = this.offset;
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4); // version needed
    header.writeUInt16LE(0x0800, 6); // UTF-8 names
    header.writeUInt16LE(0, 8); // store
    header.writeUInt16LE(dosTime, 10);
    header.writeUInt16LE(dosDate, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(0, 18);
    header.writeUInt32LE(0, 22);
    header.writeUInt16LE(name.length, 26);
    header.writeUInt16LE(0, 28);
    fs.writeSync(this.fd, header);
    fs.writeSync(this.fd, name);
    this.offset += header.length + name.length;
    this.entries.push({ name, crc, compressedSize: 0, uncompressedSize: 0, method: 0, dosTime, dosDate, localOffset });
  }

  /** Close the archive: writes the central directory and EOCD record. */
  close(): { path: string; size: number; entries: number } {
    const cdStart = this.offset;
    for (const e of this.entries) {
      const cd = Buffer.alloc(46);
      cd.writeUInt32LE(0x02014b50, 0);
      cd.writeUInt16LE(20, 4); // version made by
      cd.writeUInt16LE(20, 6); // version needed
      cd.writeUInt16LE(0x0800, 8); // UTF-8
      cd.writeUInt16LE(e.method, 10);
      cd.writeUInt16LE(e.dosTime, 12);
      cd.writeUInt16LE(e.dosDate, 14);
      cd.writeUInt32LE(e.crc, 16);
      cd.writeUInt32LE(e.compressedSize, 20);
      cd.writeUInt32LE(e.uncompressedSize, 24);
      cd.writeUInt16LE(e.name.length, 28);
      cd.writeUInt16LE(0, 30); // extra
      cd.writeUInt16LE(0, 32); // comment
      cd.writeUInt16LE(0, 34); // disk
      cd.writeUInt16LE(0, 36); // internal attrs
      cd.writeUInt32LE(0, 38); // external attrs
      cd.writeUInt32LE(e.localOffset, 42);
      fs.writeSync(this.fd, cd);
      fs.writeSync(this.fd, e.name);
      this.offset += cd.length + e.name.length;
    }
    const cdSize = this.offset - cdStart;

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(this.entries.length, 8);
    eocd.writeUInt16LE(this.entries.length, 10);
    eocd.writeUInt32LE(cdSize, 12);
    eocd.writeUInt32LE(cdStart, 16);
    eocd.writeUInt16LE(0, 20);
    fs.writeSync(this.fd, eocd);
    this.offset += eocd.length;
    fs.closeSync(this.fd);
    return { path: this.outPath, size: this.offset, entries: this.entries.length };
  }

  private writeEntry(nameInZip: string, data: Buffer, stored: Buffer, method: number, mtime?: Date): void {
    const name = Buffer.from(nameInZip, 'utf8');
    const crc = crc32(data);
    const { dosTime, dosDate } = dosDateTime(mtime ?? new Date());
    const localOffset = this.offset;

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6);
    header.writeUInt16LE(method, 8);
    header.writeUInt16LE(dosTime, 10);
    header.writeUInt16LE(dosDate, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(stored.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(name.length, 26);
    header.writeUInt16LE(0, 28);
    fs.writeSync(this.fd, header);
    fs.writeSync(this.fd, name);
    fs.writeSync(this.fd, stored);
    this.offset += header.length + name.length + stored.length;

    this.entries.push({
      name,
      crc,
      compressedSize: stored.length,
      uncompressedSize: data.length,
      method,
      dosTime,
      dosDate,
      localOffset
    });
  }
}

// ---------------------------------------------------------------------------
// Reader
// ---------------------------------------------------------------------------

export interface ZipEntry {
  name: string;
  isDirectory: boolean;
  uncompressedSize: number;
  compressedSize: number;
  method: number;
}

export class ZipReader {
  private buf: Buffer;

  constructor(zipPath: string) {
    this.buf = fs.readFileSync(zipPath);
  }

  listEntries(): ZipEntry[] {
    const cd = this.readCentralDirectory();
    return cd.entries.map((e) => ({
      name: e.name,
      isDirectory: e.name.endsWith('/'),
      uncompressedSize: e.uncompressedSize,
      compressedSize: e.compressedSize,
      method: e.method
    }));
  }

  /** Extract every entry into `destDir` with zip-slip protection. */
  extractAll(destDir: string, maxBytes: number = 8 * 1024 * 1024 * 1024): string[] {
    const cd = this.readCentralDirectory();
    const extracted: string[] = [];
    fs.mkdirSync(destDir, { recursive: true });
    for (const e of cd.entries) {
      const safeName = this.safeName(e.name);
      const target = path.join(destDir, safeName);
      if (e.name.endsWith('/')) {
        fs.mkdirSync(target, { recursive: true });
        continue;
      }
      if (e.uncompressedSize > maxBytes) {
        throw new Error(`Entry "${e.name}" exceeds ${maxBytes} byte extraction limit.`);
      }
      const data = this.readEntryData(e);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, data);
      extracted.push(target);
    }
    return extracted;
  }

  private safeName(name: string): string {
    const normalized = name.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
    const segments = normalized.split('/');
    if (segments.some((s) => s === '..' || s === '' || /^[a-zA-Z]:$/.test(s))) {
      throw new Error(`Unsafe path inside archive: "${name}"`);
    }
    return normalized;
  }

  private readCentralDirectory(): { entries: InternalEntry[] } {
    const eocdOffset = this.findEocd();
    const count = this.buf.readUInt16LE(eocdOffset + 10);
    const cdSize = this.buf.readUInt32LE(eocdOffset + 12);
    const cdOffset = this.buf.readUInt32LE(eocdOffset + 16);
    if (cdSize === 0xffffffff || cdOffset === 0xffffffff || count === 0xffff) {
      throw new Error('ZIP64 archives are not supported (archive exceeds 4 GiB).');
    }
    if (cdOffset + cdSize > this.buf.length) {
      throw new Error('Corrupt archive: central directory out of bounds.');
    }

    const entries: InternalEntry[] = [];
    let p = cdOffset;
    const end = cdOffset + cdSize;
    while (p + 46 <= end) {
      if (this.buf.readUInt32LE(p) !== 0x02014b50) break;
      const flags = this.buf.readUInt16LE(p + 8);
      const method = this.buf.readUInt16LE(p + 10);
      const crc = this.buf.readUInt32LE(p + 16);
      const compressedSize = this.buf.readUInt32LE(p + 20);
      const uncompressedSize = this.buf.readUInt32LE(p + 24);
      const nameLen = this.buf.readUInt16LE(p + 28);
      const extraLen = this.buf.readUInt16LE(p + 30);
      const commentLen = this.buf.readUInt16LE(p + 32);
      const localOffset = this.buf.readUInt32LE(p + 42);
      const nameBuf = this.buf.subarray(p + 46, p + 46 + nameLen);
      const name = decodeName(nameBuf, flags);
      entries.push({
        name, flags, method, crc, compressedSize, uncompressedSize, localOffset
      });
      p += 46 + nameLen + extraLen + commentLen;
    }
    return { entries };
  }

  private readEntryData(e: InternalEntry): Buffer {
    if (e.localOffset + 30 > this.buf.length) {
      throw new Error(`Corrupt archive: bad offset for "${e.name}".`);
    }
    if (this.buf.readUInt32LE(e.localOffset) !== 0x04034b50) {
      throw new Error(`Corrupt archive: bad local header for "${e.name}".`);
    }
    const nameLen = this.buf.readUInt16LE(e.localOffset + 26);
    const extraLen = this.buf.readUInt16LE(e.localOffset + 28);
    const dataStart = e.localOffset + 30 + nameLen + extraLen;
    const stored = this.buf.subarray(dataStart, dataStart + e.compressedSize);
    let data: Buffer;
    if (e.method === 0) {
      data = stored;
    } else if (e.method === 8) {
      data = zlib.inflateRawSync(stored);
    } else {
      throw new Error(`Unsupported compression method ${e.method} for "${e.name}".`);
    }
    if (data.length !== e.uncompressedSize) {
      throw new Error(`Corrupt archive: size mismatch for "${e.name}".`);
    }
    if (crc32(data) !== e.crc) {
      throw new Error(`Corrupt archive: CRC mismatch for "${e.name}".`);
    }
    return data;
  }

  private findEocd(): number {
    const min = Math.max(0, this.buf.length - 65557);
    for (let i = this.buf.length - 22; i >= min; i--) {
      if (this.buf.readUInt32LE(i) === 0x06054b50) {
        return i;
      }
    }
    throw new Error('Not a ZIP archive (end-of-central-directory record not found).');
  }
}

interface InternalEntry {
  name: string;
  flags: number;
  method: number;
  crc: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
}

function decodeName(nameBuf: Buffer, flags: number): string {
  const utf8 = (flags & 0x0800) !== 0;
  return utf8 ? nameBuf.toString('utf8') : nameBuf.toString('latin1');
}
