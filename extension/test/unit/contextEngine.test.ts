import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ContextEngine, parseSections, serializeSections } from '../../src/core/ContextEngine';
import { empirePaths } from '../../src/core/types';

function tmpEmpire(name: string): { root: string; paths: ReturnType<typeof empirePaths> } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `empire-context-${name}-`));
  fs.mkdirSync(path.join(root, '.empire'), { recursive: true });
  fs.writeFileSync(path.join(root, '.empire', 'context.md'), `# Empire Context: ${name}\n\n## What We Are Building\n\nA test bakery.\n`);
  return { root, paths: empirePaths(root) };
}

test('parse/serialize round-trips the context document', () => {
  const doc = [
    '# Empire Context: shop-alpha',
    '',
    '## What We Are Building',
    'A bakery business with online ordering.',
    '',
    '## Service Map',
    '| Service | Address | Status |',
    '|---------|---------|--------|',
    '| n8n | http://n8n:5678 | Running |',
    '',
    '## What Was Done Last',
    '- [Claude Code, 2026-08-12 14:30] Created customer signup form',
    '',
    '## What Is Next',
    '- Complete the invoicing workflow'
  ].join('\n');

  const parsed = parseSections(doc);
  assert.ok(Object.keys(parsed).some((k) => k.startsWith('# Empire Context')));
  assert.equal(parsed['What We Are Building'], 'A bakery business with online ordering.');
  assert.equal(parsed['What Was Done Last'], '- [Claude Code, 2026-08-12 14:30] Created customer signup form');

  const serialized = serializeSections(parsed);
  assert.ok(serialized.includes('# Empire Context: shop-alpha'));
  assert.ok(serialized.includes('## What Was Done Last'));
  assert.ok(serialized.includes('Created customer signup form'));

  const reparsed = parseSections(serialized);
  assert.equal(reparsed['What Is Next'], '- Complete the invoicing workflow');
});

test('appendActivity adds entries and keeps other sections intact', () => {
  const { paths } = tmpEmpire('bakery');
  const engine = new ContextEngine();
  engine.ensureSections(paths, 'bakery');
  engine.appendActivity(paths, 'Codex', 'Wired the invoicing workflow to ERPNext.');

  const content = engine.read(paths);
  assert.ok(content.includes('## What Was Done Last'));
  assert.ok(content.includes('Wired the invoicing workflow to ERPNext.'));
  assert.ok(content.includes('Codex,'));
  // Standard sections must all exist.
  for (const section of ['What We Are Building', 'Service Map', 'What Is Next', 'Key Decisions', 'Anti-Patterns to Avoid']) {
    assert.ok(content.includes(`## ${section}`), `missing section ${section}`);
  }
});

test('recordHandoff captures the from→to transition', () => {
  const { paths } = tmpEmpire('bakery');
  const engine = new ContextEngine();
  engine.recordHandoff(paths, { from: 'claude', to: 'codex', at: new Date().toISOString() });
  const content = engine.read(paths);
  assert.ok(content.includes('Handoff: claude → codex'));
});

test('setNextSteps replaces the What Is Next list', () => {
  const { paths } = tmpEmpire('bakery');
  const engine = new ContextEngine();
  engine.setNextSteps(paths, ['A', 'B', 'C']);
  const content = engine.read(paths);
  assert.ok(content.includes('- A'));
  assert.ok(content.includes('- B'));
  assert.ok(content.includes('- C'));
});

test('compact keeps the newest entries and summarizes the rest', () => {
  const { paths } = tmpEmpire('bakery');
  const engine = new ContextEngine();
  for (let i = 0; i < 150; i++) {
    engine.appendActivity(paths, 'claude', `action number ${i}`);
  }
  const before = engine.read(paths);
  assert.ok(before.includes('action number 0'));

  const result = engine.compact(paths, 100);
  assert.ok(result.after < result.before);
  const after = engine.read(paths);
  assert.ok(!after.includes('action number 0'), 'old entries folded away');
  assert.ok(after.includes('action number 149'));
  assert.ok(after.includes('Context compacted'));
  const entries = after.split('\n').filter((l) => l.startsWith('- [')).length;
  assert.ok(entries <= 101, `expected ≤101 entries, got ${entries}`);
});

test('missing context file yields a valid document', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'empire-context-empty-'));
  const paths = empirePaths(root);
  const engine = new ContextEngine();
  engine.ensureSections(paths, 'fresh');
  const content = engine.read(paths);
  assert.ok(content.includes('# Empire Context: fresh'));
  assert.ok(content.includes('## What Is Next'));
});
