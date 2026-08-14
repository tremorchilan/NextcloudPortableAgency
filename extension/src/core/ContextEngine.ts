import * as fs from 'node:fs';
import { readText, writeTextAtomic, nowIso } from '../utils/files';
import type { EmpirePaths } from './types';

export const CONTEXT_SECTIONS = [
  'What We Are Building',
  'Service Map',
  'What Was Done Last',
  'What Is Next',
  'Key Decisions',
  'Anti-Patterns to Avoid'
] as const;

export interface HandoffRecord {
  from: string | null;
  to: string;
  at: string;
  note?: string;
}

/**
 * Read/write `.empire/context.md` — the shared memory that makes agent
 * switching frictionless. Every agent reads it before starting and appends
 * to it after significant work.
 */
export class ContextEngine {
  read(paths: EmpirePaths): string {
    if (!fs.existsSync(paths.contextPath)) {
      return `# Empire Context:\n`;
    }
    return readText(paths.contextPath);
  }

  write(paths: EmpirePaths, content: string): void {
    writeTextAtomic(paths.contextPath, content);
  }

  /** Append a "done last" entry, e.g. `- [Codex, 2026-08-12 16:15] Fixed the cart`. */
  appendActivity(paths: EmpirePaths, agent: string, action: string): void {
    const line = `- [${agent}, ${nowIso()}] ${action}`;
    this.appendToSection(paths, 'What Was Done Last', line);
  }

  /** Append an agent-handoff entry under "What Was Done Last". */
  recordHandoff(paths: EmpirePaths, handoff: HandoffRecord): void {
    const from = handoff.from ?? 'a fresh session';
    const note = handoff.note ? ` — ${handoff.note}` : '';
    this.appendActivity(paths, 'meta-harness', `Handoff: ${from} → ${handoff.to}${note}`);
  }

  /** Replace the "What Is Next" bullet list. */
  setNextSteps(paths: EmpirePaths, steps: string[]): void {
    this.replaceSection(paths, 'What Is Next', steps.map((s) => `- ${s}`).join('\n'));
  }

  /**
   * Compaction (risk register #1): keep the most recent activity entries and
   * fold older ones into a summary line, so context.md stays bounded.
   */
  compact(paths: EmpirePaths, maxActivityEntries = 100): { before: number; after: number } {
    const content = this.read(paths);
    const before = content.length;
    const parsed = parseSections(content);
    const done = parsed['What Was Done Last'] ?? '';
    const lines = done.trim().split('\n').filter((l) => l.trim().length > 0);
    if (lines.length <= maxActivityEntries) return { before, after: before };

    const keep = lines.slice(-maxActivityEntries);
    const dropped = lines.length - keep.length;
    const summary = `- [meta-harness, ${nowIso()}] Context compacted: ${dropped} older entries were summarized away.`;
    parsed['What Was Done Last'] = [summary, ...keep].join('\n');
    const next = serializeSections(parsed);
    this.write(paths, next);
    return { before, after: next.length };
  }

  /** Ensure the standard sections exist (appended in canonical order). */
  ensureSections(paths: EmpirePaths, empireName: string): void {
    const content = this.read(paths);
    const parsed = parseSections(content);
    const h1Key = Object.keys(parsed).find((k) => k.startsWith('# Empire Context'));
    if (!h1Key || h1Key === '# Empire Context:') {
      if (h1Key) {
        parsed[`# Empire Context: ${empireName}`] = parsed[h1Key];
        delete parsed[h1Key];
      } else {
        parsed[`# Empire Context: ${empireName}`] = '';
      }
    }
    for (const section of CONTEXT_SECTIONS) {
      if (!(section in parsed)) parsed[section] = '';
    }
    this.write(paths, serializeSections(parsed));
  }

  private appendToSection(paths: EmpirePaths, section: string, line: string): void {
    const parsed = parseSections(this.read(paths));
    const existing = parsed[section] ?? '';
    parsed[section] = existing.trim() ? `${existing.trimEnd()}\n${line}` : line;
    this.write(paths, serializeSections(parsed));
  }

  private replaceSection(paths: EmpirePaths, section: string, body: string): void {
    const parsed = parseSections(this.read(paths));
    parsed[section] = body;
    this.write(paths, serializeSections(parsed));
  }
}

/**
 * Parse a context.md document into an ordered map: heading → body.
 * The H1 title line is keyed by its full text (e.g. "# Empire Context: shop-alpha").
 */
export function parseSections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = content.split('\n');
  let current: string | null = null;
  let buffer: string[] = [];
  const flush = (): void => {
    if (current !== null) {
      out[current] = buffer.join('\n').replace(/\n+$/, '');
    }
    buffer = [];
  };
  for (const line of lines) {
    if (line.startsWith('## ')) {
      flush();
      current = line.slice(3).trim();
      out[current] = '';
    } else if (line.startsWith('# ')) {
      flush();
      current = line.trim();
      out[current] = '';
    } else if (current !== null) {
      buffer.push(line);
    }
  }
  flush();
  return out;
}

/** Serialize an ordered heading map back to Markdown. */
export function serializeSections(parsed: Record<string, string>): string {
  const blocks: string[] = [];
  for (const [heading, body] of Object.entries(parsed)) {
    const trimmed = body.trim();
    if (heading.startsWith('# ')) {
      // H1 title line; any body directly under it is preserved as a paragraph.
      blocks.push(trimmed ? `${heading}\n${trimmed}` : heading);
    } else {
      blocks.push(`## ${heading}\n${trimmed}`);
    }
  }
  return blocks.join('\n\n').trim() + '\n';
}
