import * as vscode from 'vscode';
import type {
  Host,
  InputBoxOptions,
  OpenDialogOptions,
  QuickPickItem,
  QuickPickOptions,
  Terminal,
  TerminalOptions,
  WorkspaceFolderLike
} from './core/types';

/**
 * The real VS Code implementation of the Host façade. Everything below the
 * ui/ layer talks to this interface only, so core orchestration logic never
 * imports vscode and stays unit-testable.
 */
export class VscodeHost implements Host {
  readonly platform = process.platform;

  private channels = new Map<string, vscode.OutputChannel>();

  private channel(name: string): vscode.OutputChannel {
    let channel = this.channels.get(name);
    if (!channel) {
      channel = vscode.window.createOutputChannel(name);
      this.channels.set(name, channel);
    }
    return channel;
  }

  showInformationMessage(message: string, ...items: string[]): Promise<string | undefined> {
    return Promise.resolve(vscode.window.showInformationMessage(message, ...items));
  }

  showWarningMessage(message: string, ...items: string[]): Promise<string | undefined> {
    return Promise.resolve(vscode.window.showWarningMessage(message, ...items));
  }

  showErrorMessage(message: string): Promise<void> {
    void vscode.window.showErrorMessage(message);
    return Promise.resolve();
  }

  async showQuickPick(items: QuickPickItem[], options?: QuickPickOptions): Promise<QuickPickItem | undefined> {
    return vscode.window.showQuickPick(items, options as vscode.QuickPickOptions) as Promise<QuickPickItem | undefined>;
  }

  async showInputBox(options?: InputBoxOptions): Promise<string | undefined> {
    return vscode.window.showInputBox({
      ...(options as vscode.InputBoxOptions),
      password: options?.password
    } as vscode.InputBoxOptions);
  }

  async showOpenDialog(options: OpenDialogOptions): Promise<string[] | undefined> {
    const picked = await vscode.window.showOpenDialog(options as vscode.OpenDialogOptions);
    return picked?.map((uri) => uri.fsPath);
  }

  createTerminal(options: TerminalOptions): Terminal {
    const terminal = vscode.window.createTerminal({
      name: options.name,
      cwd: options.cwd,
      env: options.env,
      shellPath: options.shellPath
    });
    return {
      name: terminal.name,
      sendText: (text: string) => terminal.sendText(text),
      dispose: () => terminal.dispose()
    };
  }

  openExternal(url: string): Promise<boolean> {
    return Promise.resolve(vscode.env.openExternal(vscode.Uri.parse(url)));
  }

  async getSecret(key: string): Promise<string | undefined> {
    return this.secrets().get(key);
  }

  async setSecret(key: string, value: string): Promise<void> {
    await this.secrets().store(key, value);
  }

  async deleteSecret(key: string): Promise<void> {
    await this.secrets().delete(key);
  }

  getGlobalState<T>(key: string): T | undefined {
    return this.memento().get<T>(key);
  }

  async setGlobalState(key: string, value: unknown): Promise<void> {
    await this.memento().update(key, value);
  }

  getWorkspaceFolders(): WorkspaceFolderLike[] {
    return (vscode.workspace.workspaceFolders ?? []).map((f) => ({ uri: { fsPath: f.uri.fsPath } }));
  }

  log(channel: string, message: string): void {
    this.channel(channel).appendLine(`[${new Date().toISOString()}] ${message}`);
  }

  async openTextDocument(uri: string): Promise<void> {
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);
  }

  async openUntitledDocument(content: string, language: string): Promise<void> {
    const doc = await vscode.workspace.openTextDocument({ content, language });
    await vscode.window.showTextDocument(doc);
  }

  getConfiguration<T>(section: string, key: string, defaultValue: T): T {
    return vscode.workspace.getConfiguration(section).get<T>(key, defaultValue);
  }

  private secretsStore: vscode.SecretStorage | null = null;
  private secrets(): vscode.SecretStorage {
    if (!this.secretsStore) {
      throw new Error('SecretStorage not initialized — call attach(context) first.');
    }
    return this.secretsStore;
  }

  private mementoStore: vscode.Memento | null = null;
  private memento(): vscode.Memento {
    if (!this.mementoStore) {
      throw new Error('GlobalState not initialized — call attach(context) first.');
    }
    return this.mementoStore;
  }

  attach(context: vscode.ExtensionContext): void {
    this.secretsStore = context.secrets;
    this.mementoStore = context.globalState;
  }
}
