import * as vscode from 'vscode';
import * as path from 'node:path';
import type { Host, EmpireRef, QuickPickItem } from './core/types';
import { EmpireManager } from './core/EmpireManager';
import { ContextEngine } from './core/ContextEngine';
import { StateManager } from './core/StateManager';
import { WorktreeManager } from './core/WorktreeManager';
import { ExportManager } from './core/ExportManager';
import { AgentRegistry } from './agents/AgentRegistry';
import { AgentSpawner } from './agents/AgentSpawner';
import { DockerCli } from './utils/docker';
import { Logger } from './utils/logger';
import { DockgeLauncher } from './dockge/DockgeLauncher';
import { SecretManager } from './onecli/SecretManager';
import { AuditViewer } from './onecli/AuditViewer';
import { CodegenEngine } from './opendesign/CodegenEngine';
import { CodeSync } from './opendesign/CodeSync';
import { OpenDesignPanel } from './opendesign/OpenDesignPanel';
import { DashboardPanel, type DashboardState } from './ui/DashboardPanel';
import { EmpireExplorerProvider, type ExplorerSnapshot } from './ui/EmpireExplorer';

const LAST_EMPIRE_KEY = 'empire.lastEmpirePath';

/**
 * The cockpit. Owns every service and exposes the flows the commands bind to:
 * create/open Empires, start the stack, spawn/switch agents, Dockge, secrets,
 * OpenDesign, and export/import.
 */
export class Harness {
  readonly host: Host;
  readonly log: Logger;
  readonly empires: EmpireManager;
  readonly context: ContextEngine;
  readonly state: StateManager;
  readonly worktrees: WorktreeManager;
  readonly registry: AgentRegistry;
  readonly spawner: AgentSpawner;
  readonly docker: DockerCli;
  readonly dockge: DockgeLauncher;
  readonly secrets: SecretManager;
  readonly codegen: CodegenEngine;
  readonly codeSync: CodeSync;
  readonly explorer: EmpireExplorerProvider;
  readonly opendesign: OpenDesignPanel;

  private currentEmpireRoot: string | null = null;
  private lastAgents: Awaited<ReturnType<AgentRegistry['discover']>> = [];

  constructor(private extContext: vscode.ExtensionContext, host: Host) {
    this.host = host;
    this.log = new Logger(
      {
        info: (m) => host.log('Empire Engine', m),
        warn: (m) => host.log('Empire Engine', `WARN ${m}`),
        error: (m) => host.log('Empire Engine', `ERROR ${m}`)
      },
      'empire'
    );
    this.empires = new EmpireManager({
      engineVersion: extContext.extension.packageJSON.version ?? '0.1.0',
      templateDirs: [
        // dev layout: repo templates/ next to the extension workspace
        path.join(extContext.extensionPath, '..', '..', 'templates', 'empire')
      ],
      logger: this.log
    });
    this.context = new ContextEngine();
    this.state = new StateManager();
    this.worktrees = new WorktreeManager();
    this.docker = new DockerCli();
    this.dockge = new DockgeLauncher(this.docker);
    this.registry = new AgentRegistry({
      extraDirs: host.getConfiguration<string[]>('empire', 'agents.extraPaths', [])
    });
    this.spawner = new AgentSpawner(host, this.worktrees, this.context, this.state, { logger: this.log });
    this.secrets = new SecretManager(host);
    this.codegen = new CodegenEngine();
    this.codeSync = new CodeSync((root) => void this.onDesignChanged(root));
    this.explorer = new EmpireExplorerProvider(() => this.explorerSnapshot());
    this.opendesign = new OpenDesignPanel(extContext.extensionUri);
    this.opendesign.setGenerateCodeHandler(() => void this.generateDesignCode());
  }

  registerViews(): void {
    const tree = vscode.window.createTreeView('empire.explorer', { treeDataProvider: this.explorer, showCollapseAll: false });
    void this.extContext.subscriptions.push(
      tree,
      vscode.window.registerWebviewViewProvider(OpenDesignPanel.viewType, this.opendesign, {
        webviewOptions: { retainContextWhenHidden: true }
      }),
      vscode.workspace.onDidChangeWorkspaceFolders(() => this.explorer.refresh())
    );
    void this.detectEmpire().then(() => {
      this.opendesign.refresh(this.currentEmpireRoot);
      if (this.currentEmpireRoot) this.codeSync.watch(this.currentEmpireRoot);
    });
    // Warm the agent list for the explorer (async, non-blocking).
    void this.discoverAgents().then((agents) => {
      this.lastAgents = agents;
      this.explorer.refresh();
    });
  }

  // -------------------------------------------------------------------------
  // Empire resolution
  // -------------------------------------------------------------------------

  async currentEmpire(): Promise<EmpireRef | null> {
    if (this.currentEmpireRoot && this.empires.isEmpire(this.currentEmpireRoot)) {
      return this.empires.validate(this.currentEmpireRoot);
    }
    const detected = this.empires.detectInWorkspace(this.host.getWorkspaceFolders());
    if (detected) {
      this.setCurrentEmpire(detected.paths.root);
      return detected;
    }
    const lastPath = this.host.getGlobalState<string>(LAST_EMPIRE_KEY);
    if (lastPath && this.empires.isEmpire(lastPath)) {
      const ref = this.empires.validate(lastPath);
      this.setCurrentEmpire(ref.paths.root);
      return ref;
    }
    return null;
  }

  private setCurrentEmpire(root: string): void {
    this.currentEmpireRoot = root;
    void this.host.setGlobalState(LAST_EMPIRE_KEY, root);
    this.codeSync.watch(root);
  }

  async requireEmpire(): Promise<EmpireRef | null> {
    const empire = await this.currentEmpire();
    if (empire) return empire;
    const choice = await this.host.showQuickPick(
      [
        { label: 'Create a new Empire', description: 'Scaffold a sovereign folder from the template' },
        { label: 'Open an existing Empire', description: 'Point at a folder containing .empire/manifest.json' }
      ],
      { placeHolder: 'No Empire is open. What would you like to do?' }
    );
    if (choice?.label.startsWith('Create')) {
      await this.createEmpire();
    } else if (choice?.label.startsWith('Open')) {
      await this.openEmpire();
    }
    return this.currentEmpire();
  }

  // -------------------------------------------------------------------------
  // Setup phase (whitepaper §3.1)
  // -------------------------------------------------------------------------

  async createEmpire(): Promise<void> {
    const name = await this.host.showInputBox({
      prompt: 'Name your Empire (e.g. shop-alpha). The folder becomes the environment.',
      value: '',
      validateInput: (v) =>
        !v.trim() ? 'Name must not be empty.' :
        !/^[\w .-]+$/.test(v) ? 'Only letters, numbers, spaces, dots, and dashes.' : undefined
    });
    if (!name) return;
    const parentDirs = await this.host.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, openLabel: 'Create Empire here' });
    const parentDir = parentDirs?.[0];
    if (!parentDir) return;

    let empire: EmpireRef | null = null;
    try {
      empire = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: `Creating Empire "${name.trim()}"…` },
        async () => this.empires.create({ name: name!.trim(), parentDir })
      );
    } catch (e) {
      await this.host.showErrorMessage((e as Error).message);
      return;
    }

    this.setCurrentEmpire(empire.paths.root);
    this.context.ensureSections(empire.paths, empire.manifest.empire);
    this.opendesign.refresh(empire.paths.root);
    this.explorer.refresh();

    const action = await this.host.showInformationMessage(
      `Empire "${empire.manifest.empire}" is ready at ${empire.paths.root}`,
      'Start Stack', 'Open Dockge', 'Show Dashboard', 'Spawn Agent'
    );
    if (action === 'Start Stack') await this.startStack();
    else if (action === 'Open Dockge') await this.openDockge();
    else if (action === 'Show Dashboard') this.showDashboard();
    else if (action === 'Spawn Agent') await this.spawnAgentFlow();
  }

  async openEmpire(): Promise<void> {
    const picked = await this.host.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, openLabel: 'Open Empire' });
    const folder = picked?.[0];
    if (!folder) return;
    try {
      const empire = this.empires.validate(folder);
      this.setCurrentEmpire(empire.paths.root);
      this.opendesign.refresh(empire.paths.root);
      this.explorer.refresh();
      await this.host.showInformationMessage(`Empire "${empire.manifest.empire}" opened.`);
    } catch (e) {
      await this.host.showErrorMessage((e as Error).message);
    }
  }

  async detectEmpire(): Promise<void> {
    const empire = await this.currentEmpire();
    if (!empire) {
      this.explorer.refresh();
      return;
    }
    this.opendesign.refresh(empire.paths.root);
    this.explorer.refresh();
    await this.host.showInformationMessage(`Empire detected: ${empire.manifest.empire} (${empire.paths.root})`);
  }

  // -------------------------------------------------------------------------
  // Stack lifecycle
  // -------------------------------------------------------------------------

  async startStack(): Promise<void> {
    const empire = await this.requireEmpire();
    if (!empire) return;
    if (!(await this.docker.isAvailable())) {
      await this.host.showErrorMessage('Docker is not available on this host. Install Docker (with the compose plugin) first.');
      return;
    }
    const env = await this.secrets.startEnvironment(empire.paths);
    this.log.info(`Starting stack for ${empire.manifest.id} (docker compose up -d; OneCLI master key injected from SecretStorage)`);
    const result = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Starting Empire stack…' },
      async () => this.docker.composeUp(empire.paths.root, env)
    );
    if (result.code !== 0) {
      const short = (result.stderr || result.stdout).slice(-4000);
      this.log.error(`docker compose up failed:\n${short}`);
      await this.host.showErrorMessage(`Stack failed to start. See "Empire Engine" output channel.\n${short.slice(-800)}`);
      return;
    }
    this.state.setStackStatus(empire.paths, 'running');
    await this.refreshServices(empire);
    this.explorer.refresh();
    await this.host.showInformationMessage(`Stack "${empire.manifest.empire}" is up. Dockge: http://127.0.0.1:${this.dockgePort()}`);
  }

  async stopStack(): Promise<void> {
    const empire = await this.requireEmpire();
    if (!empire) return;
    const result = await this.docker.composeDown(empire.paths.root);
    if (result.code !== 0) {
      await this.host.showErrorMessage(`Stack stop failed: ${(result.stderr || result.stdout).slice(-400)}`);
      return;
    }
    this.state.setStackStatus(empire.paths, 'stopped');
    this.explorer.refresh();
    await this.host.showInformationMessage('Stack stopped.');
  }

  async refreshServices(empire: EmpireRef): Promise<void> {
    const containers = await this.docker.composePs(empire.paths.root);
    for (const c of containers) {
      this.state.setServiceStatus(empire.paths, c.service, c.state);
    }
  }

  // -------------------------------------------------------------------------
  // Session phase (whitepaper §3.2)
  // -------------------------------------------------------------------------

  async spawnAgentFlow(agentId?: string): Promise<void> {
    const empire = await this.requireEmpire();
    if (!empire) return;
    const agents = await this.discoverAgents();
    this.lastAgents = agents;

    let agent = agents.find((a) => a.id === agentId);
    if (!agent) {
      const pick = await this.host.showQuickPick(
        agents.map((a) => ({
          label: a.name,
          description: a.available ? (a.version ?? 'installed') : 'not installed',
          detail: a.id
        })),
        { placeHolder: 'Which agent should take the wheel?', title: 'Spawn Agent' }
      );
      agent = agents.find((a) => a.id === pick?.detail);
    }
    if (!agent) return;
    if (!agent.available) {
      await this.host.showErrorMessage(
        `${agent.name} CLI not found (${agent.command}). Install it, or add its folder to "empire.agents.extraPaths".`
      );
      return;
    }

    try {
      const result = await this.spawner.spawn(empire, agent);
      this.opendesign.refresh(empire.paths.root);
      this.explorer.refresh();
      const suffix = result.previousAgent && result.previousAgent !== agent.id
        ? ` Handoff from "${result.previousAgent}" — context injected.`
        : ' Context injected.';
      await this.host.showInformationMessage(`${agent.name} spawned in ${result.worktreePath}.${suffix}`);
    } catch (e) {
      await this.host.showErrorMessage((e as Error).message);
    }
  }

  async switchAgentFlow(): Promise<void> {
    const empire = await this.currentEmpire();
    const last = empire ? this.state.read(empire.paths).lastAgent : null;
    if (last) {
      this.log.info(`Switching agents: last session was "${last}".`);
    }
    await this.spawnAgentFlow();
  }

  async discoverAgents(): Promise<Awaited<ReturnType<AgentRegistry['discover']>>> {
    return vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: 'Discovering agents…' },
      () => this.registry.discover()
    );
  }

  // -------------------------------------------------------------------------
  // Dockge / OpenDesign / OneCLI
  // -------------------------------------------------------------------------

  dockgePort(): number {
    return this.host.getConfiguration<number>('empire', 'dockge.port', 5001);
  }

  onecliPort(): number {
    return this.host.getConfiguration<number>('empire', 'onecli.port', 58080);
  }

  async openDockge(): Promise<void> {
    const empire = await this.requireEmpire();
    if (!empire) return;
    const status = await this.dockge.status(empire.paths, this.dockgePort());
    if (!status.running && status.stackRunning) {
      const choice = await this.host.showWarningMessage(
        'Dockge container is not running. Start the stack first?', 'Start Stack', 'Open anyway'
      );
      if (choice === 'Start Stack') {
        await this.startStack();
        return;
      }
      if (!choice) return;
    } else if (!status.stackRunning) {
      const choice = await this.host.showWarningMessage(
        'The stack is not running. Start it first?', 'Start Stack', 'Open anyway'
      );
      if (choice === 'Start Stack') {
        await this.startStack();
        return;
      }
      if (!choice) return;
    }
    await this.host.openExternal(status.url);
  }

  async openDesign(): Promise<void> {
    await vscode.commands.executeCommand('opendesign.panel.focus');
  }

  async generateDesignCode(): Promise<void> {
    const empire = await this.requireEmpire();
    if (!empire) return;
    try {
      const result = this.codegen.generate(empire.paths.root);
      this.context.appendActivity(
        empire.paths,
        'meta-harness',
        `OpenDesign: regenerated ${result.files.length} file(s) in src/website/generated/ from design/.`
      );
      this.log.info(`Codegen wrote ${result.files.length} file(s) for ${empire.manifest.id}`);
      if (result.warnings.length) {
        this.log.warn(result.warnings.join('; '));
      }
      await this.host.showInformationMessage(`Generated ${result.files.length} file(s) into src/website/generated/.`);
    } catch (e) {
      await this.host.showErrorMessage(`Design codegen failed: ${(e as Error).message}`);
    }
  }

  private async onDesignChanged(empireRoot: string): Promise<void> {
    if (!this.empires.isEmpire(empireRoot)) return;
    const empire = this.empires.validate(empireRoot);
    this.log.info('design/ changed — regenerating generated code.');
    this.codegen.generate(empireRoot);
    this.context.appendActivity(empire.paths, 'meta-harness', 'OpenDesign: design/ changed; generated code updated.');
    this.explorer.refresh();
  }

  async registerSecret(): Promise<void> {
    const empire = await this.requireEmpire();
    if (!empire) return;
    const placeholder = await this.host.showInputBox({
      prompt: 'Placeholder name (e.g. OPENAI_API_KEY) — services reference only this name.',
      validateInput: (v) => (!/^[A-Z][A-Z0-9_]{2,63}$/.test(v.trim()) ? 'Use uppercase letters, digits, underscores (e.g. OPENAI_API_KEY).' : undefined)
    });
    if (!placeholder) return;
    const value = await this.host.showInputBox({ prompt: `Real value for ${placeholder} (stored in OneCLI vault only)`, password: true });
    if (value === undefined) return;
    const servicesInput = await this.host.showInputBox({
      prompt: 'Which services may use it? (comma-separated: hermes, n8n, …)',
      value: 'hermes'
    });
    if (servicesInput === undefined) return;
    try {
      const client = this.secrets.clientFor(empire.paths, this.onecliPort());
      await this.secrets.registerKey(client, placeholder, value, servicesInput.split(','));
      await this.host.showInformationMessage(`Secret ${placeholder} registered with OneCLI. The real value never touches disk.`);
    } catch (e) {
      await this.host.showErrorMessage((e as Error).message);
    }
  }

  async viewAuditLog(): Promise<void> {
    const empire = await this.requireEmpire();
    if (!empire) return;
    const client = this.secrets.clientFor(empire.paths, this.onecliPort());
    await new AuditViewer(this.host).show(client);
  }

  // -------------------------------------------------------------------------
  // Context maintenance
  // -------------------------------------------------------------------------

  async updateContext(): Promise<void> {
    const empire = await this.requireEmpire();
    if (!empire) return;
    this.context.ensureSections(empire.paths, empire.manifest.empire);
    await this.host.openTextDocument(empire.paths.contextPath);
  }

  async compactContext(): Promise<void> {
    const empire = await this.requireEmpire();
    if (!empire) return;
    const result = this.context.compact(empire.paths);
    await this.host.showInformationMessage(
      `Context compacted: ${result.before} → ${result.after} chars. Older entries summarized.`
    );
  }

  // -------------------------------------------------------------------------
  // Export / Import (P5)
  // -------------------------------------------------------------------------

  async exportEmpire(): Promise<void> {
    const empire = await this.requireEmpire();
    if (!empire) return;
    const defaultUri = vscode.Uri.file(path.join(path.dirname(empire.paths.root), `${empire.manifest.id}.zip`));
    const target = await vscode.window.showSaveDialog({
      defaultUri,
      filters: { 'Empire archive': ['zip'] },
      title: 'Export Empire'
    });
    if (!target) return;
    const options = {
      includeLogs: this.host.getConfiguration<boolean>('empire', 'export.includeLogs', false),
      includeData: this.host.getConfiguration<boolean>('empire', 'export.includeData', true),
      includeGit: this.host.getConfiguration<boolean>('empire', 'export.includeGit', false)
    };
    try {
      const result = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Exporting Empire…' },
        async () => new ExportManager(this.empires).exportEmpire(empire.paths.root, target.fsPath, options)
      );
      const mb = (result.size / 1024 / 1024).toFixed(2);
      await this.host.showInformationMessage(
        `Exported ${result.fileCount} files (${mb} MB) to ${result.zipPath}.` +
        (result.skipped.length ? ` Excluded: ${result.skipped.join(', ')}.` : '')
      );
    } catch (e) {
      await this.host.showErrorMessage(`Export failed: ${(e as Error).message}`);
    }
  }

  async importEmpire(): Promise<void> {
    const zips = await this.host.showOpenDialog({ canSelectFiles: true, canSelectFolders: false, openLabel: 'Import Empire archive' });
    const zipPath = zips?.[0];
    if (!zipPath) return;
    const destDirs = await this.host.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, openLabel: 'Extract into folder' });
    const destDir = destDirs?.[0];
    if (!destDir) return;
    try {
      const result = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Importing Empire…' },
        async () => new ExportManager(this.empires).importEmpire(zipPath, destDir)
      );
      const empire = this.empires.validate(result.empirePath);
      this.setCurrentEmpire(empire.paths.root);
      this.opendesign.refresh(empire.paths.root);
      this.explorer.refresh();
      const action = await this.host.showInformationMessage(
        `Empire "${empire.manifest.empire}" imported at ${empire.paths.root}. The vault starts empty — register your own keys.`,
        'Start Stack', 'Register Secret'
      );
      if (action === 'Start Stack') await this.startStack();
      else if (action === 'Register Secret') await this.registerSecret();
    } catch (e) {
      await this.host.showErrorMessage(`Import failed: ${(e as Error).message}`);
    }
  }

  // -------------------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------------------

  showDashboard(): void {
    DashboardPanel.render(this.extContext.extensionUri, this);
  }

  /** DashboardActions.refresh */
  async refresh(): Promise<DashboardState> {
    return this.dashboardState();
  }

  /** DashboardActions.spawnAgent */
  async spawnAgent(agentId: string): Promise<void> {
    await this.spawnAgentFlow(agentId || undefined);
  }

  async dashboardState(): Promise<DashboardState> {
    const empire = await this.currentEmpire();
    const services = empire ? await this.docker.composePs(empire.paths.root) : [];
    const agents = this.lastAgents.length ? this.lastAgents : await this.registry.discover();
    const lastAgent = empire ? this.state.read(empire.paths).lastAgent : null;
    let contextTail = 'No Empire open.';
    if (empire) {
      const lines = this.context.read(empire.paths).split('\n').filter((l) => l.startsWith('- ['));
      contextTail = lines.slice(-8).join('\n') || 'Nothing recorded yet — spawn an agent to begin.';
    }
    return {
      empire: empire ? {
        name: empire.manifest.empire,
        id: empire.manifest.id,
        createdAt: empire.manifest.createdAt,
        stackStatus: empire ? this.state.read(empire.paths).stackStatus : 'unknown'
      } : null,
      services: services.map((s) => ({ name: s.service, state: s.state, status: s.status, health: s.health })),
      agents: agents.map((a) => ({ id: a.id, name: a.name, available: a.available, version: a.version, active: a.id === lastAgent })),
      contextTail,
      dockgeUrl: `http://127.0.0.1:${this.dockgePort()}`,
      onecliUrl: `http://127.0.0.1:${this.onecliPort()}`
    };
  }

  private explorerSnapshot(): ExplorerSnapshot {
    const empire = this.currentEmpireRoot && this.empires.isEmpire(this.currentEmpireRoot)
      ? this.empires.validate(this.currentEmpireRoot)
      : null;
    return {
      empire: empire ? {
        name: empire.manifest.empire,
        id: empire.manifest.id,
        root: empire.paths.root,
        stackStatus: this.state.read(empire.paths).stackStatus
      } : null,
      agents: this.lastAgents,
      services: [], // populated on refresh (avoids sync docker calls in tree)
      contextPath: empire?.paths.contextPath ?? null,
      composePath: empire ? path.join(empire.paths.root, 'docker-compose.yml') : null
    };
  }
}
