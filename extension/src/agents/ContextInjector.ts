import * as fs from 'node:fs';
import * as path from 'node:path';
import { ContextEngine } from '../core/ContextEngine';
import { StateManager } from '../core/StateManager';
import { writeTextAtomic } from '../utils/files';
import type { AgentAdapter } from './AgentAdapter';
import type { EmpireRef } from '../core/types';

export const EMPIRE_CONTEXT_ENV = 'EMPIRE_CONTEXT';

export interface InjectedContext {
  /** The system prompt handed to the agent via the EMPIRE_CONTEXT env var. */
  prompt: string;
  /** Environment variables set on the spawned terminal. */
  env: Record<string, string>;
}

/**
 * Builds the agent's system prompt (whitepaper §4.2) and writes it into the
 * worktree as `.empire-context.md` plus the adapter-specific standing file
 * (CLAUDE.md / AGENTS.md / CONVENTIONS.md).
 */
export class ContextInjector {
  constructor(
    private context: ContextEngine,
    private state: StateManager
  ) {}

  inject(empire: EmpireRef, adapter: AgentAdapter, worktreePath: string, toolHints: string[] = []): InjectedContext {
    const previous = this.state.read(empire.paths).lastAgent;
    const contextContent = this.context.read(empire.paths);

    const lines: string[] = [];
    lines.push(`You are an Empire Engine agent session inside Empire "${empire.manifest.empire}" (id: ${empire.manifest.id}).`);
    lines.push('');
    if (previous) {
      lines.push(`You are continuing work started by the agent "${previous}". Read "What Was Done Last" and "What Is Next" carefully and continue exactly where they left off. No repeated explanations, no lost progress.`);
    } else {
      lines.push('This is the first agent session for this Empire. Read the context and start with the first item under "What Is Next".');
    }
    lines.push('');
    lines.push(`Your workspace is: ${worktreePath}`);
    lines.push(`The Empire folder is: ${empire.paths.root}`);
    lines.push('');
    lines.push('Shared context (.empire/context.md):');
    lines.push('```markdown');
    lines.push(contextContent.trim());
    lines.push('```');
    lines.push('');
    lines.push('Session rules:');
    lines.push('1. After every significant action, append an entry to ".empire/context.md" under "## What Was Done Last" and keep "## What Is Next" up to date.');
    lines.push('2. Reference service credentials ONLY by placeholder (PLACEHOLDER_*) — never write real keys into files. OneCLI swaps placeholders for real keys at runtime.');
    lines.push('3. Never commit .env, logs/, worktrees/, or real secrets.');
    lines.push('4. You may edit docker-compose.yml directly during sessions. Dockge is for the human setup phase only.');
    lines.push('5. When your session ends, leave a handoff note under "What Was Done Last" so the next agent can pick up seamlessly.');
    if (toolHints.length > 0) {
      lines.push('');
      lines.push('Available tooling on this host:');
      for (const hint of toolHints) lines.push(`- ${hint}`);
    }
    const prompt = lines.join('\n');

    // Private scratchpad in the worktree + the adapter's standing-context file.
    writeTextAtomic(path.join(worktreePath, '.empire-context.md'), prompt);
    writeTextAtomic(path.join(worktreePath, adapter.contextFileName), prompt);

    return {
      prompt,
      env: {
        [EMPIRE_CONTEXT_ENV]: prompt,
        EMPIRE_PATH: empire.paths.root,
        EMPIRE_ID: empire.manifest.id,
        EMPIRE_AGENT: adapter.id
      }
    };
  }
}
