/**
 * Tiny logger with levels and a scope, no dependencies. The shell injects it;
 * the domain never imports it.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/** Silent default, so tests don't need a fake. */
export const noopLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

function configuredLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
  return raw in LEVEL_WEIGHT ? (raw as LogLevel) : 'info';
}

/** Events below LOG_LEVEL (debug|info|warn|error, default info) are dropped. */
export function createLogger(scope: string, level: LogLevel = configuredLevel()): Logger {
  const threshold = LEVEL_WEIGHT[level];

  const emit = (eventLevel: LogLevel, message: string, meta?: Record<string, unknown>): void => {
    if (LEVEL_WEIGHT[eventLevel] < threshold) {
      return;
    }
    const suffix = meta === undefined ? '' : ` ${JSON.stringify(meta)}`;
    const line = `[${eventLevel}] [${scope}] ${message}${suffix}`;
    if (eventLevel === 'error') {
      console.error(line);
    } else {
      console.log(line);
    }
  };

  return {
    debug: (message, meta) => emit('debug', message, meta),
    info: (message, meta) => emit('info', message, meta),
    warn: (message, meta) => emit('warn', message, meta),
    error: (message, meta) => emit('error', message, meta),
  };
}
