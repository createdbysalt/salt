/**
 * Production-Safe Logging Utility
 *
 * Provides structured logging that automatically redacts sensitive data
 * in production environments to prevent PII leakage to log aggregation services.
 *
 * Usage:
 *   import { logger } from '@/app/_lib/logger'
 *
 *   logger.debug('Debug message', { userId: '123' })
 *   logger.info('User logged in', { email: 'user@example.com' })
 *   logger.warn('Rate limit approaching', { remaining: 5 })
 *   logger.error('Payment failed', { error, customerId: 'cus_123' })
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

const SENSITIVE_KEYS = [
  "password",
  "secret",
  "token",
  "access_token",
  "refresh_token",
  "api_key",
  "apikey",
  "authorization",
  "cookie",
  "session",
  "ssn",
  "social_security",
  "tax_id",
  "card",
  "cvv",
  "cvc",
  "pin",
  "routing_number",
  "account_number",
  "bank_account",
];

const PII_KEYS = ["email", "phone", "address", "ip", "ip_address", "user_agent"];

/**
 * Redact sensitive data from an object
 */
function redactSensitiveData(data: unknown, depth = 0): unknown {
  // Prevent infinite recursion
  if (depth > 10) return "[MAX_DEPTH]";

  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    // Redact JWT tokens
    if (data.startsWith("eyJ")) {
      return "[REDACTED_TOKEN]";
    }
    // Redact Stripe keys
    if (data.startsWith("sk_") || data.startsWith("pk_")) {
      return "[REDACTED_STRIPE_KEY]";
    }
    return data;
  }

  if (typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item, depth + 1));
  }

  const redacted: Record<string, unknown> = {};
  const obj = data as Record<string, unknown>;

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check for sensitive keys
    if (SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
      redacted[key] = "[REDACTED]";
      continue;
    }

    // In production, also redact PII
    if (
      process.env.NODE_ENV === "production" &&
      PII_KEYS.some((pii) => lowerKey.includes(pii))
    ) {
      redacted[key] = "[REDACTED_PII]";
      continue;
    }

    // Recursively redact nested objects
    redacted[key] = redactSensitiveData(value, depth + 1);
  }

  return redacted;
}

/**
 * Format log message with timestamp and level
 */
function formatLog(
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Determine if log should be output based on level and environment
 */
function shouldLog(level: LogLevel): boolean {
  const isDev = process.env.NODE_ENV === "development";
  const logLevel = process.env.LOG_LEVEL || (isDev ? "debug" : "info");

  const levels: LogLevel[] = ["debug", "info", "warn", "error"];
  const currentLevelIndex = levels.indexOf(logLevel as LogLevel);
  const messageLevelIndex = levels.indexOf(level);

  return messageLevelIndex >= currentLevelIndex;
}

/**
 * Production-safe logger
 */
export const logger = {
  /**
   * Debug-level logging (development only by default)
   */
  debug(message: string, context?: LogContext): void {
    if (!shouldLog("debug")) return;

    const safeContext = context
      ? (redactSensitiveData(context) as LogContext)
      : undefined;
    console.log(formatLog("debug", message, safeContext));
  },

  /**
   * Info-level logging
   */
  info(message: string, context?: LogContext): void {
    if (!shouldLog("info")) return;

    const safeContext = context
      ? (redactSensitiveData(context) as LogContext)
      : undefined;
    console.log(formatLog("info", message, safeContext));
  },

  /**
   * Warning-level logging
   */
  warn(message: string, context?: LogContext): void {
    if (!shouldLog("warn")) return;

    const safeContext = context
      ? (redactSensitiveData(context) as LogContext)
      : undefined;
    console.warn(formatLog("warn", message, safeContext));
  },

  /**
   * Error-level logging
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    if (!shouldLog("error")) return;

    const errorContext: LogContext = { ...context };

    if (error instanceof Error) {
      errorContext.errorMessage = error.message;
      errorContext.errorName = error.name;
      // Only include stack trace in development
      if (process.env.NODE_ENV === "development") {
        errorContext.stack = error.stack;
      }
    } else if (error) {
      errorContext.error = redactSensitiveData(error);
    }

    const safeContext = redactSensitiveData(errorContext) as LogContext;
    console.error(formatLog("error", message, safeContext));
  },
};

/**
 * Create a scoped logger with a prefix
 */
export function createScopedLogger(scope: string) {
  return {
    debug: (message: string, context?: LogContext) =>
      logger.debug(`[${scope}] ${message}`, context),
    info: (message: string, context?: LogContext) =>
      logger.info(`[${scope}] ${message}`, context),
    warn: (message: string, context?: LogContext) =>
      logger.warn(`[${scope}] ${message}`, context),
    error: (message: string, error?: unknown, context?: LogContext) =>
      logger.error(`[${scope}] ${message}`, error, context),
  };
}
