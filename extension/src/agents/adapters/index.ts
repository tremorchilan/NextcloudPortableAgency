import { BaseAgentAdapter, type AgentAdapter } from '../AgentAdapter';

export class ClaudeCodeAdapter extends BaseAgentAdapter {
  id = 'claude';
  displayName = 'Claude Code';
  commands = ['claude'];
  contextFileName = 'CLAUDE.md';

  protected args(): string[] {
    return [];
  }
}

export class CodexAdapter extends BaseAgentAdapter {
  id = 'codex';
  displayName = 'Codex';
  commands = ['codex'];
  contextFileName = 'AGENTS.md';

  protected args(): string[] {
    return [];
  }
}

export class OpenCodeAdapter extends BaseAgentAdapter {
  id = 'opencode';
  displayName = 'OpenCode';
  commands = ['opencode'];
  contextFileName = 'AGENTS.md';

  protected args(): string[] {
    return [];
  }
}

export class AiderAdapter extends BaseAgentAdapter {
  id = 'aider';
  displayName = 'Aider';
  commands = ['aider'];
  contextFileName = 'CONVENTIONS.md';

  protected args(): string[] {
    return [];
  }
}

export function allAdapters(): AgentAdapter[] {
  return [new ClaudeCodeAdapter(), new CodexAdapter(), new OpenCodeAdapter(), new AiderAdapter()];
}
