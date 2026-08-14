import type { AgentInfo, SpawnOptions } from '../core/types';

export interface SpawnPlan {
  /** Terminal title shown in VS Code, e.g. "Empire: Claude Code". */
  name: string;
  cwd: string;
  /** Executable invoked by the terminal shell. */
  command: string;
  args: string[];
  env: Record<string, string>;
  shellPath?: string;
}

/**
 * Abstract agent adapter (whitepaper §11): spawn(), getStatus(), terminate().
 *
 * Adapters know how each system agent CLI is invoked and which file that CLI
 * reads for standing instructions:
 *   - Claude Code reads CLAUDE.md
 *   - Codex and OpenCode read AGENTS.md
 *   - Aider reads CONVENTIONS.md
 */
export interface AgentAdapter {
  id: string;
  displayName: string;
  /** Candidate executable names checked during discovery. */
  commands: string[];
  /** File written into the worktree with the injected Empire context. */
  contextFileName: string;
  buildSpawnPlan(agent: AgentInfo, options: SpawnOptions): SpawnPlan;
}

export abstract class BaseAgentAdapter implements AgentAdapter {
  abstract id: string;
  abstract displayName: string;
  abstract commands: string[];
  abstract contextFileName: string;
  protected abstract args(agent: AgentInfo): string[];

  buildSpawnPlan(agent: AgentInfo, options: SpawnOptions): SpawnPlan {
    return {
      name: `Empire: ${this.displayName}`,
      cwd: options.worktreePath,
      command: agent.executable,
      args: this.args(agent),
      env: options.env,
      shellPath: options.shellPath
    };
  }
}
