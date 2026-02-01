/**
 * Booking Feature - Server Actions
 *
 * This module will contain server actions for Cal.com booking integration.
 * Actions for creating, rescheduling, and cancelling bookings from webhooks.
 *
 * Usage:
 *   import { createBookingFromWebhook } from '@/app/_features/booking/actions'
 */

"use server";

// Types exported for use in other modules
export type {
  BookingEvent,
  MeetingType,
  MeetingTemplate,
  CalWebhookPayload,
  CalWebhookEventType,
  CreateBookingInput,
  RescheduleBookingInput,
  CancelBookingInput,
} from "./types";

// Action implementations will be added in future stories
