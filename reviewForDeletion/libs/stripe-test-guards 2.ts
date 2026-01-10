/**
 * Stripe Test Mode Safety Guards
 * 
 * Ensures that tests and development operations only use Stripe test mode keys.
 * Prevents accidental use of live mode keys in non-production environments.
 */

/**
 * Check if a Stripe key is a test mode key
 */
export function isStripeTestKey(key: string): boolean {
  return key.startsWith("sk_test_") || key.startsWith("pk_test_");
}

/**
 * Check if a Stripe key is a live mode key
 */
export function isStripeLiveKey(key: string): boolean {
  return key.startsWith("sk_live_") || key.startsWith("pk_live_");
}

/**
 * Validate that Stripe keys are in test mode
 * Throws an error if live keys are detected in non-production environments
 */
export function validateStripeTestMode(): void {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const isProduction = process.env.NODE_ENV === "production";
  
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  
  if (!publishableKey) {
    throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set");
  }
  
  // In non-production environments, require test keys
  if (!isProduction) {
    if (!isStripeTestKey(secretKey)) {
      throw new Error(
        "SECURITY: Live Stripe secret key detected in non-production environment. " +
        "Use test keys (sk_test_...) for development and testing."
      );
    }
    
    if (!isStripeTestKey(publishableKey)) {
      throw new Error(
        "SECURITY: Live Stripe publishable key detected in non-production environment. " +
        "Use test keys (pk_test_...) for development and testing."
      );
    }
  }
  
  // Log warning if test keys are used in production
  if (isProduction && isStripeTestKey(secretKey)) {
    console.warn(
      "WARNING: Stripe test keys detected in production environment. " +
      "This should only be used for staging/demo purposes."
    );
  }
}

/**
 * Assert test mode for billing tests
 * Use this at the start of E2E tests to ensure they're running against test mode
 */
export function assertStripeTestModeForTests(): void {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  if (!secretKey || !isStripeTestKey(secretKey)) {
    throw new Error(
      "Billing tests require Stripe test mode keys. " +
      "Set STRIPE_SECRET_KEY to a test key (sk_test_...)."
    );
  }
  
  if (!publishableKey || !isStripeTestKey(publishableKey)) {
    throw new Error(
      "Billing tests require Stripe test mode keys. " +
      "Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to a test key (pk_test_...)."
    );
  }
}

/**
 * Sanitize Stripe error for safe logging
 * Removes sensitive information from error messages
 */
export function sanitizeStripeError(error: any): {
  type: string;
  code: string;
  message: string;
  requestId?: string;
} {
  // Extract safe fields from Stripe error
  return {
    type: error.type || "unknown",
    code: error.code || "unknown",
    message: error.message || "An error occurred",
    requestId: error.requestId || error.request_id,
  };
}

/**
 * Safe error logger for production
 * Logs errors without exposing sensitive data to client
 */
export function logBillingError(
  context: string,
  error: any,
  metadata?: Record<string, any>
): void {
  const sanitizedError = sanitizeStripeError(error);
  
  console.error(`[Billing Error] ${context}:`, {
    ...sanitizedError,
    metadata: metadata || {},
    timestamp: new Date().toISOString(),
  });
  
  // In production, send to error tracking service (e.g., Sentry)
  if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
    // TODO: Integrate with Sentry or similar service
    // Sentry.captureException(error, { contexts: { billing: metadata } });
  }
}

/**
 * Redact sensitive data from logs
 */
export function redactSensitiveData(data: any): any {
  if (typeof data !== "object" || data === null) {
    return data;
  }
  
  const sensitiveKeys = [
    "card",
    "bank_account",
    "ssn",
    "tax_id",
    "routing_number",
    "account_number",
    "secret",
    "password",
    "token",
  ];
  
  const redacted = { ...data };
  
  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      redacted[key] = "[REDACTED]";
    } else if (typeof redacted[key] === "object") {
      redacted[key] = redactSensitiveData(redacted[key]);
    }
  }
  
  return redacted;
}



