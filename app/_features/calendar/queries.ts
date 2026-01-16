"use server";

/**
 * Calendar Feature - Query Functions
 *
 * Data fetching functions for calendar and meetings.
 * These are read-only operations.
 *
 * Usage:
 *   import { getMeetings, getUpcomingMeetings } from '@/app/_features/calendar/queries'
 */

// Meeting queries
export {
  getMeetings,
  type Meeting,
  type MeetingStatus,
  type MeetingType,
} from "@/app/actions/meetings/get-meetings";

export { getUpcomingMeetings } from "@/app/actions/meetings/get-upcoming-meetings";

// Calendar connection queries
export { getCalendarConnection } from "@/app/actions/calendar/google-calendar";
