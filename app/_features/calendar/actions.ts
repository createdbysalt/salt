
/**
 * Calendar Feature - Server Actions
 *
 * This module re-exports calendar and meeting actions.
 * Handles Google Calendar integration and meeting management.
 *
 * Usage:
 *   import { createMeeting, getMeetings } from '@/app/_features/calendar/actions'
 */

// Google Calendar integration (Composio)
export {
  getCalendarConnection,
  fetchCalendarEvents,
  createEvent,
  updateEvent,
  disconnectCalendar,
} from "@/app/actions/calendar/google-calendar";

// Meeting CRUD operations
export { createMeeting } from "@/app/actions/meetings/create-meeting";
export { updateMeeting } from "@/app/actions/meetings/update-meeting";
export { cancelMeeting } from "@/app/actions/meetings/cancel-meeting";
export { completeMeeting } from "@/app/actions/meetings/complete-meeting";

// Meeting queries
export {
  getMeetings,
  type Meeting,
  type MeetingStatus,
  type MeetingType,
} from "@/app/actions/meetings/get-meetings";
export { getUpcomingMeetings } from "@/app/actions/meetings/get-upcoming-meetings";

// Meeting change requests
export { requestMeetingChange } from "@/app/actions/meetings/request-meeting-change";
