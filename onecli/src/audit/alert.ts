// Alert tracker: counts denials and failed lookups per minute; when a
// threshold is crossed it emits an "alert" audit event.

import type { AuditLogger } from './logger';

export interface AlertConfig {
  maxDenialsPerMinute: number;
  maxFailedKeyLookupsPerMinute: number;
}

export class AlertTracker {
  private minuteStart = Date.now();
  private denials = 0;
  private misses = 0;
  private alertedDenials = false;
  private alertedMisses = false;

  constructor(private audit: AuditLogger, private config: AlertConfig) {}

  recordDenial(): void {
    this.tick();
    this.denials++;
    if (!this.alertedDenials && this.denials >= this.config.maxDenialsPerMinute) {
      this.alertedDenials = true;
      this.audit.log({
        event: 'alert',
        detail: `Denials exceeded ${this.config.maxDenialsPerMinute}/min (${this.denials} denials).`
      });
    }
  }

  recordMiss(): void {
    this.tick();
    this.misses++;
    if (!this.alertedMisses && this.misses >= this.config.maxFailedKeyLookupsPerMinute) {
      this.alertedMisses = true;
      this.audit.log({
        event: 'alert',
        detail: `Failed key lookups exceeded ${this.config.maxFailedKeyLookupsPerMinute}/min (${this.misses} misses).`
      });
    }
  }

  private tick(): void {
    const now = Date.now();
    if (now - this.minuteStart >= 60_000) {
      this.minuteStart = now;
      this.denials = 0;
      this.misses = 0;
      this.alertedDenials = false;
      this.alertedMisses = false;
    }
  }
}
