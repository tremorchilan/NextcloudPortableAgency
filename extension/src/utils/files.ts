import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

/** Extensions we treat as text when substituting template placeholders. */
export const TEXT_EXTENSIONS = new Set([
  '', '.md', '.json', '.yml', '.yaml', '.txt', '.js', '.jsx', '.ts', '.tsx',
  '.css', '.scss', '.html', '.htm', '.xml', '.env', '.example', '.sh', '.mjs',
  '.cjs', '.gitignore', '.gitkeep', '.sql', '.toml', '.ini', '.conf', '.csv',
  '.svg', '.log', '.properties', '.editorconfig'
]);

export function isTextFile(filePath: string): boolean {
  return TEXT_EXTENSIONS.has(path.extname(filePath)) ||
    path.basename(filePath).startsWith('.') && !path.basename(filePath).includes('.enc');
}

export function readText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

/** Atomic write: temp file + rename, so readers never see partial content. */
export function writeTextAtomic(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`
  );
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, filePath);
}

export function safeJsonParse<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonAtomic(filePath: string, value: unknown): void {
  writeTextAtomic(filePath, JSON.stringify(value, null, 2) + '\n');
}

export function randomHex(bytes: number): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'empire';
}

/** Empire id: readable slug + short random suffix, e.g. `shop-alpha-a1f2`. */
export function empireId(name: string): string {
  return `${slugify(name)}-${randomHex(2)}`;
}

export function nowIso(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export function nowIsoFull(): string {
  return new Date().toISOString();
}

export function listFilesRecursive(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  };
  walk(root);
  return out;
}

/** Recursively copy a directory, skipping nothing (filters applied by caller). */
export function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {
      fs.symlinkSync(fs.readlinkSync(srcPath), destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/** Delete a directory recursively (only used for Empire deletion, after confirm). */
export function removeDirRecursive(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}
