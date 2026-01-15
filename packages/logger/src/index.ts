// @repo/logger - Structured logging for salt-core
// Barrel export - all public APIs

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  context?: Record<string, unknown>
}

/**
 * Simple structured logger
 * TODO: Enhance with proper implementation in later phase
 */
export function createLogger(namespace: string) {
  return {
    debug: (message: string, context?: Record<string, unknown>) =>
      console.debug(`[${namespace}] ${message}`, context),
    info: (message: string, context?: Record<string, unknown>) =>
      console.info(`[${namespace}] ${message}`, context),
    warn: (message: string, context?: Record<string, unknown>) =>
      console.warn(`[${namespace}] ${message}`, context),
    error: (message: string, context?: Record<string, unknown>) =>
      console.error(`[${namespace}] ${message}`, context),
  }
}
