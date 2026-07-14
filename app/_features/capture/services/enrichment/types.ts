/**
 * Capture Enrichment Types
 *
 * Types for the enriched_metadata JSONB column in capture_events.
 * Covers all 8 Memory surfaces for linking and all 9 capture areas.
 */

/** Memory surfaces that captures can link to */
export type MemorySurface =
  | "people"
  | "orgs"
  | "work"
  | "billing"
  | "files"
  | "meetings"
  | "conversations"
  | "me";

/** How a record was matched to a capture */
export type MatchType =
  | "email"
  | "domain"
  | "invoice_number"
  | "file_name"
  | "meeting_title"
  | "keyword"
  | "existing_link"
  | "manual";

/** A Memory record linked to a capture */
export interface LinkedRecord {
  surface: MemorySurface;
  entity_id: string;
  entity_label: string;
  match_type: MatchType;
  confidence: number;
}

/** Attachment metadata */
export interface AttachmentMeta {
  name: string;
  contentType?: string;
  size?: number;
}

/** Sender context for classification */
export interface SenderContext {
  email: string | null;
  name: string | null;
  classification: "client" | "vendor" | "saas" | "marketing" | "unknown";
  confidence: number;
  relationship_strength: "strong" | "moderate" | "weak" | "new";
}

/** Recipients breakdown */
export interface RecipientsContext {
  to: string[];
  cc: string[];
  bcc: string[];
}

/** Thread context */
export interface ThreadContext {
  is_reply: boolean;
  thread_id: string | null;
  message_count?: number;
  in_reply_to?: string;
}

/** Play fit score with reasoning */
export interface PlayFitScore {
  score: number;
  reason: string;
  matched_signals?: string[];
  /** Playbook's required threshold (from trigger.confidence_threshold) */
  threshold?: number;
  /** Whether score meets the playbook's threshold */
  meets_threshold?: boolean;
}

/** Result of a play that was actually dispatched/queued */
export interface PlayDispatchResult {
  play_slug: string;
  play_name: string;
  play_run_id: string;
  state: "queued" | "running" | "completed" | "failed";
  dispatched_at: string;
}

/** Result of a watch expression match */
export interface WatchTriggerResult {
  entity_id: string;
  entity_label: string;
  surface: "people" | "orgs";
  match_type: "email" | "domain" | "phone";
  matched_value: string;
}

/** Suggested action types */
export type SuggestedActionType =
  | "route_to_play"
  | "link_to_memory"
  | "memory_update"
  | "ask_salt"
  | "queue_enrichment"
  | "dismiss_noise";

/** Base suggested action */
interface BaseSuggestedAction {
  action: SuggestedActionType;
  confidence: number;
  reason: string;
}

/** Route to a play */
export interface RouteToPlayAction extends BaseSuggestedAction {
  action: "route_to_play";
  play_slug: string;
}

/** Link to a Memory record */
export interface LinkToMemoryAction extends BaseSuggestedAction {
  action: "link_to_memory";
  surface: MemorySurface;
  entity_id?: string;
  entity_label?: string;
}

/** Update a Memory field */
export interface MemoryUpdateAction extends BaseSuggestedAction {
  action: "memory_update";
  surface: MemorySurface;
  entity_id: string;
  field: string;
  value: unknown;
}

/** Ask Salt about this capture */
export interface AskSaltAction extends BaseSuggestedAction {
  action: "ask_salt";
  prompt_hint: string;
}

/** Queue more enrichment */
export interface QueueEnrichmentAction extends BaseSuggestedAction {
  action: "queue_enrichment";
  source_type: string;
}

/** Dismiss as noise */
export interface DismissNoiseAction extends BaseSuggestedAction {
  action: "dismiss_noise";
}

/** Union of all suggested actions */
export type SuggestedAction =
  | RouteToPlayAction
  | LinkToMemoryAction
  | MemoryUpdateAction
  | AskSaltAction
  | QueueEnrichmentAction
  | DismissNoiseAction;

/**
 * The enriched_metadata JSONB structure stored on capture_events.
 * Computed at ingest time and updated as more context becomes available.
 */
export interface EnrichedMetadata {
  /** Sender classification and relationship context */
  sender?: SenderContext;

  /** Recipients (TO, CC, BCC) */
  recipients?: RecipientsContext;

  /** Thread/conversation context */
  thread?: ThreadContext;

  /** Attachment metadata */
  attachments?: AttachmentMeta[];

  /** Signals that matched this capture */
  signals_matched: string[];

  /** Memory records this capture is linked to */
  linked_records: LinkedRecord[];

  /** Play fit scores by play slug (all matches, including below-threshold) */
  play_fit: Record<string, PlayFitScore>;

  /** Plays that were actually dispatched/queued (met threshold + adopted + active) */
  plays_dispatched: PlayDispatchResult[];

  /** Watch expressions that matched this capture (linked to watched entities) */
  watches_triggered: WatchTriggerResult[];

  /** Suggested actions ranked by confidence */
  suggested_actions: SuggestedAction[];

  /** Deep link to view in source app */
  deep_link: string | null;

  /** Record capture decision from three-tier criteria engine */
  record_capture_decision?: RecordCaptureDecisionMeta;

  /** Email intelligence classification (emails only) */
  email_classification?: EmailClassificationMeta;

  /** When enrichment was last computed */
  enriched_at: string;
}

/** Email classification metadata for the intelligence layer */
export interface EmailClassificationMeta {
  /** Email type: personal, transactional, promotional, automated, unknown */
  type: string;
  type_confidence: number;

  /** Business category: action_required, money_moves, opportunities, updates, subscribed, noise */
  category: string;
  category_confidence: number;

  /** Priority score 0-100 */
  priority_score: number;
  /** Priority tier: urgent, important, normal, low, noise */
  priority_tier: string;

  /** Urgency level: none, low, medium, high, critical */
  urgency_level: string;
  /** Keywords that triggered urgency */
  urgency_markers: string[];

  /** Recommended triage action: surface_now, batch_digest, silent_archive */
  triage_action: string;

  /** Classification signals emitted */
  signals: string[];
}

/** Record capture decision for CREATE/WATCH/NOTHING tier */
export interface RecordCaptureDecisionMeta {
  tier: "create" | "watch" | "nothing";
  confidence?: number;
  reason: string;
  watch_target?: string;
  watch_type?: "email" | "domain";
  initial_signals?: string[];
}

/** Empty/default enriched metadata */
export const EMPTY_ENRICHED_METADATA: EnrichedMetadata = {
  signals_matched: [],
  linked_records: [],
  play_fit: {},
  plays_dispatched: [],
  watches_triggered: [],
  suggested_actions: [],
  deep_link: null,
  enriched_at: new Date().toISOString(),
};
