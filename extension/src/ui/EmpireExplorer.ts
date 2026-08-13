import * as vscode from 'vscode';
import type { AgentInfo } from '../core/types';
import type { ContainerStatus } from '../utils/docker';

export interface ExplorerSnapshot {
  empire: { name: string; id: string; root: string; stackStatus: string } | null;
  agents: AgentInfo[];
  services: ContainerStatus[];
  contextPath: string | null;
  composePath: string | null;
}

type NodeKind = 'empire' | 'group' | 'service' | 'agent' | 'file';

interface EmpireNode {
  kind: NodeKind;
  label: string;
  description?: string;
  icon?: string;
  uri?: vscode.Uri;
}

const GROUPS: Array<{ kind: NodeKind; id: string; label: string; icon: string }> = [
  { kind: 'group', id: 'services', label: 'Services', icon: 'server-process' },
  { kind: 'group', id: 'agents', label: 'Agents', icon: 'robot' },
  { kind: 'group', id: 'files', label: 'Files', icon: 'files' }
];

export class EmpireExplorerProvider implements vscode.TreeDataProvider<EmpireNode> {
  private changeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changeEmitter.event;

  constructor(private snapshot: () => ExplorerSnapshot) {}

  refresh(): void {
    this.changeEmitter.fire();
  }

  getTreeItem(element: EmpireNode): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label);
    item.description = element.description;
    if (element.icon) {
      item.iconPath = new vscode.ThemeIcon(element.icon);
    }
    if (element.kind === 'group' || element.kind === 'empire') {
      item.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    }
    if (element.kind === 'file' && element.uri) {
      item.command = { command: 'vscode.open', title: 'Open', arguments: [element.uri] };
      item.collapsibleState = vscode.TreeItemCollapsibleState.None;
    }
    return item;
  }

  getChildren(element?: EmpireNode): EmpireNode[] {
    const snap = this.snapshot();
    if (!element) {
      return snap.empire
        ? [{ kind: 'empire', label: snap.empire.name, description: `${snap.empire.id} · ${snap.empire.stackStatus}`, icon: 'home' }]
        : [];
    }
    if (element.kind === 'empire') {
      return GROUPS.map((g) => ({ kind: g.kind, label: g.label, icon: g.icon }));
    }
    if (element.kind === 'group') {
      if (element.label === 'Services') {
        if (snap.services.length === 0) {
          return [{ kind: 'service', label: 'Stack not running', icon: 'circle-outline' }];
        }
        return snap.services.map((s) => ({
          kind: 'service' as const,
          label: s.service,
          description: s.state === 'running' ? s.status : s.state,
          icon: s.state === 'running' ? 'pass-filled' : 'circle-outline'
        }));
      }
      if (element.label === 'Agents') {
        return snap.agents.map((a) => ({
          kind: 'agent' as const,
          label: a.name,
          description: a.available ? (a.version ?? 'installed') : 'not installed',
          icon: a.available ? 'zap' : 'circle-slash'
        }));
      }
      if (element.label === 'Files') {
        const files: EmpireNode[] = [];
        if (snap.contextPath) {
          files.push({ kind: 'file', label: '.empire/context.md', icon: 'notebook', uri: vscode.Uri.file(snap.contextPath) });
        }
        if (snap.composePath) {
          files.push({ kind: 'file', label: 'docker-compose.yml', icon: 'symbol-file', uri: vscode.Uri.file(snap.composePath) });
        }
        return files;
      }
    }
    return [];
  }
}
