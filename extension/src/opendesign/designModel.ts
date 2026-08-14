// OpenDesign data model: what lives in design/tokens.json, design/components/
// and design/pages/, and what the canvas sends back and forth.

export interface DesignTokens {
  colors: Record<string, string>;
  fonts: { heading: string; body: string };
  spacing: Record<string, string>;
  radii: Record<string, string>;
  breakpoints: Record<string, string>;
  shadows: Record<string, string>;
}

export const DEFAULT_TOKENS: DesignTokens = {
  colors: {
    primary: '#D4A373',
    primaryDark: '#B98A5A',
    secondary: '#A3B18A',
    background: '#FAF6F0',
    surface: '#FFFFFF',
    text: '#2D2A26',
    muted: '#8A8478',
    border: '#E5DFD3',
    accent: '#E07A5F',
    success: '#81B29A',
    danger: '#E07A5F'
  },
  fonts: {
    heading: "'Georgia', serif",
    body: "'Inter', 'Segoe UI', sans-serif"
  },
  spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '40px' },
  radii: { sm: '4px', md: '8px', lg: '16px' },
  breakpoints: { sm: '640px', md: '960px', lg: '1280px' },
  shadows: { sm: '0 1px 3px rgba(0,0,0,0.08)', md: '0 4px 12px rgba(0,0,0,0.12)' }
};

export type NodeType = 'box' | 'text' | 'heading' | 'button' | 'input' | 'card' | 'navbar' | 'image' | 'form' | 'list';

export interface DesignNode {
  id: string;
  type: NodeType;
  props: Record<string, string>;
  /** Child node ids, rendered in order inside the parent. */
  children: string[];
}

export interface DesignPage {
  id: string;
  name: string;
  route: string;
  nodes: DesignNode[];
}

export interface ComponentDefinition {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  defaultProps: Record<string, string>;
  defaultChildren?: Partial<Record<NodeType, number>>;
}

export interface PaletteItem {
  type: NodeType;
  label: string;
  defaultProps: Record<string, string>;
}

export const PALETTE: PaletteItem[] = [
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

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function nodeById(page: DesignPage, id: string): DesignNode | undefined {
  return page.nodes.find((n) => n.id === id);
}
