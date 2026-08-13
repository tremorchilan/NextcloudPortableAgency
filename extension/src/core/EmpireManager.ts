import * as fs from 'node:fs';
import * as path from 'node:path';
import { copyDirRecursive, isTextFile, readText, writeTextAtomic, slugify, empireId, randomHex, nowIsoFull } from '../utils/files';
import { GitCli } from '../utils/git';
import { empirePaths, type EmpireManifest, type EmpireRef, type EmpirePaths } from './types';

export interface CreateEmpireOptions {
  name: string;
  parentDir: string;
  /** Extra template root dirs to search (the bundled one is searched first). */
  templateDirs?: string[];
  /** Skip git init (used by import flow, which may do its own). */
  skipGitInit?: boolean;
}

export interface DeleteEmpireResult {
  root: string;
  removed: boolean;
}

const REQUIRED_TEMPLATE_FILES = ['.empire/manifest.json', '.empire/context.md', '.empire/state.json'];

/**
 * Creates, opens, and deletes Empires.
 *
 * `create` scaffolds a new folder from the Empire template, substitutes
 * placeholders ({{EMPIRE_NAME}}, {{EMPIRE_ID}}, …), generates fresh local
 * OneCLI master credentials into `.env`, and initializes git so agent
 * worktrees can be spawned immediately.
 */
export class EmpireManager {
  private git: GitCli;

  constructor(
    private options: {
      engineVersion?: string;
      templateDirs?: string[];
      git?: GitCli;
      logger?: { info(msg: string): void; warn(msg: string): void };
    } = {}
  ) {
    this.git = options.git ?? new GitCli();
  }

  /** Create a new Empire at `parentDir/name`. */
  async create(opts: CreateEmpireOptions): Promise<EmpireRef> {
    const name = opts.name.trim();
    if (!name) throw new Error('Empire name must not be empty.');
    if (!/^[\w .-]+$/.test(name)) {
      throw new Error('Empire name may only contain letters, numbers, spaces, dots, and dashes.');
    }
    const root = path.join(opts.parentDir, name);
    if (fs.existsSync(root)) {
      throw new Error(`Target already exists: ${root}`);
    }

    const templateDir = this.resolveTemplateDir(opts.templateDirs ?? this.options.templateDirs);
    const id = empireId(name);
    const vars: Record<string, string> = {
      '{{EMPIRE_NAME}}': name,
      '{{EMPIRE_ID}}': id,
      '{{EMPIRE_CREATED_AT}}': nowIsoFull(),
      '{{EMPIRE_ENGINE_VERSION}}': this.options.engineVersion ?? '0.1.0',
      '{{EMPIRE_SLUG}}': slugify(name)
    };

    fs.mkdirSync(root, { recursive: true });
    copyDirRecursive(templateDir, root);
    this.substitutePlaceholders(root, vars);
    this.ensureLocalEnv(root);
    this.regenerateLocalSecrets(path.join(root, '.env'));
    fs.mkdirSync(path.join(root, 'logs'), { recursive: true });

    if (!opts.skipGitInit) {
      await this.git.init(root);
      const committed = await this.git.commitAll(root, 'Empire Engine: initial scaffold');
      if (!committed) this.options.logger?.warn('Initial git commit was skipped (nothing to commit?).');
    }

    const ref = this.validate(root);
    this.options.logger?.info(`Empire "${ref.manifest.empire}" created at ${root}`);
    return ref;
  }

  /** Validate a folder and return its manifest. Throws when it is not an Empire. */
  validate(root: string): EmpireRef {
    const paths = empirePaths(root);
    if (!fs.existsSync(paths.manifestPath)) {
      throw new Error(`Not an Empire (missing .empire/manifest.json): ${root}`);
    }
    let manifest: EmpireManifest;
    try {
      manifest = JSON.parse(fs.readFileSync(paths.manifestPath, 'utf8')) as EmpireManifest;
    } catch (e) {
      throw new Error(`Corrupt Empire manifest at ${paths.manifestPath}: ${(e as Error).message}`);
    }
    return { paths, manifest };
  }

  isEmpire(root: string): boolean {
    return fs.existsSync(empirePaths(root).manifestPath);
  }

  /** Find the first workspace folder that is an Empire. */
  detectInWorkspace(workspaceFolders: Array<{ uri: { fsPath: string } }>): EmpireRef | undefined {
    for (const folder of workspaceFolders) {
      if (this.isEmpire(folder.uri.fsPath)) {
        return this.validate(folder.uri.fsPath);
      }
    }
    return undefined;
  }

  deleteEmpire(root: string): DeleteEmpireResult {
    this.validate(root);
    fs.rmSync(root, { recursive: true, force: true });
    return { root, removed: !fs.existsSync(root) };
  }

  /** Search candidate template dirs for the Empire skeleton. */
  private resolveTemplateDir(extraDirs?: string[]): string {
    const candidates = [
      // Bundled with the extension (out/templates/empire)…
      path.join(__dirname, '..', 'templates', 'empire'),
      // …and dev layout (extension/templates -> repo templates/).
      path.join(__dirname, '..', '..', '..', 'templates', 'empire'),
      ...(extraDirs ?? [])
    ];
    for (const dir of candidates) {
      if (dir && REQUIRED_TEMPLATE_FILES.every((f) => fs.existsSync(path.join(dir, f)))) {
        return dir;
      }
    }
    throw new Error(
      `Empire template not found. Searched: ${candidates.filter(Boolean).join(', ')}`
    );
  }

  private substitutePlaceholders(root: string, vars: Record<string, string>): void {
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile() && isTextFile(full)) {
          let content = readText(full);
          for (const [token, value] of Object.entries(vars)) {
            content = content.split(token).join(value);
          }
          writeTextAtomic(full, content);
        }
      }
    };
    walk(root);
  }

  /**
   * The template ships `.env.example` only — the gitignored `.env` is derived
   * from it at scaffold time (it must never be committed or exported).
   */
  private ensureLocalEnv(root: string): void {
    const envPath = path.join(root, '.env');
    if (fs.existsSync(envPath)) return;
    const example = path.join(root, '.env.example');
    if (fs.existsSync(example)) {
      fs.copyFileSync(example, envPath);
    }
  }

  /**
   * `.env` carries GENERATE_ME markers for the OneCLI master key and admin
   * token. Replace them with fresh random values so every Empire gets a
   * unique local credential set. `.env` is gitignored, and the *real* host
   * master key is injected by Meta-Harness at container start (never on disk).
   */
  private regenerateLocalSecrets(envPath: string): void {
    if (!fs.existsSync(envPath)) return;
    let content = readText(envPath);
    content = content
      .split('ONECLI_MASTER_KEY=GENERATE_ME')
      .join(`ONECLI_MASTER_KEY=${randomHex(32)}`)
      .split('ONECLI_ADMIN_TOKEN=GENERATE_ME')
      .join(`ONECLI_ADMIN_TOKEN=${randomHex(24)}`);
    writeTextAtomic(envPath, content);
  }
}

export type { EmpirePaths };
