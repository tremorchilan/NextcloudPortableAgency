// Core shared types. Everything in src/core, src/agents, src/onecli and
// src/opendesign depends on these abstractions — never on `vscode` directly —
// so the whole orchestration layer is unit-testable outside VS Code.

export interface QuickPickItem {
  label: string;
  description?: string;
  detail?: string;
}

export interface QuickPickOptions {
  placeHolder?: string;
  title?: string;
}

export interface InputBoxOptions {
  prompt?: string;
  value?: string;
  password?: boolean;
  validateInput?: (value: string) => string | undefined;
}

export interface OpenDialogOptions {
  canSelectFiles?: boolean;
  canSelectFolders?: boolean;
  openLabel?: string;
}

export interface TerminalOptions {
  name: string;
  cwd: string;
  env?: Record<string, string>;
  shellPath?: string;
}

export interface Terminal {
  readonly name: string;
  sendText(text: string): void;
  dispose(): void;
}

export interface WorkspaceFolderLike {
  uri: { fsPath: string };
}

/**
 * Minimal façade over the VS Code extension host. The real implementation
 * lives in `src/host.ts`; tests provide a fake.
 */
export interface Host {
  readonly platform: NodeJS.Platform;
  showInformationMessage(message: string, ...items: string[]): Promise<string | undefined>;
  showWarningMessage(message: string, ...items: string[]): Promise<string | undefined>;
  showErrorMessage(message: string): Promise<void>;
  showQuickPick(items: QuickPickItem[], options?: QuickPickOptions): Promise<QuickPickItem | undefined>;
  showInputBox(options?: InputBoxOptions): Promise<string | undefined>;
  showOpenDialog(options: OpenDialogOptions): Promise<string[] | undefined>;
  createTerminal(options: TerminalOptions): Terminal;
  openExternal(url: string): Promise<boolean>;
  getSecret(key: string): Promise<string | undefined>;
  setSecret(key: string, value: string): Promise<void>;
  deleteSecret(key: string): Promise<void>;
  getGlobalState<T>(key: string): T | undefined;
  setGlobalState(key: string, value: unknown): Promise<void>;
  getWorkspaceFolders(): WorkspaceFolderLike[];
  log(channel: string, message: string): void;
  openTextDocument(uri: string): Promise<void>;
  openUntitledDocument(content: string, language: string): Promise<void>;
  getConfiguration<T>(section: string, key: string, defaultValue: T): T;
}

// ---------------------------------------------------------------------------
// Empire on-disk layout
// ---------------------------------------------------------------------------

export interface EmpirePaths {
  /** Absolute path of the Empire folder. */
  root: string;
  /** `${root}/.empire` */
  empireDir: string;
  /** `${empireDir}/context.md` — the shared memory. */
  contextPath: string;
  /** `${empireDir}/state.json` */
  statePath: string;
  /** `${empireDir}/manifest.json` */
  manifestPath: string;
}

export function empirePaths(root: string): EmpirePaths {
  const empireDir = `${root}/.empire`;
  return {
    root,
    empireDir,
    contextPath: `${empireDir}/context.md`,
    statePath: `${empireDir}/state.json`,
    manifestPath: `${empireDir}/manifest.json`
  };
}

export interface EmpireManifest {
  empire: string;
  id: string;
  template: string;
  createdAt: string;
  engineVersion: string;
  services: string[];
}

export interface EmpireRef {
  paths: EmpirePaths;
  manifest: EmpireManifest;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface AgentActivity {
  agent: string;
  lastActiveAt: string;
  sessions: number;
}

export interface ServiceRecord {
  name: string;
  status: string;
}

export interface EmpireState {
  schemaVersion: number;
  lastAgent: string | null;
  agents: AgentActivity[];
  services: ServiceRecord[];
  stackStatus: string;
  updatedAt: string;
}

export const EMPIRE_STATE_SCHEMA_VERSION = 1;

export function defaultEmpireState(): EmpireState {
  return {
    schemaVersion: EMPIRE_STATE_SCHEMA_VERSION,
    lastAgent: null,
    agents: [],
    services: [],
    stackStatus: 'unknown',
    updatedAt: new Date().toISOString()
  };
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export interface AgentInfo {
  id: string;
  name: string;
  command: string;
  /** Absolute path of the executable, when found. */
  executable: string;
  version: string | null;
  available: boolean;
  adapter: string;
}

export interface SpawnOptions {
  worktreePath: string;
  env: Record<string, string>;
  shellPath?: string;
}
