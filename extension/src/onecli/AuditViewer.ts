import { OneCLIClient, type AuditEvent } from './OneCLIClient';
import type { Host } from '../core/types';

/** Fetches the OneCLI audit log and opens it as an untitled JSON document. */
export class AuditViewer {
  constructor(private host: Host) {}

  async show(client: OneCLIClient, limit = 200): Promise<void> {
    let events: AuditEvent[];
    try {
      events = await client.audit(limit);
    } catch (e) {
      await this.host.showErrorMessage(`Could not read the OneCLI audit log: ${(e as Error).message}`);
      return;
    }
    await this.host.openUntitledDocument(JSON.stringify(events, null, 2), 'json');
  }
}
