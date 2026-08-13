import { runCommand, runOrThrow, type ExecFn } from './exec';
import * as fs from 'node:fs';
import * as path from 'node:path';

/** Thin wrapper around the git CLI (worktree + repository operations). */
export class GitCli {
  constructor(private exec: ExecFn = runCommand) {}

  async isAvailable(): Promise<boolean> {
    const r = await this.exec('git', ['--version']);
    return r.code === 0;
  }

  async isRepo(dir: string): Promise<boolean> {
    return fs.existsSync(path.join(dir, '.git'));
  }

  async init(dir: string): Promise<void> {
    await runOrThrow('git', ['init', '-b', 'main'], { cwd: dir });
  }

  async commitAll(dir: string, message: string): Promise<boolean> {
    await this.exec('git', ['add', '-A'], { cwd: dir });
    // Use a local identity fallback when the host has no git user configured,
    // so the initial scaffold commit (and thus worktree spawns) always work.
    const email = await this.exec('git', ['config', 'user.email'], { cwd: dir });
    const name = await this.exec('git', ['config', 'user.name'], { cwd: dir });
    const identityArgs = [
      ...(email.code !== 0 || !email.stdout.trim() ? ['-c', 'user.email=empire-engine@localhost'] : []),
      ...(name.code !== 0 || !name.stdout.trim() ? ['-c', 'user.name=Empire Engine'] : [])
    ];
    const r = await this.exec('git', [...identityArgs, 'commit', '-m', message], { cwd: dir });
    return r.code === 0;
  }

  async worktreeAdd(dir: string, agentId: string, branch: string, worktreeRel: string): Promise<void> {
    const result = await this.exec(
      'git', ['worktree', 'add', '-b', branch, worktreeRel, 'HEAD'], { cwd: dir }
    );
    if (result.code !== 0) {
      throw new Error(`git worktree add failed: ${result.stderr || result.stdout}`);
    }
  }

  async worktreeRemove(dir: string, worktreeRel: string, force = false): Promise<void> {
    const args = ['worktree', 'remove'];
    if (force) args.push('--force');
    args.push(worktreeRel);
    await this.exec('git', args, { cwd: dir });
  }

  async worktreePrune(dir: string): Promise<void> {
    await this.exec('git', ['worktree', 'prune'], { cwd: dir });
  }

  async branchDelete(dir: string, branch: string): Promise<void> {
    await this.exec('git', ['branch', '-D', branch], { cwd: dir });
  }

  async worktreeList(dir: string): Promise<Array<{ worktree: string; branch: string; head: string }>> {
    const r = await this.exec('git', ['worktree', 'list', '--porcelain'], { cwd: dir });
    if (r.code !== 0) return [];
    const out: Array<{ worktree: string; branch: string; head: string }> = [];
    let current: Partial<{ worktree: string; branch: string; head: string }> = {};
    for (const line of r.stdout.split('\n')) {
      if (line.startsWith('worktree ')) {
        current = { worktree: line.slice('worktree '.length) };
      } else if (line.startsWith('branch ')) {
        current.branch = line.slice('branch '.length).replace(/^refs\/heads\//, '');
      } else if (line.startsWith('HEAD ')) {
        current.head = line.slice('HEAD '.length);
      } else if (line === '') {
        if (current.worktree) {
          out.push(current as { worktree: string; branch: string; head: string });
        }
        current = {};
      }
    }
    if (current.worktree) out.push(current as { worktree: string; branch: string; head: string });
    return out;
  }
}
