import type {
  CaptureEnvelope,
  ConnectorRuleEntityType,
  FeedbackEntity,
} from "./types";
import { getCategoryForConnector } from "@/app/_lib/composio/enrichment/registry";
import { getAdapterForCategory } from "./categories";

/**
 * Shared entity-extraction helpers (Connector Rules & Learning, Phase 2).
 *
 * The category adapters own the semantics; these are the small pure readers
 * they share. Everything reads from the NORMALIZED envelope so extraction
 * works identically on a live payload and on a thin envelope rebuilt from a
 * stored capture_events row (Kept Out corrections, Phase 4).
 */

export function emailEntity(
  envelope: CaptureEnvelope,
  extractedKey: string,
  type: ConnectorRuleEntityType,
): FeedbackEntity | null {
  const value = envelope.extracted[extractedKey];
  if (typeof value !== "string" || !value.includes("@")) return null;
  return { type, key: value.trim().toLowerCase() };
}

export function firstParticipantEmailEntity(
  envelope: CaptureEnvelope,
  type: ConnectorRuleEntityType,
): FeedbackEntity | null {
  const participant = envelope.participants.find((p) => p.email);
  if (!participant?.email) return null;
  return { type, key: participant.email.trim().toLowerCase() };
}

export function verbatimEntity(
  envelope: CaptureEnvelope,
  extractedKey: string,
  type: ConnectorRuleEntityType,
): FeedbackEntity | null {
  const value = envelope.extracted[extractedKey];
  if (typeof value !== "string" || value.trim().length === 0) return null;
  return { type, key: value.trim() };
}

/**
 * Dispatch: resolve the envelope's category adapter and run its extraction.
 * This is THE entry point — gate (P2), corrections (P4), and profiles (P6)
 * all consume the entity through here; nothing re-derives per feature.
 *
 * Returns null when the provider has no category mapping or the envelope has
 * no attributable entity — callers treat null as "rules don't apply".
 */
export async function extractFeedbackEntityForEnvelope(
  envelope: CaptureEnvelope,
): Promise<FeedbackEntity | null> {
  const category = await getCategoryForConnector(envelope.sourceType);
  if (!category) return null;
  const adapter = getAdapterForCategory(category, envelope.sourceType);
  return adapter.extractFeedbackEntity(envelope);
}
