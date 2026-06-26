/**
 * Booking Feature - Type Definitions
 *
 * Types for Cal.com booking integration and meeting scheduling.
 * Aligns with client_meetings and meeting_templates database tables.
 */

// =============================================================================
// MEETING TYPES
// =============================================================================

/** Meeting type categories matching client_meetings.meeting_type constraint */
export type MeetingType = "discovery" | "check-in" | "review" | "kickoff" | "other";

/** Location types matching client_meetings.location_type constraint */
export type LocationType =
  | "google-meet"
  | "zoom"
  | "phone"
  | "in-person"
  | "custom";

/** Meeting status matching client_meetings.status constraint */
export type MeetingStatus = "scheduled" | "completed" | "cancelled" | "no-show";

/** Meeting visibility matching client_meetings.visibility constraint */
export type MeetingVisibility = "internal" | "shared_with_client";

/** Transcript status matching client_meetings.transcript_status constraint */
export type TranscriptStatus =
  | "none"
  | "recording"
  | "processing"
  | "completed"
  | "failed";

// =============================================================================
// BOOKING EVENT
// =============================================================================

/** Attendee structure for meetings */
export interface MeetingAttendee {
  name: string;
  role?: string;
  email: string;
}

/**
 * Booking event representing a scheduled meeting.
 * Maps to client_meetings table structure.
 */
export interface BookingEvent {
  id: string;
  workspaceId: string;
  clientId: string;
  projectId?: string | null;

  // Core meeting info
  title: string;
  description?: string | null;
  meetingType?: MeetingType | null;

  // Time
  startTime: Date;
  endTime: Date;

  // Location
  locationType?: LocationType | null;
  meetingUrl?: string | null;

  // Status & visibility
  status: MeetingStatus;
  visibility: MeetingVisibility;

  // Cal.com integration
  calBookingId?: string | null;
  calEventUid?: string | null;

  // Metadata
  notes?: string | null;
  attendees: MeetingAttendee[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// MEETING TEMPLATES
// =============================================================================

/**
 * Meeting template for reusable meeting presets.
 * Maps to meeting_templates table structure.
 */
export interface MeetingTemplate {
  id: string;
  workspaceId: string;
  userId: string;

  // Template info
  name: string;
  durationMinutes: number;
  meetingType?: MeetingType | null;
  defaultLocationType?: LocationType | null;
  defaultDescription?: string | null;
  visibilityDefault: MeetingVisibility;

  // Metadata
  isDefault: boolean;

  // Timestamps
  createdAt: Date;
}

// =============================================================================
// CAL.COM WEBHOOK PAYLOADS
// =============================================================================

/** Cal.com webhook event types */
export type CalWebhookEventType =
  | "BOOKING_CREATED"
  | "BOOKING_RESCHEDULED"
  | "BOOKING_CANCELLED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_REJECTED";

/** Cal.com attendee in webhook payload */
export interface CalAttendee {
  email: string;
  name: string;
  timeZone: string;
  language: {
    locale: string;
  };
}

/** Cal.com organizer in webhook payload */
export interface CalOrganizer {
  id: number;
  email: string;
  name: string;
  timeZone: string;
}

/** Cal.com booking metadata for client/studio linking */
export interface CalBookingMetadata {
  clientId?: string;
  workspaceId?: string;
  projectId?: string;
  meetingType?: MeetingType;
  [key: string]: string | undefined;
}

/**
 * Cal.com webhook payload structure.
 * Sent by Cal.com for booking lifecycle events.
 */
export interface CalWebhookPayload {
  triggerEvent: CalWebhookEventType;
  createdAt: string;
  payload: {
    id: number;
    uid: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    status: string;
    location?: string;
    meetingUrl?: string;
    attendees: CalAttendee[];
    organizer: CalOrganizer;
    metadata?: CalBookingMetadata;
    eventType?: {
      id: number;
      slug: string;
      title: string;
    };
  };
}

// =============================================================================
// ACTION INPUT TYPES
// =============================================================================

/** Input for creating a booking from Cal.com webhook */
export interface CreateBookingInput {
  calBookingId: string;
  calEventUid: string;
  workspaceId: string;
  clientId: string;
  projectId?: string;
  title: string;
  description?: string;
  meetingType?: MeetingType;
  startTime: Date;
  endTime: Date;
  locationType?: LocationType;
  meetingUrl?: string;
  attendees: MeetingAttendee[];
}

/** Input for rescheduling a booking */
export interface RescheduleBookingInput {
  calBookingId: string;
  newStartTime: Date;
  newEndTime: Date;
}

/** Input for cancelling a booking */
export interface CancelBookingInput {
  calBookingId: string;
  reason?: string;
}
