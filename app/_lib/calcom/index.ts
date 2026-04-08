/**
 * Cal.com Integration
 *
 * API client and utilities for Cal.com scheduling integration.
 *
 * Usage:
 *   import { validateCalcomApiKey, getEventTypes, getBookingUrl } from '@/app/_lib/calcom'
 */

export {
  validateCalcomApiKey,
  getEventTypes,
  getEventType,
  createEventType,
  getBookingUrl,
  getEmbedConfig,
  type CalcomUser,
  type CalcomEventType,
  type CalcomValidationResult,
} from "./client";
