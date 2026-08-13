export interface LogSink {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

const noop = (): void => undefined;

export class Logger implements LogSink {
  constructor(private sink: LogSink = { info: noop, warn: noop, error: noop }, private prefix = 'empire') {}

  info(message: string): void {
    this.sink.info(`[${this.prefix}] ${message}`);
  }

  warn(message: string): void {
    this.sink.warn(`[${this.prefix}] ${message}`);
  }

  error(message: string): void {
    this.sink.error(`[${this.prefix}] ${message}`);
  }
}
