// Structured audit trail — one JSON event per line in audit.jsonl
// (mounted at ./logs/audit.jsonl inside an Empire).

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface AuditEvent {
  ts?: string;
  event: string;
  service?: string;
  placeholder?: string;
  upstream?: string;
  method?: string;
  status?: number;
  latency_ms?: number;
  detail?: string;
}

export class AuditLogger {
  private filePath: string | null;

  constructor(dataDir: string, auditFile: string) {
    this.filePath = path.join(dataDir, auditFile);
  }

  log(event: AuditEvent): void {
    event.ts = event.ts ?? new Date().toISOString();
    const line = JSON.stringify(event);
    // tslint:disable-next-line:no-console
    console.log(`[audit] ${line}`);
    if (!this.filePath) return;
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.appendFileSync(this.filePath, line + '\n', 'utf8');
    } catch (e) {
      console.error(`[audit] failed to write audit file: ${(e as Error).message}`);
    }
  }

  /** Read the most recent `limit` events (for the API). */
  tail(limit: number, since?: string): AuditEvent[] {
    if (!this.filePath || !fs.existsSync(this.filePath)) return [];
    const raw = fs.readFileSync(this.filePath, 'utf8');
    const events: AuditEvent[] = [];
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        events.push(JSON.parse(line) as AuditEvent);
      } catch {
        // skip corrupt lines
      }
    }
    let out = events.slice(-limit).reverse();
    if (since) {
      out = out.filter((e) => (e.ts ?? '') >= since);
    }
    return out;
  }
}
