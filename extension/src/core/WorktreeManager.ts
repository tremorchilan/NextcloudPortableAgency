import * as fs from 'node:fs';
import * as path from 'node:path';
import { GitCli } from '../utils/git';

export interface WorktreeInfo {
  agentId: string;
  worktreePath: string;
  branch: string;
}

/**
 * Spawns per-agent git worktrees inside the Empire (`worktrees/<agent>/`).
 *
 * Shared directories (`src/`, `design/`) are exposed to the agent through
 * relative symlinks so every agent edits the same real files, while the
 * worktree branch gives the agent an isolated commit space for anything else.
 * Worktrees are ephemeral and gitignored.
 */
export class WorktreeManager {
  constructor(private git: GitCli = new GitCli()) {}

  /** Spawn (or reset) the worktree for an agent. Returns its absolute path. */
  async spawn(empirePath: string, agentId: string): Promise<WorktreeInfo> {
    if (!(await this.git.isRepo(empirePath))) {
      throw new Error(
        'Empire is not a git repository. Create the Empire via "Empire: Create New Empire" to enable agent worktrees.'
      );
    }
    const rel = path.join('worktrees', agentId);
    const abs = path.join(empirePath, rel);

    if (fs.existsSync(abs)) {
      await this.git.worktreeRemove(empirePath, rel, true);
      await this.git.worktreePrune(empirePath);
    }
    await this.git.branchDelete(empirePath, `empire/${agentId}`);
    await this.git.worktreeAdd(empirePath, agentId, `empire/${agentId}`, rel);

    this.symlinkShared(abs, empirePath, 'src');
    this.symlinkShared(abs, empirePath, 'design');
    this.symlinkShared(abs, empirePath, 'docs');

    return { agentId, worktreePath: abs, branch: `empire/${agentId}` };
  }

  async list(empirePath: string): Promise<WorktreeInfo[]> {
    const raw = await this.git.worktreeList(empirePath);
    const base = path.resolve(empirePath);
    const out: WorktreeInfo[] = [];
    for (const w of raw) {
      const resolved = path.resolve(w.worktree);
      if (resolved.startsWith(base + path.sep) && resolved.includes(`${path.sep}worktrees${path.sep}`)) {
        out.push({
          agentId: path.basename(resolved),
          worktreePath: resolved,
          branch: w.branch
        });
      }
    }
    return out;
  }

  /** Clean up an agent's worktree. */
  async remove(empirePath: string, agentId: string): Promise<void> {
    const rel = path.join('worktrees', agentId);
    if (fs.existsSync(path.join(empirePath, rel))) {
      await this.git.worktreeRemove(empirePath, rel, true);
    }
    await this.git.worktreePrune(empirePath);
    await this.git.branchDelete(empirePath, `empire/${agentId}`);
  }

  /**
   * Symlink a shared dir from the worktree to the Empire root so every agent
   * edits the same real files. The initial commit ships src/, design/, docs/,
   * so a fresh worktree contains real copies of them — those copies are
   * replaced by the symlink (they are identical snapshots; the shared tree is
   * the source of truth). Uses junction symlinks on Windows (no admin rights
   * required).
   */
  private symlinkShared(worktreePath: string, empirePath: string, dirName: string): void {
    const linkPath = path.join(worktreePath, dirName);
    const target = path.join(empirePath, dirName);
    if (fs.existsSync(linkPath)) {
      const stat = fs.lstatSync(linkPath);
      if (stat.isSymbolicLink()) {
        if (fs.realpathSync(linkPath) === fs.realpathSync(target)) return;
        fs.rmSync(linkPath, { recursive: true, force: true });
      } else if (stat.isDirectory()) {
        // Committed snapshot copy — replace with the shared symlink.
        fs.rmSync(linkPath, { recursive: true, force: true });
      }
    }
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
    const rel = path.relative(worktreePath, target);
    try {
      fs.symlinkSync(rel, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
    } catch (e) {
      throw new Error(
        `Failed to symlink ${dirName} into agent worktree (${(e as Error).message}). ` +
        `Windows may require Developer Mode for symlinks.`
      );
    }
  }
}
