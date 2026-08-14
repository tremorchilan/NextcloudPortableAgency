import * as vscode from 'vscode';
import { VscodeHost } from './host';
import { Harness } from './harness';
import { registerCommands } from './ui/commands';

/**
 * Meta-Harness extension entry point.
 *
 * The extension is the cockpit, not the engine: it creates Empires, spawns
 * system agents in worktrees with injected context, exposes Dockge, hosts the
 * OpenDesign panel, and manages OneCLI secrets on the host.
 */
export function activate(context: vscode.ExtensionContext): void {
  const host = new VscodeHost();
  host.attach(context);

  const harness = new Harness(context, host);
  harness.registerViews();
  registerCommands(context, harness);

  host.log('Empire Engine', `Meta-Harness ${context.extension.packageJSON.version ?? '0.1.0'} activated.`);
}

export function deactivate(): void {
  // VS Code disposes registered subscriptions automatically.
}
