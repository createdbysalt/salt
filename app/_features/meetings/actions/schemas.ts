/**
 * Meetings Feature - Zod Schemas and ActionResponse helpers
 * Aligned with billing pattern for consistency
 */

import { z } from "zod";
import { safeHttpUrl } from "@/app/_lib/security/safe-url";

// ============================================================================
// Response Types (mirrors billing/actions/schemas.ts)
// ============================================================================

export type SuccessResponse<T = unknown> = {
  ok: true;
  data: T;
};

export type ErrorResponse = {
  ok: false;
  errorCode: string;
  message: string;
};

export type ActionResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

export function success<T>(data: T): SuccessResponse<T> {
  return { ok: true, data };
}

export function error(errorCode: string, message: string): ErrorResponse {
  return { ok: false, errorCode, message };
}

// ============================================================================
// Meeting Schemas
// ============================================================================

export const MeetingTypeSchema = z.enum([
  "discovery",
  "kickoff",
  "check-in",
  "review",
  "presentation",
  "workshop",
  "interview",
  "other",
]);
export type MeetingType = z.infer<typeof MeetingTypeSchema>;

export const LocationTypeSchema = z.enum(["google-meet", "zoom", "phone", "in-person", "custom"]);
export type LocationType = z.infer<typeof LocationTypeSchema>;

export const MeetingStatusSchema = z.enum(["scheduled", "completed", "cancelled", "no-show"]);
export type MeetingStatus = z.infer<typeof MeetingStatusSchema>;

export const VisibilitySchema = z.enum(["internal", "shared_with_client"]);
export type Visibility = z.infer<typeof VisibilitySchema>;

export const AttendeeSchema = z.object({
  name: z.string(),
  role: z.enum(["client", "team"]),
  email: z.string().email().optional(),
});

export const CreateMeetingSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  clientId: z.string().uuid("Valid client required"),
  personId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  meetingType: MeetingTypeSchema,
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  locationType: LocationTypeSchema,
  meetingUrl: z.string().url().optional().or(z.literal("")),
  description: z.string().max(2000).optional(),
  visibility: VisibilitySchema.default("shared_with_client"),
  attendees: z.array(AttendeeSchema).default([]),
});
export type CreateMeetingInput = z.infer<typeof CreateMeetingSchema>;

// ============================================================================
// Content Schemas
// ============================================================================

export const SourceProviderSchema = z.enum([
  "manual",
  "google-calendar",
  "zoom",
  "google-meet",
  "google-drive",
  "fireflies",
  "recall",
  "figma",
  "notion",
  "dropbox",
  "loom",
  "miro",
  "slack",
  "linear",
  "github",
  "other",
]);
export type SourceProvider = z.infer<typeof SourceProviderSchema>;

export const SourceKindSchema = z.enum([
  "calendar_event",
  "recording",
  "transcript",
  "notes_doc",
  "manual_entry",
  "linked_file",
]);
export type SourceKind = z.infer<typeof SourceKindSchema>;

export const AddMeetingSourceSchema = z.object({
  meetingId: z.string().uuid(),
  provider: SourceProviderSchema,
  kind: SourceKindSchema,
  externalId: z.string().optional(),
  sourceUrl: z
    .string()
    .optional()
    .refine((value) => !value || safeHttpUrl(value) !== null, {
      message: "URL must use http or https",
    }),
  workspaceIntegrationId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
  displayName: z.string().max(255).optional(),
});
export type AddMeetingSourceInput = z.infer<typeof AddMeetingSourceSchema>;

/**
 * Artifact-first "Link URL": creates a link Resource + attachment edge
 * instead of a meeting_sources kind='linked_file' row.
 */
export const LinkUrlToMeetingSchema = z.object({
  meetingId: z.string().uuid(),
  url: z
    .string()
    .min(1)
    .refine((value) => safeHttpUrl(value) !== null, {
      message: "URL must use http or https",
    }),
  displayName: z.string().max(255).optional(),
});
export type LinkUrlToMeetingInput = z.infer<typeof LinkUrlToMeetingSchema>;

export const AddMeetingSummarySchema = z.object({
  meetingId: z.string().uuid(),
  content: z.string().min(1, "Summary content required"),
  sourceId: z.string().uuid().optional(),
  generatedBy: z.string().optional(),
});
export type AddMeetingSummaryInput = z.infer<typeof AddMeetingSummarySchema>;

export const AddMeetingDecisionSchema = z.object({
  meetingId: z.string().uuid(),
  text: z.string().min(1, "Decision text required"),
  rationale: z.string().optional(),
  sourceId: z.string().uuid().optional(),
});
export type AddMeetingDecisionInput = z.infer<typeof AddMeetingDecisionSchema>;

export const PrioritySchema = z.enum(["low", "medium", "high"]);
export type Priority = z.infer<typeof PrioritySchema>;

export const AddMeetingActionItemSchema = z.object({
  meetingId: z.string().uuid(),
  text: z.string().min(1, "Action item text required"),
  assignee: z.string().optional(),
  assigneePersonId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
  priority: PrioritySchema.optional(),
  context: z.string().optional(),
  sourceId: z.string().uuid().optional(),
});
export type AddMeetingActionItemInput = z.infer<typeof AddMeetingActionItemSchema>;

export const ToggleMeetingActionItemSchema = z.object({
  actionItemId: z.string().uuid(),
  completed: z.boolean(),
});
export type ToggleMeetingActionItemInput = z.infer<typeof ToggleMeetingActionItemSchema>;

export const AttachMeetingTranscriptSchema = z.object({
  meetingId: z.string().uuid(),
  content: z.string().optional(),
  segments: z
    .array(
      z.object({
        speaker: z.object({
          name: z.string(),
          email: z.string().email().optional(),
        }),
        text: z.string(),
        startTime: z.number(),
        endTime: z.number(),
      }),
    )
    .optional(),
  durationSeconds: z.number().optional(),
  recordingUrl: z.string().url().optional(),
  sourceId: z.string().uuid().optional(),
});
export type AttachMeetingTranscriptInput = z.infer<typeof AttachMeetingTranscriptSchema>;
