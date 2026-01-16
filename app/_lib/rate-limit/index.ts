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
} from "@/libs/rate-limit";

export type { RateLimitConfig, RateLimitResult } from "@/libs/rate-limit";
