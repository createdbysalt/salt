/**
 * Meetings Feature - Server Actions
 *
 * Usage:
 *   import { createMeetingType } from '@/app/_features/meetings/actions'
 */

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

export type { ConferencingApp } from "./meeting-types";
