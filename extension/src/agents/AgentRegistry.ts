import * as fs from 'node:fs';
import * as path from 'node:path';
import { runCommand, type ExecFn } from '../utils/exec';
import { allAdapters } from './adapters';
import type { AgentAdapter } from './AgentAdapter';
import type { AgentInfo } from '../core/types';

export interface RegistryOptions {
  exec?: ExecFn;
  /** PATH-like string used for discovery (tests inject a fake one). */
  pathEnv?: string;
  /** Extra absolute dirs scanned for executables (from VS Code settings). */
  extraDirs?: string[];
}

/**
 * Discovers installed system agents (Claude Code, Codex, OpenCode, Aider) on
 * the host. The Meta-Harness orchestrates them — it never bundles them.
 */
export class AgentRegistry {
  private adapters: AgentAdapter[];

  constructor(private options: RegistryOptions = {}) {
    this.adapters = allAdapters();
  }

  async discover(): Promise<AgentInfo[]> {
    const pathEnv = this.options.pathEnv ?? process.env.PATH ?? '';
    const searchDirs = [
      ...pathEnv.split(path.delimiter).filter(Boolean),
      ...(this.options.extraDirs ?? [])
    ];
    const unique = [...new Set(searchDirs)];
    const found: AgentInfo[] = [];

    for (const adapter of this.adapters) {
      let info: AgentInfo = {
        id: adapter.id,
        name: adapter.displayName,
        command: adapter.commands[0],
        executable: adapter.commands[0],
        version: null,
        available: false,
        adapter: adapter.id
      };
      for (const candidate of adapter.commands) {
        const executable = await this.locate(unique, candidate);
        if (executable) {
          info = {
            ...info,
            command: candidate,
            executable,
            available: true,
            version: await this.detectVersion(executable)
          };
          break;
        }
      }
      found.push(info);
    }
    return found;
  }

  /** Locate a command on PATH or in extra dirs. */
  async locate(searchDirs: string[], command: string): Promise<string | null> {
    if (command.includes(path.sep)) {
      return fs.existsSync(command) ? command : null;
    }
    const candidates =
      process.platform === 'win32'
        ? [`${command}.exe`, `${command}.cmd`, `${command}.bat`, command]
        : [command];
    for (const dir of searchDirs) {
      for (const candidate of candidates) {
        const full = path.join(dir, candidate);
        try {
          fs.accessSync(full, fs.constants.X_OK);
          if (fs.statSync(full).isFile()) return full;
        } catch {
          // keep scanning
        }
      }
    }
    return null;
  }

  private async detectVersion(executable: string): Promise<string | null> {
    const r = await (this.options.exec ?? runCommand)(executable, ['--version'], {});
    if (r.code !== 0) return null;
    const firstLine = (r.stdout + r.stderr).trim().split('\n')[0].trim();
    return firstLine.slice(0, 80) || null;
  }
}
