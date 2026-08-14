import * as vscode from 'vscode';
import type { Harness } from '../harness';

/**
 * Command table: binds "Empire: …" command ids to Harness flows.
 * The Harness owns all logic; this file is pure registration.
 */
export function registerCommands(context: vscode.ExtensionContext, harness: Harness): void {
  const register = (command: string, callback: (...args: never[]) => unknown): void => {
    context.subscriptions.push(vscode.commands.registerCommand(command, callback));
  };

  register('empire.createEmpire', () => harness.createEmpire());
  register('empire.openEmpire', () => harness.openEmpire());
  register('empire.detectEmpire', () => harness.detectEmpire());
  register('empire.startStack', () => harness.startStack());
  register('empire.stopStack', () => harness.stopStack());
  register('empire.stackStatus', () => harness.showDashboard());
  register('empire.spawnAgent', () => harness.spawnAgentFlow());
  register('empire.switchAgent', () => harness.switchAgentFlow());
  register('empire.openDockge', () => harness.openDockge());
  register('empire.openDesign', () => harness.openDesign());
  register('empire.generateDesignCode', () => harness.generateDesignCode());
  register('empire.exportEmpire', () => harness.exportEmpire());
  register('empire.importEmpire', () => harness.importEmpire());
  register('empire.registerSecret', () => harness.registerSecret());
  register('empire.viewAuditLog', () => harness.viewAuditLog());
  register('empire.showDashboard', () => harness.showDashboard());
  register('empire.refreshExplorer', () => harness.explorer.refresh());
  register('empire.updateContext', () => harness.updateContext());
  register('empire.compactContext', () => harness.compactContext());
}
