/**
 * Rate Limiting Utilities
 * 
 * Simple in-memory rate limiting for protection against abuse.
 * For production, consider Redis-based rate limiting for multi-instance deployments.
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

const store: RateLimitStore = {};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetAt < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  maxRequests: number;
  
  /**
   * Time window in seconds
   */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given key (e.g., IP address, user ID, token hash)
 * 
 * @param key - Unique identifier for the rate limit bucket
 * @param config - Rate limit configuration
 * @returns Rate limit result with allowed status and remaining count
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  
  // Get or initialize bucket
  let bucket = store[key];
  
  if (!bucket || bucket.resetAt < now) {
    // Create new bucket
    bucket = {
      count: 0,
      resetAt: now + windowMs,
    };
    store[key] = bucket;
  }
  
  // Increment count
  bucket.count++;
  
  // Check if limit exceeded
  const allowed = bucket.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - bucket.count);
  
  return {
    allowed,
    remaining,
    resetAt: bucket.resetAt,
  };
}

/**
 * Preset rate limit configurations for common use cases
 */
export const RateLimitPresets = {
  /**
   * Strict: 10 requests per minute
   * Use for sensitive operations like password resets, token generation
   */
  STRICT: { maxRequests: 10, windowSeconds: 60 },
  
  /**
   * Moderate: 60 requests per minute
   * Use for API endpoints, invoice lookups, payment actions
   */
  MODERATE: { maxRequests: 60, windowSeconds: 60 },
  
  /**
   * Lenient: 300 requests per minute
   * Use for general page loads, authenticated user actions
   */
  LENIENT: { maxRequests: 300, windowSeconds: 60 },
  
  /**
   * Webhook: 1000 requests per minute
   * Use for webhook endpoints (Stripe sends batches)
   */
  WEBHOOK: { maxRequests: 1000, windowSeconds: 60 },
} as const;

/**
 * Get client IP address from request headers
 * Supports various proxy/CDN headers
 */
export function getClientIp(request: Request): string {
  // Check common proxy/CDN headers
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Fallback (will be same for all users behind a proxy)
  return "unknown";
}

/**
 * Create a rate limit key combining multiple identifiers
 * Example: "invoice-lookup:192.168.1.1" or "payment:user_123"
 */
export function createRateLimitKey(prefix: string, ...identifiers: string[]): string {
  return `${prefix}:${identifiers.join(":")}`;
}




