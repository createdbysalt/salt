/**
 * Intelligence Feature - Server Actions
 *
 * This module re-exports actions from the centralized intelligence module.
 * Handles intelligence feed, library, and queue operations.
 *
 * Usage:
 *   import { getIntelligenceFeed, saveToLibrary } from '@/app/_features/intelligence/actions'
 */

// Feed actions
export { getIntelligenceFeed } from "@/app/actions/intelligence/get-intelligence-feed";

// Status actions
export {
  updateEventStatus,
  dismissEvent,
  archiveEvent,
  markEventViewed,
  markEventActioned,
} from "@/app/actions/intelligence/update-event-status";

// Library actions
export {
  saveToLibrary,
  removeFromLibrary,
  getSavedIntelligence,
  updateEventTags,
  getAllTags,
} from "@/app/actions/intelligence/library-actions";

// Queue actions
export {
  getIntelligenceQueue,
  createQueueJob,
  cancelQueueJob,
  retryQueueJob,
} from "@/app/actions/intelligence/queue-actions";
