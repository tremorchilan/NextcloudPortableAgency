import * as vscode from 'vscode';
import { getNonce } from '../opendesign/OpenDesignPanel';

export interface DashboardState {
  empire: {
    name: string;
    id: string;
    createdAt: string;
    stackStatus: string;
  } | null;
  services: Array<{ name: string; state: string; status: string; health?: string }>;
  agents: Array<{ id: string; name: string; available: boolean; version: string | null; active: boolean }>;
  contextTail: string;
  dockgeUrl: string;
  onecliUrl: string;
}

export interface DashboardActions {
  refresh(): Promise<DashboardState>;
  spawnAgent(agentId: string): Promise<void>;
  openDockge(): Promise<void>;
  startStack(): Promise<void>;
  stopStack(): Promise<void>;
  exportEmpire(): Promise<void>;
  registerSecret(): Promise<void>;
  openDesign(): Promise<void>;
}

/**
 * Empire Dashboard webview panel: overview of services, agents, and the
 * current context, with one-click actions for the common flows.
 */
export class DashboardPanel {
  public static readonly viewType = 'empire.dashboard';
  private static current: DashboardPanel | null = null;

  static render(extensionUri: vscode.Uri, actions: DashboardActions): void {
    if (DashboardPanel.current) {
      DashboardPanel.current.panel.reveal(vscode.ViewColumn.One);
      return;
    }
    DashboardPanel.current = new DashboardPanel(extensionUri, actions);
  }

  private panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(extensionUri: vscode.Uri, private actions: DashboardActions) {
    this.panel = vscode.window.createWebviewPanel(
      DashboardPanel.viewType,
      'Empire Dashboard',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'out', 'webview')] }
    );
    this.panel.webview.html = this.html(extensionUri);
    this.panel.webview.onDidReceiveMessage((message: Record<string, string>) => {
      void this.handleMessage(message);
    });
    this.panel.onDidDispose(() => {
      DashboardPanel.current = null;
      this.disposables.forEach((d) => d.dispose());
    });
  }

  private async handleMessage(message: Record<string, string>): Promise<void> {
    try {
      switch (message.cmd) {
        case 'getState':
          await this.pushState();
          break;
        case 'spawnAgent':
          await this.actions.spawnAgent(message.agentId ?? '');
          break;
        case 'openDockge':
          await this.actions.openDockge();
          break;
        case 'startStack':
          await this.actions.startStack();
          break;
        case 'stopStack':
          await this.actions.stopStack();
          break;
        case 'export':
          await this.actions.exportEmpire();
          break;
        case 'registerSecret':
          await this.actions.registerSecret();
          break;
        case 'openDesign':
          await this.actions.openDesign();
          break;
        default:
          // createEmpire / openEmpire / importEmpire and any future commands are
          // forwarded to the extension command table.
          await vscode.commands.executeCommand(`empire.${message.cmd}`);
          break;
      }
      if (message.cmd !== 'getState') await this.pushState();
    } catch (e) {
      void this.panel.webview.postMessage({ type: 'error', message: (e as Error).message });
    }
  }

  async pushState(): Promise<void> {
    const state = await this.actions.refresh();
    void this.panel.webview.postMessage({ type: 'state', state });
  }

  private html(extensionUri: vscode.Uri): string {
    const scriptUri = this.panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'dashboard.js'));
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this.panel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Empire Dashboard</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
