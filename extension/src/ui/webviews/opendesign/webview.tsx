// OpenDesign webview — React canvas bundled by esbuild into out/webview/opendesign.js.
// Drag components from the palette onto the canvas, edit properties, tweak
// design tokens, and persist everything back into design/ inside the Empire.

import * as React from 'react';
import { createRoot } from 'react-dom/client';

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Tokens {
  colors: Record<string, string>;
  fonts: { heading: string; body: string };
  spacing: Record<string, string>;
  radii: Record<string, string>;
  breakpoints: Record<string, string>;
  shadows: Record<string, string>;
}

interface NodeDef {
  id: string;
  type: string;
  props: Record<string, string>;
  children: string[];
}

interface Page {
  id: string;
  name: string;
  route: string;
  nodes: NodeDef[];
}

interface PaletteItem {
  type: string;
  label: string;
  defaultProps: Record<string, string>;
}

interface AppState {
  empireRoot: string | null;
  empireName: string;
  tokens: Tokens;
  pages: Page[];
  pageId: string | null;
  selectedId: string | null;
  tab: 'canvas' | 'tokens';
  status: string;
  error: string;
}

const newId = (prefix: string): string => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const PALETTE: PaletteItem[] = [
  { type: 'box', label: 'Box', defaultProps: {} },
  { type: 'heading', label: 'Heading', defaultProps: { text: 'Heading', level: 'h2' } },
  { type: 'text', label: 'Text', defaultProps: { text: 'Some text goes here.' } },
  { type: 'button', label: 'Button', defaultProps: { text: 'Click me', variant: 'primary' } },
  { type: 'input', label: 'Input', defaultProps: { placeholder: 'Type here…' } },
  { type: 'card', label: 'Card', defaultProps: {} },
  { type: 'navbar', label: 'Navbar', defaultProps: { title: 'Site name' } },
  { type: 'image', label: 'Image', defaultProps: { src: 'https://placehold.co/400x200', alt: '' } },
  { type: 'form', label: 'Form', defaultProps: {} },
  { type: 'list', label: 'List', defaultProps: { items: 'One\nTwo\nThree' } }
];

const PROP_FIELDS: Record<string, string[]> = {
  box: [],
  heading: ['text', 'level'],
  text: ['text'],
  button: ['text', 'variant'],
  input: ['placeholder'],
  card: [],
  navbar: ['title'],
  image: ['src', 'alt'],
  form: [],
  list: ['items']
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stylesForNode(node: NodeDef, tokens: Tokens): React.CSSProperties {
  const base: React.CSSProperties = {};
  switch (node.type) {
    case 'text':
      base.fontFamily = tokens.fonts.body;
      base.margin = '4px 0';
      break;
    case 'heading':
      base.fontFamily = tokens.fonts.heading;
      base.margin = '8px 0';
      break;
    case 'button': {
      base.padding = `${tokens.spacing.sm} ${tokens.spacing.md}`;
      base.borderRadius = tokens.radii.md;
      base.border = `1px solid ${tokens.colors.border}`;
      base.cursor = 'pointer';
      const variant = node.props.variant ?? 'primary';
      if (variant === 'primary') {
        base.background = tokens.colors.primary;
        base.color = '#fff';
      } else if (variant === 'secondary') {
        base.background = tokens.colors.secondary;
        base.color = '#fff';
      } else if (variant === 'ghost') {
        base.background = 'transparent';
      }
      break;
    }
    case 'input':
      base.padding = tokens.spacing.sm;
      base.border = `1px solid ${tokens.colors.border}`;
      base.borderRadius = tokens.radii.md;
      base.width = '100%';
      break;
    case 'card':
      base.background = tokens.colors.surface;
      base.border = `1px solid ${tokens.colors.border}`;
      base.borderRadius = tokens.radii.lg;
      base.padding = tokens.spacing.lg;
      base.boxShadow = tokens.shadows.md;
      break;
    case 'navbar':
      base.display = 'flex';
      base.gap = tokens.spacing.md;
      base.alignItems = 'center';
      base.padding = tokens.spacing.md;
      base.background = tokens.colors.surface;
      base.borderBottom = `1px solid ${tokens.colors.border}`;
      break;
    case 'image':
      base.maxWidth = '100%';
      break;
    case 'form':
      base.display = 'flex';
      base.flexDirection = 'column';
      base.gap = tokens.spacing.md;
      break;
    case 'box':
      base.minHeight = '40px';
      break;
  }
  return base;
}

function renderNode(node: NodeDef, all: NodeDef[], tokens: Tokens, selectedId: string | null, onSelect: (id: string) => void, onAddNode: (type: string, parentId: string | null) => void): React.ReactNode {
  const children = all.filter((n) => (n.props.parent ?? '') === node.id);
  const style = stylesForNode(node, tokens);
  const outline = node.id === selectedId ? '2px solid #4f8cff' : '1px dashed transparent';
  const common = {
    key: node.id,
    style: { ...style, outline, position: 'relative' as const },
    onClick: (e: React.MouseEvent) => { e.stopPropagation(); onSelect(node.id); },
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const type = e.dataTransfer.getData('text/od-type');
      if (type) onAddNode(type, node.id);
    }
  };

  switch (node.type) {
    case 'heading': {
      const Tag = (node.props.level === 'h1' ? 'h1' : node.props.level === 'h3' ? 'h3' : 'h2') as 'h1';
      return React.createElement(Tag, common, node.props.text ?? 'Heading', ...children.map((child) => renderNode(child, all, tokens, selectedId, onSelect, onAddNode)));
    }
    case 'button':
      return React.createElement('button', common, node.props.text ?? 'Button', ...children.map((child) => renderNode(child, all, tokens, selectedId, onSelect, onAddNode)));
    case 'input':
      return React.createElement('input', { ...common, placeholder: node.props.placeholder, readOnly: true });
    case 'image':
      return React.createElement('img', { ...common, src: node.props.src, alt: node.props.alt });
    case 'navbar':
      return React.createElement('nav', common, node.props.title && React.createElement('strong', { style: { fontFamily: tokens.fonts.heading } }, node.props.title), ...children.map((child) => renderNode(child, all, tokens, selectedId, onSelect, onAddNode)));
    case 'form':
      return React.createElement('form', { ...common, onSubmit: (e: React.FormEvent) => e.preventDefault() }, ...children.map((child) => renderNode(child, all, tokens, selectedId, onSelect, onAddNode)));
    case 'list':
      return React.createElement('ul', common, ...String(node.props.items ?? '').split('\n').filter(Boolean).map((item, i) => React.createElement('li', { key: i }, item)));
    case 'text':
      return React.createElement('p', common, node.props.text, ...children.map((child) => renderNode(child, all, tokens, selectedId, onSelect, onAddNode)));
    case 'card':
    case 'box':
    default:
      return React.createElement('div', common, ...children.map((child) => renderNode(child, all, tokens, selectedId, onSelect, onAddNode)));
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App(): React.ReactElement {
  const [app, setApp] = React.useState<AppState>({
    empireRoot: null,
    empireName: 'Empire',
    tokens: {
      colors: { primary: '#D4A373', background: '#FAF6F0', surface: '#FFFFFF', text: '#2D2A26', border: '#E5DFD3' },
      fonts: { heading: 'serif', body: 'sans-serif' },
      spacing: { sm: '8px', md: '16px', lg: '24px' },
      radii: { sm: '4px', md: '8px', lg: '16px' },
      breakpoints: { sm: '640px', md: '960px', lg: '1280px' },
      shadows: { sm: 'none', md: '0 4px 12px rgba(0,0,0,0.12)' }
    },
    pages: [],
    pageId: null,
    selectedId: null,
    tab: 'canvas',
    status: '',
    error: ''
  });

  React.useEffect(() => {
    const listener = (event: MessageEvent): void => {
      const message = event.data as { type: string; [key: string]: unknown };
      if (message.type === 'init') {
        setApp((prev) => ({
          ...prev,
          empireRoot: (message.empireRoot as string | null) ?? null,
          empireName: (message.empireName as string) ?? prev.empireName,
          tokens: (message.tokens as Tokens) ?? prev.tokens,
          pages: (message.pages as Page[]) ?? [],
          pageId: prev.pageId ?? ((message.pages as Page[] | undefined)?.[0]?.id ?? null),
          selectedId: null,
          error: ''
        }));
      } else if (message.type === 'saved') {
        setApp((prev) => ({ ...prev, status: `Saved ${message.what ?? ''}`, error: '' }));
      } else if (message.type === 'generated') {
        setApp((prev) => ({ ...prev, status: 'Code generated into src/website/generated/', error: '' }));
      } else if (message.type === 'error') {
        setApp((prev) => ({ ...prev, error: String(message.message ?? ''), status: '' }));
      }
    };
    window.addEventListener('message', listener);
    vscode.postMessage({ type: 'ready' });
    return () => window.removeEventListener('message', listener);
  }, []);

  const currentPage = app.pages.find((p) => p.id === app.pageId) ?? null;

  const updatePage = (page: Page): void => {
    setApp((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => (p.id === page.id ? page : p))
    }));
    if (app.empireRoot) {
      vscode.postMessage({ type: 'savePage', empireRoot: app.empireRoot, page });
    }
  };

  const addNode = (type: string, parentId: string | null): void => {
    if (!currentPage) return;
    const palette = PALETTE.find((p) => p.type === type);
    if (!palette) return;
    const node: NodeDef = {
      id: newId(type),
      type,
      props: { ...palette.defaultProps, ...(parentId ? { parent: parentId } : {}) },
      children: []
    };
    const next = { ...currentPage, nodes: [...currentPage.nodes, node] };
    setApp((prev) => ({ ...prev, pages: prev.pages.map((p) => (p.id === currentPage.id ? next : p)), selectedId: node.id }));
    vscode.postMessage({ type: 'savePage', empireRoot: app.empireRoot, page: next });
  };

  const addPage = (): void => {
    const page: Page = { id: newId('page'), name: 'New page', route: '/new', nodes: [] };
    setApp((prev) => ({ ...prev, pages: [...prev.pages, page], pageId: page.id }));
    vscode.postMessage({ type: 'savePage', empireRoot: app.empireRoot, page });
  };

  const deletePage = (): void => {
    if (!currentPage) return;
    setApp((prev) => ({ ...prev, pages: prev.pages.filter((p) => p.id !== currentPage.id), pageId: prev.pages[0]?.id !== currentPage.id ? prev.pages[0]?.id ?? null : null, selectedId: null }));
    vscode.postMessage({ type: 'deletePage', empireRoot: app.empireRoot, pageId: currentPage.id });
  };

  const updateNodeProp = (nodeId: string, key: string, value: string): void => {
    if (!currentPage) return;
    const next: Page = {
      ...currentPage,
      nodes: currentPage.nodes.map((n) => (n.id === nodeId ? { ...n, props: { ...n.props, [key]: value } } : n))
    };
    updatePage(next);
  };

  const deleteNode = (nodeId: string): void => {
    if (!currentPage) return;
    const idsToDelete = new Set<string>([nodeId]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const n of currentPage.nodes) {
        if (idsToDelete.has(n.props.parent ?? '') && !idsToDelete.has(n.id)) {
          idsToDelete.add(n.id);
          grew = true;
        }
      }
    }
    const next: Page = { ...currentPage, nodes: currentPage.nodes.filter((n) => !idsToDelete.has(n.id)) };
    setApp((prev) => ({ ...prev, pages: prev.pages.map((p) => (p.id === currentPage.id ? next : p)), selectedId: null }));
    vscode.postMessage({ type: 'savePage', empireRoot: app.empireRoot, page: next });
  };

  const saveTokens = (tokens: Tokens): void => {
    setApp((prev) => ({ ...prev, tokens }));
    if (app.empireRoot) {
      vscode.postMessage({ type: 'saveTokens', empireRoot: app.empireRoot, tokens });
    }
  };

  const selectedNode = currentPage?.nodes.find((n) => n.id === app.selectedId) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'var(--vscode-font-family)' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--vscode-panel-border)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <strong>{app.empireName}</strong>
          <span style={{ opacity: 0.7 }}>· OpenDesign</span>
          <span style={{ flex: 1 }} />
          <select
            value={app.pageId ?? ''}
            onChange={(e) => setApp((prev) => ({ ...prev, pageId: e.target.value || null, selectedId: null }))}
            style={{ font: 'inherit', background: 'var(--vscode-dropdown-background)', color: 'var(--vscode-dropdown-foreground)' }}
          >
            {app.pages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="od-btn" onClick={addPage}>+ Page</button>
          <button className="od-btn" onClick={deletePage} disabled={!currentPage}>− Page</button>
          <button className="od-btn" onClick={() => setApp((prev) => ({ ...prev, tab: prev.tab === 'canvas' ? 'tokens' : 'canvas' }))}>
            {app.tab === 'canvas' ? 'Tokens' : 'Canvas'}
          </button>
          <button className="od-btn primary" onClick={() => vscode.postMessage({ type: 'generateCode' })} disabled={!app.empireRoot}>Generate Code</button>
        </div>
        {app.status && <div style={{ color: 'var(--vscode-testing-iconPassed, #2a7f4b)', fontSize: 12 }}>{app.status}</div>}
        {app.error && <div style={{ color: 'var(--vscode-errorForeground)', fontSize: 12 }}>{app.error}</div>}
      </div>

      {app.tab === 'canvas' ? (
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Palette */}
          <div style={{ width: 132, borderRight: '1px solid var(--vscode-panel-border)', padding: 8, overflowY: 'auto' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', opacity: 0.7, marginBottom: 6 }}>Components</div>
            {PALETTE.map((item) => (
              <div
                key={item.type}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/od-type', item.type)}
                className="od-palette-item"
              >
                {item.label}
              </div>
            ))}
          </div>

          {/* Canvas */}
          <div
            style={{ flex: 1, padding: 16, overflow: 'auto', background: app.tokens.colors.background }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const type = e.dataTransfer.getData('text/od-type');
              if (type) addNode(type, null);
            }}
            onClick={() => setApp((prev) => ({ ...prev, selectedId: null }))}
          >
            {!app.empireRoot && (
              <div style={{ textAlign: 'center', opacity: 0.7, padding: 24 }}>No Empire open — create or open one first.</div>
            )}
            {app.empireRoot && !currentPage && (
              <div style={{ textAlign: 'center', opacity: 0.7, padding: 24 }}>Add a page to start designing.</div>
            )}
            {currentPage && currentPage.nodes.filter((n) => !n.props.parent).map((node) =>
              renderNode(node, currentPage.nodes, app.tokens, app.selectedId, (id) => setApp((prev) => ({ ...prev, selectedId: id })), (type, parentId) => addNode(type, parentId))
            )}
            {currentPage && currentPage.nodes.filter((n) => !n.props.parent).length === 0 && app.empireRoot && (
              <div style={{ textAlign: 'center', opacity: 0.7, padding: 24 }}>Drag components here from the palette.</div>
            )}
          </div>

          {/* Properties */}
          <div style={{ width: 200, borderLeft: '1px solid var(--vscode-panel-border)', padding: 8, overflowY: 'auto' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', opacity: 0.7, marginBottom: 6 }}>Properties</div>
            {!selectedNode && <div style={{ opacity: 0.7 }}>Select a component to edit its properties.</div>}
            {selectedNode && (
              <>
                <div style={{ marginBottom: 8 }}><strong>{selectedNode.type}</strong> <span style={{ opacity: 0.6 }}>{selectedNode.id}</span></div>
                {(PROP_FIELDS[selectedNode.type] ?? []).map((key) => (
                  <label key={key} style={{ display: 'block', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, opacity: 0.8 }}>{key}</span>
                    <textarea
                      rows={key === 'items' ? 4 : 1}
                      value={selectedNode.props[key] ?? ''}
                      onChange={(e) => updateNodeProp(selectedNode.id, key, e.target.value)}
                      style={{ width: '100%', font: 'inherit', boxSizing: 'border-box', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)', border: '1px solid var(--vscode-input-border)', borderRadius: 3, padding: 4 }}
                    />
                  </label>
                ))}
                <button className="od-btn" style={{ color: 'var(--vscode-errorForeground)' }} onClick={() => deleteNode(selectedNode.id)}>Delete</button>
              </>
            )}
          </div>
        </div>
      ) : (
        <TokenEditor tokens={app.tokens} onSave={saveTokens} />
      )}

      <style>{odStyles}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Token editor tab
// ---------------------------------------------------------------------------

function TokenEditor({ tokens, onSave }: { tokens: Tokens; onSave: (tokens: Tokens) => void }): React.ReactElement {
  const [draft, setDraft] = React.useState<Tokens>(tokens);
  React.useEffect(() => setDraft(tokens), [tokens]);

  const color = (name: string, value: string): React.ReactElement => (
    <label key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'} onChange={(e) => setDraft((d) => ({ ...d, colors: { ...d.colors, [name]: e.target.value } }))} style={{ width: 34, height: 24, border: 'none', background: 'none', padding: 0 }} />
      <span style={{ width: 90, fontSize: 12 }}>{name}</span>
      <input value={value} onChange={(e) => setDraft((d) => ({ ...d, colors: { ...d.colors, [name]: e.target.value } }))} style={{ width: '100%', font: 'inherit', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)', border: '1px solid var(--vscode-input-border)', borderRadius: 3, padding: 3 }} />
    </label>
  );

  const string = (group: keyof Tokens, name: string, value: string): React.ReactElement => (
    <label key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ width: 90, fontSize: 12 }}>{name}</span>
      <input
        value={value}
        onChange={(e) => setDraft((d) => ({
          ...d,
          [group]: typeof d[group] === 'object' ? { ...(d[group] as Record<string, string>), [name]: e.target.value } : d[group]
        }))}
        style={{ width: '100%', font: 'inherit', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)', border: '1px solid var(--vscode-input-border)', borderRadius: 3, padding: 3 }}
      />
    </label>
  );

  const groupTitle = (text: string): React.ReactElement => (
    <div style={{ fontSize: 11, textTransform: 'uppercase', opacity: 0.7, margin: '14px 0 6px' }}>{text}</div>
  );

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <div style={{ maxWidth: 420 }}>
        {groupTitle('Colors')}
        {Object.entries(draft.colors).map(([name, value]) => color(name, value))}
        {groupTitle('Fonts')}
        {string('fonts', 'heading', draft.fonts.heading)}
        {string('fonts', 'body', draft.fonts.body)}
        {groupTitle('Spacing')}
        {Object.entries(draft.spacing).map(([name, value]) => string('spacing', name, value))}
        {groupTitle('Radii')}
        {Object.entries(draft.radii).map(([name, value]) => string('radii', name, value))}
        {groupTitle('Breakpoints')}
        {Object.entries(draft.breakpoints).map(([name, value]) => string('breakpoints', name, value))}
        {groupTitle('Shadows')}
        {Object.entries(draft.shadows).map(([name, value]) => string('shadows', name, value))}
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button className="od-btn primary" onClick={() => onSave(draft)}>Save Tokens</button>
          <button className="od-btn" onClick={() => setDraft(tokens)}>Reset</button>
        </div>
        <div style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
          Saving writes design/tokens.json inside the Empire. The CodeSync watcher
          regenerates src/website/generated/ automatically.
        </div>
      </div>
    </div>
  );
}

const odStyles = `
  .od-btn { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; border-radius: 3px; padding: 4px 10px; cursor: pointer; font: inherit; font-size: 12px; }
  .od-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
  .od-btn.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  .od-btn:disabled { opacity: .5; cursor: default; }
  .od-palette-item { padding: 6px 8px; margin-bottom: 4px; border: 1px solid var(--vscode-panel-border); border-radius: 4px; cursor: grab; font-size: 12px; background: var(--vscode-editor-background); }
  .od-palette-item:hover { background: var(--vscode-list-hoverBackground); }
`;

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
}
