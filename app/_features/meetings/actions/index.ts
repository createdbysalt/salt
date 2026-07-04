/**
 * Meetings Feature - Server Actions
 *
 * Usage:
 *   import { createMeetingType, addMeetingDecision } from '@/app/_features/meetings/actions'
 *
 * For types, import directly from schemas to avoid "use server" bundling issues:
 *   import type { MeetingType } from '@/app/_features/meetings/actions/schemas'
 */

// Meeting CRUD
export { updateMeeting, updateMeetingField } from "./update-meeting";

// Meeting content (sources, summaries, decisions, action items, transcripts)
export {
  addMeetingSource,
  addMeetingSummary,
  addMeetingDecision,
  addMeetingActionItem,
  toggleMeetingActionItem,
  attachMeetingTranscript,
} from "./meeting-content";
