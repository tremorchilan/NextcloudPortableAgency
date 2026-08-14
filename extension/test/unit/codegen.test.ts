import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { EmpireManager } from '../../src/core/EmpireManager';
import { CodegenEngine } from '../../src/opendesign/CodegenEngine';
import { findTemplateDir } from './helpers';

const TEMPLATE = findTemplateDir(__dirname);

test('generates real, runnable-ish code from design/', async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'empire-codegen-'));
  const manager = new EmpireManager({ templateDirs: [TEMPLATE] });
  const empire = await manager.create({ name: 'codegen-test', parentDir: parent });

  const result = new CodegenEngine().generate(empire.paths.root);
  assert.ok(result.files.length >= 3, `expected several generated files, got ${result.files.length}`);

  const outDir = path.join(empire.paths.root, 'src', 'website', 'generated');
  assert.ok(fs.existsSync(path.join(outDir, 'tokens.css')));
  assert.ok(fs.existsSync(path.join(outDir, 'components.jsx')));
  assert.ok(fs.existsSync(path.join(outDir, 'theme.js')));
  assert.ok(fs.existsSync(path.join(outDir, 'pages', 'home.jsx')));

  const css = fs.readFileSync(path.join(outDir, 'tokens.css'), 'utf8');
  assert.ok(css.includes('--color-primary: #D4A373;'));
  assert.ok(css.includes('--font-heading:'));

  const home = fs.readFileSync(path.join(outDir, 'pages', 'home.jsx'), 'utf8');
  assert.ok(home.includes('Welcome to codegen-test'), 'page content flowed through with Empire name substituted');
  assert.ok(home.includes('Navbar'));
  assert.ok(home.includes('Card'));

  const components = fs.readFileSync(path.join(outDir, 'components.jsx'), 'utf8');
  assert.ok(components.includes('export const Navbar'));
  assert.ok(components.includes('export const Button'));
});

test('codegen with a custom page and no empire-specific surprises', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'empire-codegen2-'));
  fs.mkdirSync(path.join(root, 'design', 'pages'), { recursive: true });
  fs.mkdirSync(path.join(root, 'design'), { recursive: true });
  fs.writeFileSync(path.join(root, 'design', 'tokens.json'), JSON.stringify({
    colors: { primary: '#112233' },
    fonts: { heading: 'serif', body: 'sans-serif' },
    spacing: {}, radii: {}, breakpoints: {}, shadows: {}
  }));
  fs.writeFileSync(path.join(root, 'design', 'pages', 'pricing.json'), JSON.stringify({
    id: 'pricing',
    name: 'Pricing',
    route: '/pricing',
    nodes: [
      { id: 'h', type: 'heading', props: { text: 'Plans', level: 'h1' }, children: [] },
      { id: 'c', type: 'card', props: {}, children: [] },
      { id: 'b', type: 'button', props: { text: 'Buy', variant: 'primary', parent: 'c' }, children: [] }
    ]
  }));

  const result = new CodegenEngine().generate(root);
  assert.ok(result.files.some((f) => f.endsWith('pricing.jsx')));
  const pricing = fs.readFileSync(
    result.files.find((f) => f.endsWith('pricing.jsx'))!, 'utf8'
  );
  assert.ok(pricing.includes('PricingPage'));
  assert.ok(pricing.includes('<Card>'));
  assert.ok(pricing.includes('variant={"primary"}'));
  // Nested button appears inside the card (parent relationship preserved).
  const cardIdx = pricing.indexOf('<Card>');
  const buttonIdx = pricing.indexOf('<Button');
  assert.ok(cardIdx !== -1 && buttonIdx > cardIdx, 'button rendered inside card');
});
