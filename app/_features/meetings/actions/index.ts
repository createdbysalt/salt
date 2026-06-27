/**
 * Meetings Feature - Server Actions
 *
 * Usage:
 *   import { createMeetingType, addMeetingDecision } from '@/app/_features/meetings/actions'
 *
 * For types, import directly from schemas to avoid "use server" bundling issues:
 *   import type { MeetingType } from '@/app/_features/meetings/actions/schemas'
 */

// Meeting types (Cal.com templates)
export {
  createMeetingType,
  updateMeetingType,
  deleteMeetingType,
  seedDefaultMeetingTypes,
  getMeetingTypes,
  syncAllMeetingTypesToCalcom,
  resyncMeetingType,
  getAvailableConferencingApps,
} from "./meeting-types";

// Meeting CRUD
export { createMeeting } from "./create-meeting";
export { updateMeeting } from "./update-meeting";
export { cancelMeeting } from "./cancel-meeting";
export { completeMeeting } from "./complete-meeting";

// Meeting content (sources, summaries, decisions, action items, transcripts)
export {
  addMeetingSource,
  addMeetingSummary,
  addMeetingDecision,
  addMeetingActionItem,
  toggleMeetingActionItem,
  attachMeetingTranscript,
} from "./meeting-content";
