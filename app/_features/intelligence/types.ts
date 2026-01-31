/**
 * Intelligence Feature - Types
 *
 * Re-exports types from the intelligence actions module.
 *
 * Usage:
 *   import type { IntelligenceEvent, QueueJobWithRelations } from '@/app/_features/intelligence/types'
 */

export type {
  EventType,
  EventUrgency,
  EventStatus,
  EventSource,
  IntelligenceEvent,
  IntelligenceEventWithRelations,
  QueueJobStatus,
  QueueJobType,
  IntelligenceQueueJob,
  QueueJobWithRelations,
  FeedFilters,
  LibraryFilters,
  ActionResult,
} from "@/app/actions/intelligence/types";

export type {
  GetIntelligenceFeedInput,
  GetIntelligenceFeedData,
  GetIntelligenceFeedResponse,
} from "@/app/actions/intelligence/get-intelligence-feed";

export type {
  UpdateEventStatusInput,
  UpdateEventStatusResponse,
} from "@/app/actions/intelligence/update-event-status";

export type {
  SaveToLibraryInput,
  SaveToLibraryResponse,
  GetSavedIntelligenceInput,
  GetSavedIntelligenceData,
  GetSavedIntelligenceResponse,
  RemoveFromLibraryResponse,
  UpdateEventTagsInput,
  UpdateEventTagsResponse,
  GetAllTagsResponse,
} from "@/app/actions/intelligence/library-actions";

export type {
  GetIntelligenceQueueInput,
  GetIntelligenceQueueData,
  GetIntelligenceQueueResponse,
  CreateQueueJobInput,
  CreateQueueJobResponse,
  CancelQueueJobResponse,
  RetryQueueJobResponse,
} from "@/app/actions/intelligence/queue-actions";
