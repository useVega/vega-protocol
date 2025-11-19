/**
 * Logger Utility
 * Centralized logging for the system
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  constructor(private component: string) {}

  debug(message: string, metadata?: any): void {
    this.log('debug', message, metadata);
  }

  info(message: string, metadata?: any): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: any): void {
    this.log('warn', message, metadata);
  }

  error(message: string, error?: Error | any, metadata?: any): void {
    this.log('error', message, { error, ...metadata });
  }

  private log(level: LogLevel, message: string, metadata?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      component: this.component,
      message,
      metadata,
    };

    // Format for console
    const color = this.getColor(level);
    const reset = '\x1b[0m';
    const levelStr = level.toUpperCase().padEnd(5);
    
    console.log(
      `${color}[${timestamp}] ${levelStr}${reset} [${this.component}] ${message}`,
      metadata ? JSON.stringify(metadata, null, 2) : ''
    );

    // TODO: Send to monitoring service
  }

  private getColor(level: LogLevel): string {
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
    };
    return colors[level];
  }
}

// Create logger factory
export function createLogger(component: string): Logger {
  return new Logger(component);
}
