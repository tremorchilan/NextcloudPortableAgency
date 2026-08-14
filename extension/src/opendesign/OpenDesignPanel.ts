import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { safeJsonParse, writeJsonAtomic } from '../utils/files';
import { DEFAULT_TOKENS, PALETTE, type DesignNode, type DesignPage, type DesignTokens } from './designModel';

/**
 * OpenDesign side panel (whitepaper §6): a webview canvas that reads and
 * writes `design/` inside the Empire folder. The canvas is React; this class
 * is the VS Code half of the bridge.
 */
export class OpenDesignPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = 'opendesign.panel';
  private view: vscode.WebviewView | null = null;
  private extensionUri: vscode.Uri;
  private onGenerateCode: (() => void) | null = null;

  constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;
  }

  setGenerateCodeHandler(handler: () => void): void {
    this.onGenerateCode = handler;
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'out', 'webview')]
    };
    webviewView.webview.html = this.html(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message: Record<string, unknown>) => {
      void this.handleMessage(webviewView.webview, message).catch((e: Error) => {
        void webviewView.webview.postMessage({ type: 'error', message: e.message });
      });
    });
  }

  /** Push fresh design state into the canvas (e.g. after Empire open). */
  refresh(empireRoot: string | null): void {
    if (!this.view) return;
    const payload = empireRoot ? this.readDesignState(empireRoot) : null;
    void this.view.webview.postMessage({ type: 'init', empireRoot, ...payload });
  }

  private async handleMessage(webview: vscode.Webview, message: Record<string, unknown>): Promise<void> {
    switch (message.type) {
      case 'ready':
        this.view && void this.view.webview.postMessage({ type: 'ack' });
        break;
      case 'saveTokens': {
        const empireRoot = message.empireRoot as string;
        this.validateEmpire(empireRoot);
        writeJsonAtomic(path.join(empireRoot, 'design', 'tokens.json'), message.tokens);
        void webview.postMessage({ type: 'saved', what: 'tokens' });
        break;
      }
      case 'savePage': {
        const empireRoot = message.empireRoot as string;
        const page = message.page as DesignPage;
        this.validateEmpire(empireRoot);
        this.validatePage(page);
        writeJsonAtomic(path.join(empireRoot, 'design', 'pages', `${page.id}.json`), page);
        void webview.postMessage({ type: 'saved', what: `page:${page.id}` });
        break;
      }
      case 'deletePage': {
        const empireRoot = message.empireRoot as string;
        const pageId = String(message.pageId ?? '');
        this.validateEmpire(empireRoot);
        if (!/^[a-z0-9-]+$/i.test(pageId)) {
          void webview.postMessage({ type: 'error', message: 'Invalid page id.' });
          return;
        }
        const file = path.join(empireRoot, 'design', 'pages', `${pageId}.json`);
        if (fs.existsSync(file)) fs.rmSync(file);
        void webview.postMessage({ type: 'saved', what: `page:${pageId}` });
        break;
      }
      case 'generateCode':
        this.onGenerateCode?.();
        void webview.postMessage({ type: 'generated' });
        break;
      case 'log':
        console.log('[opendesign]', message.text);
        break;
      default:
        void webview.postMessage({ type: 'error', message: `Unknown message: ${String(message.type)}` });
    }
  }

  private readDesignState(empireRoot: string): {
    tokens: DesignTokens;
    pages: DesignPage[];
    palette: unknown;
    empireName: string;
  } {
    const tokens = safeJsonParse<DesignTokens>(path.join(empireRoot, 'design', 'tokens.json'), DEFAULT_TOKENS);
    const pages: DesignPage[] = [];
    const pagesDir = path.join(empireRoot, 'design', 'pages');
    if (fs.existsSync(pagesDir)) {
      for (const entry of fs.readdirSync(pagesDir).sort()) {
        if (!entry.endsWith('.json')) continue;
        const parsed = safeJsonParse<Partial<DesignPage>>(path.join(pagesDir, entry), {});
        if (parsed.id && Array.isArray(parsed.nodes)) {
          pages.push({
            id: parsed.id,
            name: parsed.name ?? parsed.id,
            route: parsed.route ?? '/',
            nodes: parsed.nodes as DesignNode[]
          });
        }
      }
    }
    let empireName = 'Empire';
    try {
      const manifest = JSON.parse(fs.readFileSync(path.join(empireRoot, '.empire', 'manifest.json'), 'utf8')) as { empire: string };
      empireName = manifest.empire;
    } catch {
      // non-fatal
    }
    return { tokens, pages, palette: PALETTE, empireName };
  }

  private validateEmpire(empireRoot: string): void {
    if (!empireRoot || !fs.existsSync(path.join(empireRoot, '.empire', 'manifest.json'))) {
      throw new Error('No Empire is open — create or open one first.');
    }
  }

  private validatePage(page: DesignPage): void {
    if (!page || typeof page.id !== 'string' || !/^[a-z0-9-]+$/i.test(page.id)) {
      throw new Error('Invalid page definition (bad id).');
    }
    if (!Array.isArray(page.nodes)) throw new Error('Invalid page definition (nodes must be an array).');
  }

  private html(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'out', 'webview', 'opendesign.js'));
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenDesign</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

export function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
