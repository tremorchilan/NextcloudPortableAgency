// Empire Dashboard webview (vanilla TS — bundled by esbuild into out/webview/dashboard.js).
// Renders the state pushed by the extension and sends commands back.

interface DashboardState {
  empire: { name: string; id: string; createdAt: string; stackStatus: string } | null;
  services: Array<{ name: string; state: string; status: string; health?: string }>;
  agents: Array<{ id: string; name: string; available: boolean; version: string | null; active: boolean }>;
  contextTail: string;
  dockgeUrl: string;
  onecliUrl: string;
}

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

const styles = `
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { font-family: var(--vscode-font-family, sans-serif); font-size: var(--vscode-font-size, 13px); color: var(--vscode-foreground); padding: 0; margin: 0; }
  .wrap { padding: 16px; max-width: 860px; margin: 0 auto; }
  h1 { font-size: 1.25em; margin: 0 0 4px; }
  h2 { font-size: 1em; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: .05em; opacity: .75; }
  .muted { opacity: .7; }
  .badge { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: .85em; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
  .badge.running { background: #2a7f4b; color: #fff; }
  .badge.stopped { background: #7f4b2a; color: #fff; }
  .card { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 12px; margin-bottom: 8px; }
  .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0; }
  button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; font: inherit; }
  button:hover { background: var(--vscode-button-hoverBackground); }
  button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
  pre { background: var(--vscode-textCodeBlock-background); padding: 10px; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; font-size: .92em; }
  table { width: 100%; border-collapse: collapse; }
  td, th { text-align: left; padding: 4px 8px; border-bottom: 1px solid var(--vscode-panel-border); }
  .error { color: var(--vscode-errorForeground); margin: 8px 0; }
  .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }
  .dot.up { background: #2a7f4b; } .dot.down { background: #a1260d; }
`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, attrs: Record<string, string> = {}, ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const child of children) node.append(child);
  return node;
}

function post(cmd: string, extra: Record<string, string> = {}): void {
  vscode.postMessage({ cmd, ...extra });
}

let state: DashboardState | null = null;

function render(): void {
  const root = document.getElementById('root');
  if (!root) return;
  root.replaceChildren();

  if (!state) {
    root.append(el('div', { class: 'wrap' }, el('p', {}, 'Loading Empire state…')));
    return;
  }

  const wrap = el('div', { class: 'wrap' });

  if (!state.empire) {
    wrap.append(
      el('h1', {}, 'Empire Engine'),
      el('p', { class: 'muted' }, 'No Empire is open. Create one — a folder that becomes a complete, sovereign environment.'),
      el('div', { class: 'actions' },
        el('button', { id: 'btn-create' }, 'Create New Empire'),
        el('button', { class: 'secondary', id: 'btn-open' }, 'Open Existing Empire'),
        el('button', { class: 'secondary', id: 'btn-import' }, 'Import (.zip)')
      )
    );
    const btnCreate = wrap.querySelector('#btn-create');
    const btnOpen = wrap.querySelector('#btn-open');
    const btnImport = wrap.querySelector('#btn-import');
    btnCreate?.addEventListener('click', () => post('createEmpire'));
    btnOpen?.addEventListener('click', () => post('openEmpire'));
    btnImport?.addEventListener('click', () => post('importEmpire'));
    root.append(wrap);
    return;
  }

  const e = state.empire;
  const stackBadge = e.stackStatus === 'running'
    ? el('span', { class: 'badge running' }, 'STACK RUNNING')
    : el('span', { class: 'badge stopped' }, 'STACK ' + (e.stackStatus ?? 'unknown').toUpperCase());

  wrap.append(
    el('h1', {}, e.name),
    el('p', { class: 'muted' }, `${e.id} · created ${e.createdAt}`),
    el('p', {}, stackBadge),
    el('div', { class: 'actions' },
      el('button', { id: 'b-start' }, 'Start Stack'),
      el('button', { class: 'secondary', id: 'b-stop' }, 'Stop Stack'),
      el('button', { class: 'secondary', id: 'b-dockge' }, 'Open Dockge'),
      el('button', { class: 'secondary', id: 'b-export' }, 'Export (.zip)'),
      el('button', { class: 'secondary', id: 'b-design' }, 'OpenDesign'),
      el('button', { class: 'secondary', id: 'b-secret' }, 'Register Secret')
    ),
    el('h2', {}, 'Services'),
    renderServices(),
    el('h2', {}, 'Agents'),
    renderAgents(),
    el('h2', {}, 'What Was Done Last'),
    el('pre', {}, state.contextTail),
    el('p', { class: 'muted' }, `Dockge: ${state.dockgeUrl} · OneCLI: ${state.onecliUrl}`)
  );

  wrap.querySelector('#b-start')?.addEventListener('click', () => post('startStack'));
  wrap.querySelector('#b-stop')?.addEventListener('click', () => post('stopStack'));
  wrap.querySelector('#b-dockge')?.addEventListener('click', () => post('openDockge'));
  wrap.querySelector('#b-export')?.addEventListener('click', () => post('export'));
  wrap.querySelector('#b-design')?.addEventListener('click', () => post('openDesign'));
  wrap.querySelector('#b-secret')?.addEventListener('click', () => post('registerSecret'));

  root.append(wrap);
}

function renderServices(): HTMLElement {
  if (state!.services.length === 0) {
    return el('div', { class: 'card muted' }, 'Stack is not running. Click "Start Stack" to bring up Dockge and OneCLI.');
  }
  const table = el('table', {}, el('tr', {}, el('th', {}, 'Service'), el('th', {}, 'Status'), el('th', {}, 'Detail')));
  for (const s of state!.services) {
    const up = s.state === 'running';
    table.append(el('tr', {},
      el('td', {}, el('span', { class: `dot ${up ? 'up' : 'down'}` }), s.name),
      el('td', {}, up ? 'running' : s.state),
      el('td', { class: 'muted' }, s.status)
    ));
  }
  return table;
}

function renderAgents(): HTMLElement {
  const list = el('div', {});
  for (const agent of state!.agents) {
    const row = el('div', { class: 'card row' },
      el('span', {}, agent.name + (agent.active ? ' (last session)' : '')),
      el('span', { class: 'muted' }, agent.available ? (agent.version ?? 'installed') : 'not installed'),
      el('span', { style: 'flex:1' }),
      agent.available
        ? el('button', { class: 'secondary', 'data-agent': agent.id }, 'Spawn')
        : el('span', { class: 'muted' }, '—')
    );
    row.querySelector('button')?.addEventListener('click', () => post('spawnAgent', { agentId: agent.id }));
    list.append(row);
  }
  return list;
}

window.addEventListener('message', (event: MessageEvent) => {
  const message = event.data as { type: string; state?: DashboardState; message?: string };
  if (message.type === 'state') {
    state = message.state ?? null;
    render();
  } else if (message.type === 'error') {
    const root = document.getElementById('root');
    const errorBox = el('div', { class: 'error' }, message.message ?? 'Unknown error');
    root?.prepend(errorBox);
  }
});

render();
vscode.postMessage({ cmd: 'getState' });
