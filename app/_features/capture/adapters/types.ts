import type {
  CaptureEventType,
  CaptureSourceType,
} from "@/app/_features/capture/types";
import type { CaptureNoiseInput } from "@/app/_features/capture/services/intelligence/capture-noise";

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
 * (adapter-conformance.test-utils.ts) against golden payload fixtures before
 * it can ship — the generic ingestor only ever sees this contract, so a
 * conformant adapter cannot break the downstream engine.
 */

export interface EnvelopeParticipant {
  email: string | null;
  name: string | null;
  role: "from" | "to" | "cc" | "organizer" | "attendee" | "payer" | "other";
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
}
