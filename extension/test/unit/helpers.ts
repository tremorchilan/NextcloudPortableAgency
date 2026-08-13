import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Host, QuickPickItem, Terminal } from '../../src/core/types';

/** Walk up from a compiled location to find the repo's templates/empire dir. */
export function findTemplateDir(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, 'templates', 'empire');
    if (fs.existsSync(path.join(candidate, '.empire', 'manifest.json'))) return candidate;
    dir = path.dirname(dir);
  }
  throw new Error('Empire template not found (expected templates/empire up the tree).');
}

export interface FakeTerminalState {
  name: string;
  cwd: string;
  env: Record<string, string>;
  sent: string[];
}

export class FakeTerminal implements Terminal {
  readonly name: string;
  sent: string[] = [];
  constructor(public options: { name: string; cwd: string; env?: Record<string, string> }) {
    this.name = options.name;
  }
  sendText(text: string): void {
    this.sent.push(text);
  }
  dispose(): void {
    /* no-op */
  }
}

export class FakeHost implements Host {
  readonly platform = process.platform;
  messages: string[] = [];
  warnings: string[] = [];
  errors: string[] = [];
  terminals: FakeTerminal[] = [];
  secrets = new Map<string, string>();
  globalState = new Map<string, unknown>();
  quickPickAnswers: (QuickPickItem | undefined)[] = [];
  inputAnswers: (string | undefined)[] = [];
  config: Record<string, unknown> = {};

  showInformationMessage(message: string): Promise<string | undefined> {
    this.messages.push(message);
    return Promise.resolve(undefined);
  }
  showWarningMessage(message: string): Promise<string | undefined> {
    this.warnings.push(message);
    return Promise.resolve(undefined);
  }
  showErrorMessage(message: string): Promise<void> {
    this.errors.push(message);
    return Promise.resolve();
  }
  showQuickPick(): Promise<QuickPickItem | undefined> {
    return Promise.resolve(this.quickPickAnswers.shift());
  }
  showInputBox(): Promise<string | undefined> {
    return Promise.resolve(this.inputAnswers.shift());
  }
  showOpenDialog(): Promise<string[] | undefined> {
    return Promise.resolve(undefined);
  }
  createTerminal(options: { name: string; cwd: string; env?: Record<string, string> }): Terminal {
    const terminal = new FakeTerminal(options);
    this.terminals.push(terminal);
    return terminal;
  }
  openExternal(): Promise<boolean> {
    return Promise.resolve(true);
  }
  async getSecret(key: string): Promise<string | undefined> {
    return this.secrets.get(key);
  }
  async setSecret(key: string, value: string): Promise<void> {
    this.secrets.set(key, value);
  }
  async deleteSecret(key: string): Promise<void> {
    this.secrets.delete(key);
  }
  getGlobalState<T>(key: string): T | undefined {
    return this.globalState.get(key) as T | undefined;
  }
  async setGlobalState(key: string, value: unknown): Promise<void> {
    this.globalState.set(key, value);
  }
  getWorkspaceFolders(): Array<{ uri: { fsPath: string } }> {
    return [];
  }
  log(): void {
    /* no-op */
  }
  async openTextDocument(): Promise<void> {
    /* no-op */
  }
  async openUntitledDocument(): Promise<void> {
    /* no-op */
  }
  getConfiguration<T>(_section: string, _key: string, defaultValue: T): T {
    return (_key in this.config ? this.config[_key] : defaultValue) as T;
  }
}
