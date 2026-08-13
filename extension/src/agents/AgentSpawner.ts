import { WorktreeManager } from '../core/WorktreeManager';
import { ContextEngine } from '../core/ContextEngine';
import { StateManager } from '../core/StateManager';
import { ContextInjector } from './ContextInjector';
import { allAdapters } from './adapters';
import type { AgentAdapter } from './AgentAdapter';
import type { AgentInfo, EmpireRef, Host, Terminal } from '../core/types';
import { nowIso } from '../utils/files';

export interface SpawnResult {
  terminal: Terminal;
  agent: AgentInfo;
  adapter: AgentAdapter;
  worktreePath: string;
  injectedEnv: Record<string, string>;
  previousAgent: string | null;
}

/**
 * Spawns a system agent in its worktree with `.empire/context.md` injected
 * into its system prompt (EMPIRE_CONTEXT env var + CLAUDE.md/AGENTS.md).
 * This is the "Switch Agent" heart of the system: whatever agent starts next
 * always sees the freshest shared context.
 */
export class AgentSpawner {
  private adapters: AgentAdapter[];
  private injector: ContextInjector;

  constructor(
    private host: Host,
    private worktrees: WorktreeManager,
    private context: ContextEngine,
    private state: StateManager,
    private options: { logger?: { info(msg: string): void; warn(msg: string): void } } = {}
  ) {
    this.adapters = allAdapters();
    this.injector = new ContextInjector(this.context, this.state);
  }

  adapterFor(agent: AgentInfo): AgentAdapter {
    const adapter = this.adapters.find((a) => a.id === agent.adapter);
    if (!adapter) throw new Error(`No adapter registered for agent type "${agent.adapter}".`);
    return adapter;
  }

  async spawn(empire: EmpireRef, agent: AgentInfo): Promise<SpawnResult> {
    if (!agent.available) {
      throw new Error(
        `${agent.name} was not found on this host. Install its CLI first (${agent.command}), or configure extra search paths in "empire.agents.extraPaths".`
      );
    }
    const adapter = this.adapterFor(agent);

    const worktree = await this.worktrees.spawn(empire.paths.root, agent.id);
    const previousAgent = this.state.read(empire.paths).lastAgent;
    const injected = this.injector.inject(empire, adapter, worktree.worktreePath, [
      `${agent.name} CLI: ${agent.executable}${agent.version ? ` (${agent.version})` : ''}`,
      `Docker Compose: available inside the Empire folder (${empire.paths.root})`,
      `OneCLI secret proxy: http://onecli:8080 (use PLACEHOLDER_* keys only)`
    ]);

    const plan = adapter.buildSpawnPlan(agent, {
      worktreePath: worktree.worktreePath,
      env: injected.env
    });

    const terminal = this.host.createTerminal({
      name: plan.name,
      cwd: plan.cwd,
      env: plan.env,
      shellPath: plan.shellPath
    });

    // Bring the agent into its workspace and start it.
    terminal.sendText(`cd ${JSON.stringify(worktree.worktreePath)}`);
    terminal.sendText(plan.command + (plan.args.length ? ` ${plan.args.join(' ')}` : ''));

    this.state.recordAgentSession(empire.paths, agent.id, nowIso());
    if (previousAgent && previousAgent !== agent.id) {
      this.context.recordHandoff(empire.paths, {
        from: previousAgent,
        to: agent.id,
        at: nowIso()
      });
    } else {
      this.context.appendActivity(empire.paths, 'meta-harness', `Spawned ${agent.name} (session start).`);
    }

    this.options.logger?.info(
      `Spawned ${agent.name} in ${worktree.worktreePath}` +
      (previousAgent && previousAgent !== agent.id ? ` — handoff from ${previousAgent}` : '')
    );

    return {
      terminal,
      agent,
      adapter,
      worktreePath: worktree.worktreePath,
      injectedEnv: injected.env,
      previousAgent
    };
  }
}
