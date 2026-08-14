import * as fs from 'node:fs';
import * as path from 'node:path';
import { EmpireManager } from './EmpireManager';
import { GitCli } from '../utils/git';
import { ZipWriter, ZipReader } from '../utils/zip';
import { writeTextAtomic } from '../utils/files';
import { empirePaths } from './types';

export interface ExportOptions {
  includeLogs?: boolean;
  includeData?: boolean;
  includeGit?: boolean;
}

export interface ExportResult {
  zipPath: string;
  size: number;
  fileCount: number;
  skipped: string[];
}

export interface ImportResult {
  empirePath: string;
  name: string;
}

const ALWAYS_EXCLUDED = new Set([
  '.env',                    // real keys must never be exported
  'node_modules',
  'worktrees',               // ephemeral agent isolation
  'data/onecli/vault.enc',   // the encrypted OneCLI vault stays with its owner
  'data/onecli/vault.enc.bak',
  'out', 'dist', 'out-test',
  '.DS_Store', 'Thumbs.db'
]);

/**
 * P5 — Export/Import. An Empire is a sovereign folder: zip it, move it,
 * give it to someone else. The vault and real keys never travel with it.
 */
export class ExportManager {
  constructor(private empires: EmpireManager, private git: GitCli = new GitCli()) {}

  async exportEmpire(empirePath: string, zipPath: string, options: ExportOptions = {}): Promise<ExportResult> {
    const ref = this.empires.validate(empirePath);
    const { includeLogs = false, includeData = true, includeGit = false } = options;

    const files = this.collect(empirePath, empirePath, { includeLogs, includeData, includeGit });
    const writer = new ZipWriter(zipPath);
    let count = 0;
    const skipped: string[] = [];

    // Root folder entry so the archive is self-contained.
    writer.addDirectory(path.basename(empirePath));
    const seenDirs = new Set<string>([path.basename(empirePath)]);

    for (const file of files) {
      const rel = path.relative(empirePath, file).split(path.sep).join('/');
      if (this.isExcluded(rel)) {
        skipped.push(rel);
        continue;
      }
      // Ensure parent dir entries exist.
      const parts = rel.split('/');
      for (let i = 1; i < parts.length; i++) {
        const dirEntry = [path.basename(empirePath), ...parts.slice(0, i)].join('/');
        if (!seenDirs.has(dirEntry)) {
          writer.addDirectory(dirEntry);
          seenDirs.add(dirEntry);
        }
      }
      writer.addFile(file, `${path.basename(empirePath)}/${rel}`);
      count++;
    }

    const closed = writer.close();
    return {
      zipPath: closed.path,
      size: closed.size,
      fileCount: count,
      skipped: skipped.sort()
    };
  }

  async importEmpire(zipPath: string, destDir: string): Promise<ImportResult> {
    const reader = new ZipReader(zipPath);
    const entries = reader.listEntries();

    // Find the manifest to determine the Empire folder name and root prefix.
    const manifestEntry = entries.find((e) => e.name.endsWith('.empire/manifest.json') && !e.isDirectory);
    if (!manifestEntry) {
      throw new Error('Not an Empire archive (no .empire/manifest.json inside).');
    }
    const rootPrefix = manifestEntry.name.slice(0, -'.empire/manifest.json'.length).replace(/\/$/, '');

    fs.mkdirSync(destDir, { recursive: true });
    const tmp = fs.mkdtempSync(path.join(destDir, '.empire-import-'));
    try {
      const extracted = reader.extractAll(tmp);
      const extractedRoot = rootPrefix ? path.join(tmp, rootPrefix) : tmp;
      if (!fs.existsSync(path.join(extractedRoot, '.empire', 'manifest.json'))) {
        throw new Error('Archive structure unexpected: Empire manifest not found after extraction.');
      }

      const manifest = JSON.parse(
        fs.readFileSync(path.join(extractedRoot, '.empire', 'manifest.json'), 'utf8')
      ) as { empire: string };

      const safeName = manifest.empire.replace(/[^A-Za-z0-9._ -]/g, '-') || 'empire';
      let target = path.join(destDir, safeName);
      let n = 2;
      while (fs.existsSync(target)) {
        target = path.join(destDir, `${safeName}-${n++}`);
      }
      fs.renameSync(extractedRoot, target);

      // If .git was excluded, re-initialize so worktrees work on the new machine.
      if (!fs.existsSync(path.join(target, '.git'))) {
        await this.git.init(target);
        await this.git.commitAll(target, 'Empire Engine: imported archive (git history excluded)');
      }

      // If .env was stripped (it always is), restore a placeholder copy from .env.example.
      const paths = empirePaths(target);
      const envPath = path.join(target, '.env');
      const envExample = path.join(target, '.env.example');
      if (!fs.existsSync(envPath) && fs.existsSync(envExample)) {
        writeTextAtomic(envPath, fs.readFileSync(envExample, 'utf8'));
      }

      this.empires.validate(target);
      return { empirePath: target, name: manifest.empire };
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  private isExcluded(rel: string): boolean {
    if (rel === '' || rel.startsWith('.git/') || rel === '.git') return true;
    const segments = rel.split('/');
    if (segments.includes('worktrees')) return true;
    if (segments.includes('node_modules')) return true;
    if (rel.startsWith('logs/')) return true; // handled by collect, double-check here
    return ALWAYS_EXCLUDED.has(rel) ||
      segments.some((s) => ALWAYS_EXCLUDED.has(s) && (s === 'node_modules' || s === 'worktrees' || s === 'out' || s === 'dist'));
  }

  private collect(
    root: string,
    dir: string,
    options: { includeLogs: boolean; includeData: boolean; includeGit: boolean }
  ): string[] {
    const out: string[] = [];
    const walk = (d: string): void => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        const rel = path.relative(root, full).split(path.sep).join('/');
        if (entry.isDirectory()) {
          if (rel === '.git') {
            if (options.includeGit) walk(full);
            continue;
          }
          if (rel === 'logs' && !options.includeLogs) continue;
          if (rel === 'data' && !options.includeData) continue;
          if (rel === 'worktrees' || rel === 'node_modules') continue;
          walk(full);
        } else if (entry.isSymbolicLink()) {
          // Symlinked shared dirs inside worktrees are excluded with worktrees/;
          // any other symlinks (rare) are exported as their targets' content.
          const target = fs.realpathSync(full);
          if (fs.statSync(target).isFile()) out.push(full);
        } else if (entry.isFile()) {
          out.push(full);
        }
      }
    };
    walk(root);
    return out;
  }
}
