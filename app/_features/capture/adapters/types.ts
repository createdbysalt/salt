import type {
  CaptureEventType,
  CaptureSourceType,
} from "@/app/_features/capture/types";
import type { CaptureNoiseInput } from "@/app/_features/capture/services/intelligence/capture-noise";
import type { PersonSignals } from "@/app/_features/capture/services/system-plays/person-signals";

/**
 * Capture adapter contract (connector-platform Phase 3.2).
 *
 * The ingestion model is "capture the envelope, extract on demand": adapters
 * normalize a provider payload (Composio trigger event or fetched item) into
 * a thin CaptureEnvelope — participants, timestamps, title, ids, structured
 * fields, and a POINTER back to the source item. Full content is hydrated
 * later via Composio fetch tools for items that pass the noise gate; Salt
 * never mirrors the user's account.
 *
 * Every adapter must pass the conformance harness
 * (adapter-conformance.ts) against golden payload fixtures before
 * it can ship — the generic ingestor only ever sees this contract, so a
 * conformant adapter cannot break the downstream engine.
 */

export interface EnvelopeParticipant {
  email: string | null;
  name: string | null;
  role: "from" | "to" | "cc" | "organizer" | "attendee" | "payer" | "other";
}

/**
 * Rule-entity vocabulary (Connector Rules & Learning, Phase 2). Category-
 * defined, NOT an email enum: each category declares which entity kinds its
 * captures can be ruled on. `connector_rules.entity_type` carries these
 * values; email's blocklist legacy maps domain/email/sender_pattern onto
 * domain/sender_email/sender_pattern.
 */
export type ConnectorRuleEntityType =
  // email
  | "sender_email"
  | "domain"
  | "sender_pattern"
  | "subject_pattern"
  // communication
  | "channel"
  | "author"
  | "keyword"
  // calendar
  | "organizer"
  | "attendee"
  // calendar, meetings
  | "title_pattern"
  // billing
  | "customer"
  // storage, documents
  | "owner"
  | "name_pattern"
  // crm
  | "contact"
  // meetings
  | "host"
  | "participant"
  // project_management
  | "assignee"
  | "project";

/**
 * The entity a capture is attributable to, for rules/corrections/profiles.
 * Derived ONCE by the category adapter (`CaptureAdapter.extractFeedbackEntity`)
 * and consumed by the gate (rules check), Kept Out corrections, and learned
 * profiles — no per-feature re-derivation.
 */
export interface FeedbackEntity {
  type: ConnectorRuleEntityType;
  /** Normalized entity key (lowercased where email-like; verbatim for ids). */
  key: string;
}

export interface CaptureEnvelope {
  /** capture_events.source_type — must match the adapter's sourceType. */
  sourceType: CaptureSourceType;
  /** capture_events.capture_type. */
  captureType: CaptureEventType;
  /**
   * Stable per-item id from the provider (Gmail message id, Stripe event id).
   * Dedupe key: unique (workspace_id, source_type, source_external_id).
   */
  externalId: string;
  /** Short human title (subject, event name, invoice number). */
  title: string | null;
  /** ISO timestamp of the source item, when the provider gives one. */
  occurredAt: string | null;
  /** People on the item — the signal layer and resolvers read these. */
  participants: EnvelopeParticipant[];
  /** Provider-side grouping id (email thread, calendar series), if any. */
  threadId: string | null;
  /**
   * Structured extraction for classification/routing — the same shape the
   * existing pipeline stores in capture_events.extracted_data.
   */
  extracted: Record<string, unknown>;
  /**
   * BOUNDED raw payload persisted to capture_events.raw_payload. Envelope
   * retention stance: keep it thin (headers/ids, no full bodies) — deep
   * content is re-fetched on demand via the source pointer.
   */
  raw: Record<string, unknown>;
  /** Noise-gate input; null = this capture type bypasses the gate. */
  noise: CaptureNoiseInput | null;
}

export interface SignalDerivationContext {
  /** Connected account owner's address — derivation excludes self. */
  userEmail: string | null;
}

export interface CaptureAdapter {
  /** capture_events.source_type this adapter produces. */
  sourceType: CaptureSourceType;
  /** Composio toolkit slug (= registry provider key for these sources). */
  toolkit: string;
  /** Composio trigger slugs this adapter consumes at the webhook ingress. */
  triggerSlugs: readonly string[];
  /**
   * Provider payload → envelope. Return null for payloads this adapter
   * recognizes but should not ingest (wrong event subtype, missing id).
   * Throwing means the payload was malformed — the ingress logs and drops it.
   */
  normalize(payload: unknown): CaptureEnvelope | null;
  /**
   * Entity extraction (Connector Rules & Learning, Phase 2): the single
   * derivation of `feedbackEntity { type, key }` from a normalized envelope,
   * per the category coverage matrix (email → sender, calendar → organizer,
   * billing → customer, …). Consumed by the rules gate, Kept Out
   * corrections, and learned profiles. Returns null when the envelope has
   * no attributable entity (e.g. meetings payloads carry no host).
   *
   * Implementations must read from the normalized envelope only (extracted
   * fields + participants) so the same method works on a thin envelope
   * reconstructed from a stored capture_events row.
   */
  extractFeedbackEntity(envelope: CaptureEnvelope): FeedbackEntity | null;
  /**
   * Signal derivation (Phase 5.1): fold a batch of ingested envelopes into
   * per-contact profile signals (email → PersonSignals). Only keys this
   * source can attest — the conformance harness enforces the registry set.
   * Consumed by resolvePerson's admission/fill machinery.
   */
  deriveSignals?(
    envelopes: readonly CaptureEnvelope[],
    context: SignalDerivationContext,
  ): Map<string, PersonSignals>;
}
