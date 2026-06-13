/**
 * Capture Types — Universal intake layer for all business context
 *
 * These types align with the database schema in:
 * supabase/migrations/20260612220000_create_capture_events.sql
 *
 * Design decisions (from 2026-06-12 founder interview):
 * 1. One capture can route to multiple Memory surfaces
 * 2. Each surface has its own confidence score
 * 3. High-confidence routes automatically; low-confidence goes to Pending
 * 4. Stream is audit log; Pending is action surface
 */

import type { LucideIcon } from "lucide-react";

// ============================================================================
// Database Enum Types (must match SQL schema exactly)
// ============================================================================

/**
 * Connector/source that produced the capture.
 * Maps to capture_source_type enum in database.
 */
export type CaptureSourceType =
  // Communication
  | "gmail"
  | "outlook"
  | "slack"
  | "whatsapp"
  | "discord"
  | "telegram"
  // Calendar & Scheduling
  | "googlecalendar"
  | "outlook_calendar"
  | "calendly"
  | "calcom"
  // Meetings
  | "fireflies"
  | "granola"
  | "zoom"
  // Files
  | "googledrive"
  | "googledocs"
  | "googlesheets"
  | "googleslides"
  | "onedrive"
  | "dropbox"
  // Payments & Finance
  | "stripe"
  | "quickbooks"
  | "square"
  | "mercury"
  // CRM
  | "hubspot"
  | "salesforce"
  | "pipedrive"
  // Productivity
  | "notion"
  | "linear"
  | "asana"
  | "clickup"
  | "trello"
  | "airtable"
  // Social
  | "instagram"
  | "linkedin"
  | "facebook"
  | "youtube"
  // Marketing
  | "mailchimp"
  | "kit"
  // Manual entry
  | "manual"
  | "ask_salt";

/**
 * What kind of thing was captured.
 * Maps to capture_event_type enum in database.
 */
export type CaptureEventType =
  | "message"
  | "thread"
  | "meeting"
  | "transcript"
  | "file"
  | "contact"
  | "payment"
  | "task"
  | "note"
  | "post"
  | "event"
  | "other";

/**
 * How the capture entered Salt.
 * Maps to capture_origin enum in database.
 */
export type CaptureOrigin = "added" | "found";

/**
 * Capture processing state.
 * Maps to capture_state enum in database.
 */
export type CaptureState = "pending" | "routed" | "dismissed";

/**
 * Target Memory surfaces.
 * Maps to memory_surface enum in database.
 */
export type MemorySurface =
  | "people"
  | "orgs"
  | "work"
  | "files"
  | "conversations"
  | "meetings"
  | "teams"
  | "me";

/**
 * Routing decision status.
 * Maps to routing_status enum in database.
 */
export type RoutingStatus =
  | "auto_routed"
  | "pending"
  | "approved"
  | "dismissed"
  | "corrected";

/**
 * What action was taken on the target entity.
 * Maps to routing_action enum in database.
 */
export type RoutingAction = "created" | "updated" | "linked";

// ============================================================================
// Database Row Types
// ============================================================================

/**
 * A capture event as stored in the database.
 */
export interface CaptureEvent {
  id: string;
  workspace_id: string;
  source_type: CaptureSourceType;
  source_connection_id: string | null;
  source_external_id: string | null;
  capture_type: CaptureEventType;
  origin: CaptureOrigin;
  title: string | null;
  raw_payload: Record<string, unknown>;
  extracted_data: ExtractedData;
  state: CaptureState;
  overall_confidence: number | null;
  is_bootstrap: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

/**
 * A routing decision as stored in the database.
 */
export interface CaptureRoutingDecision {
  id: string;
  capture_event_id: string;
  target_surface: MemorySurface;
  target_entity_id: string | null;
  target_entity_type: string | null;
  action: RoutingAction | null;
  confidence: number;
  status: RoutingStatus;
  reason: string | null;
  evidence: EvidenceItem[];
  routed_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  original_target_entity_id: string | null;
  correction_notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Extracted Data Structures (varies by capture_type)
// ============================================================================

/**
 * Union type for extracted_data based on capture_type.
 */
export type ExtractedData =
  | MessageExtractedData
  | ContactExtractedData
  | MeetingExtractedData
  | FileExtractedData
  | PaymentExtractedData
  | TaskExtractedData
  | GenericExtractedData;

export interface MessageExtractedData {
  type: "message" | "thread";
  subject?: string;
  body_preview?: string;
  sender?: {
    name?: string;
    email?: string;
  };
  recipients?: Array<{
    name?: string;
    email?: string;
    type: "to" | "cc" | "bcc";
  }>;
  thread_id?: string;
  message_count?: number;
  attachments?: Array<{
    name: string;
    mime_type: string;
    size?: number;
  }>;
  labels?: string[];
  is_unread?: boolean;
  sentiment?: "positive" | "neutral" | "negative";
  intent?: string; // e.g., "follow_up_request", "proposal_acceptance"
}

export interface ContactExtractedData {
  type: "contact";
  name?: string;
  email?: string;
  phone?: string;
  title?: string;
  organization?: string;
  relationship_signals?: string[];
  last_contact?: string;
}

export interface MeetingExtractedData {
  type: "meeting" | "transcript";
  title?: string;
  start_time?: string;
  end_time?: string;
  attendees?: Array<{
    name?: string;
    email?: string;
    response_status?: "accepted" | "declined" | "tentative" | "needs_action";
  }>;
  location?: string;
  meeting_url?: string;
  transcript_summary?: string;
  action_items?: string[];
  decisions?: string[];
}

export interface FileExtractedData {
  type: "file";
  name?: string;
  mime_type?: string;
  size?: number;
  folder_path?: string;
  owner?: {
    name?: string;
    email?: string;
  };
  modified_by?: {
    name?: string;
    email?: string;
  };
  modified_at?: string;
}

export interface PaymentExtractedData {
  type: "payment";
  amount?: number;
  currency?: string;
  status?: "draft" | "open" | "paid" | "void" | "uncollectible";
  invoice_number?: string;
  customer_name?: string;
  customer_email?: string;
  due_date?: string;
  paid_at?: string;
  description?: string;
}

export interface TaskExtractedData {
  type: "task";
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: {
    name?: string;
    email?: string;
  };
  due_date?: string;
  project?: string;
}

export interface GenericExtractedData {
  type: "note" | "post" | "event" | "other";
  title?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Evidence item for routing decisions.
 */
export interface EvidenceItem {
  type: "email_match" | "name_match" | "context_match" | "recency" | "frequency" | "llm_inference";
  source: string;
  value: string;
  weight: number;
}

// ============================================================================
// UI-Facing Types
// ============================================================================

/**
 * A capture with its routing decisions, ready for UI display.
 */
export interface CaptureWithRouting extends CaptureEvent {
  routing_decisions: CaptureRoutingDecision[];
  pending_decisions_count: number;
}

/**
 * Summary for the Pending queue.
 */
export interface PendingCaptureSummary {
  capture_id: string;
  title: string | null;
  capture_type: CaptureEventType;
  source_type: CaptureSourceType;
  origin: CaptureOrigin;
  overall_confidence: number | null;
  created_at: string;
  routing_count: number;
}

/**
 * Summary for the Stream (audit log).
 */
export interface StreamCaptureSummary {
  capture_id: string;
  title: string | null;
  capture_type: CaptureEventType;
  source_type: CaptureSourceType;
  origin: CaptureOrigin;
  state: CaptureState;
  overall_confidence: number | null;
  created_at: string;
  processed_at: string | null;
}

// ============================================================================
// Source Taxonomy — Maps connectors to their typical capture types
// ============================================================================

export interface SourceMeta {
  label: string;
  icon: LucideIcon;
  category: SourceCategory;
  /** What capture types this source typically produces */
  produces: CaptureEventType[];
  /** Which Memory surfaces this source typically routes to */
  routes_to: MemorySurface[];
}

export type SourceCategory =
  | "communication"
  | "calendar"
  | "meetings"
  | "files"
  | "payments"
  | "crm"
  | "productivity"
  | "social"
  | "marketing"
  | "manual";

// ============================================================================
// Confidence Thresholds
// ============================================================================

/**
 * Confidence thresholds for routing decisions.
 * These can be adjusted per-workspace as corrections accumulate.
 */
export const CONFIDENCE_THRESHOLDS = {
  /** Above this: auto-route without user review */
  AUTO_ROUTE: 85,
  /** Above this but below AUTO_ROUTE: auto-route with "Salt inferred" flag */
  INFERRED: 50,
  /** Below INFERRED: goes to Pending queue */
} as const;

/**
 * Bootstrap limits for first-run experience.
 */
export const BOOTSTRAP_LIMITS = {
  /** Maximum people to surface on first scan */
  MAX_PEOPLE: 15,
  /** Days to look back for high-signal contacts */
  LOOKBACK_DAYS: 90,
  /** Minimum interactions to be considered high-signal */
  MIN_INTERACTIONS: 3,
} as const;

// ============================================================================
// Action Input Types
// ============================================================================

/**
 * Input for creating a manual capture.
 */
export interface CreateCaptureInput {
  title?: string;
  content: string;
  capture_type: CaptureEventType;
  /** Routing hints from user */
  suggested_surfaces?: MemorySurface[];
  /** Entity links from user */
  entity_links?: Array<{
    surface: MemorySurface;
    entity_id: string;
  }>;
}

/**
 * Input for approving/correcting a routing decision.
 */
export interface ReviewRoutingInput {
  routing_id: string;
  action: "approve" | "dismiss" | "correct";
  /** When correcting, the new target entity */
  new_entity_id?: string;
  /** Optional notes about the correction */
  notes?: string;
}

/**
 * Input for bulk actions on captures.
 */
export interface BulkCaptureActionInput {
  capture_ids: string[];
  action: "approve_all" | "dismiss_all";
}
