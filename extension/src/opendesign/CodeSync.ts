import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Watches `design/` for changes and notifies the host layer. The host decides
 * what to do: with a live agent session it records the change in context.md
 * for the agent to act on; otherwise it runs the deterministic CodegenEngine
 * so the codebase always reflects the latest design.
 */
export class CodeSync {
  private watcher: fs.FSWatcher | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(private onChange: (empirePath: string) => void, private debounceMs = 800) {}

  watch(empirePath: string): void {
    const designDir = path.join(empirePath, 'design');
    if (!fs.existsSync(designDir)) return;
    if (this.watcher) {
      this.watcher.close();
    }
    try {
      this.watcher = fs.watch(designDir, { recursive: true }, () => {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => this.onChange(empirePath), this.debounceMs);
      });
    } catch {
      // fs.watch recursive is unavailable on some platforms; skip silently —
      // "Generate Code From Design" still works on demand.
    }
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    if (this.watcher) this.watcher.close();
    this.watcher = null;
  }
}
