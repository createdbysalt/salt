/**
 * Rate Limiting Infrastructure Module
 *
 * In-memory rate limiting for API endpoints and actions.
 *
 * Usage:
 *   import { checkRateLimit, RateLimitPresets, getClientIp } from '@/app/_lib/rate-limit'
 */

export {
  checkRateLimit,
  RateLimitPresets,
  getClientIp,
  createRateLimitKey,
} from "@/app/_lib/rate-limit/rate-limit";

export type { RateLimitConfig, RateLimitResult } from "@/app/_lib/rate-limit/rate-limit";
