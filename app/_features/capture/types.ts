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
import type { CaptureIntelligenceOutcome } from "./services/intelligence/capture-intelligence-outcome";
import type { EnrichedMetadata } from "./services/enrichment/types";
import type { KeptOutCause } from "@/app/_features/memory/queries/admission-gate-result";

/** Re-export enriched metadata types for external consumption. */
export type { EnrichedMetadata as EnrichedCaptureMetadata, SuggestedAction } from "./services/enrichment/types";

// ============================================================================
// Database Enum Types (must match SQL schema exactly)
// ============================================================================

/**
 * Source types with curated taxonomy metadata (SOURCE_TAXONOMY).
 *
 * `capture_events.source_type` is TEXT (Sources plan 5.2 — the enum froze at
 * ~40 values while the connector registry seeds providers outside it), so any
 * registry provider key is valid at runtime. This union exists for
 * autocomplete and curated display metadata, not validation.
 */
export type KnownCaptureSourceType =
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
 * Connector/source that produced the capture. Known sources autocomplete;
 * any connector-registry provider key is accepted (loose-autocomplete
 * pattern — `string & {}` keeps the known literals in IDE suggestions).
 */
export type CaptureSourceType = KnownCaptureSourceType | (string & {});

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

// ============================================================================
// UI-Facing Types
// ============================================================================

/**
 * Summary for the Stream (audit log).
 */
export type { CaptureIntelligenceOutcome };

/** A play a capture's signals dispatched (persisted on enriched_metadata). */
export interface StreamPlayDispatch {
  play_slug: string;
  play_name: string;
  play_run_id: string;
  state: string;
  dispatched_at: string;
}

/** A known-entity watch the capture matched at the gate (from gate_result). */
export interface StreamWatchTrigger {
  entity_id: string;
  entity_label: string;
  surface: string;
  match_type: string;
  matched_value: string | null;
}

export interface StreamCaptureSummary {
  capture_id: string;
  workspace_id: string;
  title: string | null;
  capture_type: CaptureEventType;
  source_type: CaptureSourceType;
  origin: CaptureOrigin;
  state: CaptureState;
  overall_confidence: number | null;
  created_at: string;
  processed_at: string | null;
  /** Resolved scan outcome (intelligence model, not legacy routing state). */
  intelligence_outcome: CaptureIntelligenceOutcome;
  finding_id?: string | null;
  /** Deep link to the source message (Gmail thread when available). */
  source_url?: string | null;
  /** Sender label (e.g., "Jane Doe" or "jane@example.com"). */
  from_label?: string | null;
  /** Content preview/snippet. */
  body_preview?: string | null;
  /** Raw extracted data from the adapter (area-specific fields). */
  extracted_data?: Record<string, unknown> | null;
  /** Enriched metadata (signals, linked records, play-fit, actions). */
  enriched_metadata?: EnrichedMetadata | null;
  /** Whether this capture was from initial sync (true) or real-time webhook (false). */
  is_bootstrap?: boolean;
  /** Gate pipeline outcome (noise rows render demoted in the stream). */
  gate_action?: string | null;
  /** Deciding gate's reason ("why not" for dropped/held/noise rows). */
  gate_reason?: string | null;
  /** Rule-caused vs heuristic — drives the kept-out correction action. */
  gate_cause?: KeptOutCause | null;
  /** Plays this capture's signals dispatched (empty when none). */
  plays_dispatched?: StreamPlayDispatch[];
  /** Known-entity watches this capture matched (empty when none). */
  watches_triggered?: StreamWatchTrigger[];
}

/**
 * Stream row status — the UI vocabulary CaptureStreamTab renders.
 */
export type CaptureStatus = "pending" | "auto-routed" | "confirmed" | "dismissed";

/**
 * A capture stream entry as rendered by CaptureStreamTab. Lives here (not in
 * _lib/demo/capture-demo-data) so the live stream has no dependency on the
 * demo-data module; the demo file imports it back for its mock stream.
 */
export type StreamEntry = {
  id: string;
  dayGroup: "Today" | "Yesterday" | "Earlier this week";
  time: string;
  source: CaptureOrigin;
  origin: CaptureSourceType;
  status: CaptureStatus;
  snippet: string;
  routedTo: string;
  trigger?: string;
  sources?: string[];
  learned?: string;
  extractedData?: Record<string, unknown>;
  enrichedMetadata?: {
    signals_matched: string[];
    linked_records: Array<{ surface: string; entity_id: string; entity_label: string; confidence: number }>;
    play_fit: Record<string, { score: number; reason: string; matched_signals?: string[]; threshold?: number; meets_threshold?: boolean }>;
    plays_dispatched?: Array<{ play_slug: string; play_name: string; play_run_id: string; state: string; dispatched_at: string }>;
    watches_triggered?: Array<{ entity_id: string; entity_label: string; surface: string; match_type: string; matched_value: string }>;
  };
  from?: string;
  sourceUrl?: string;
  isBootstrap?: boolean;
};

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
  | "manual"
  /** Fallback bucket for registry providers without curated taxonomy meta. */
  | "other";

// ============================================================================
// Confidence Thresholds
// ============================================================================

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
