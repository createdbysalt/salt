/**
 * Webhook payload enrichment (captures V2).
 *
 * Some providers (e.g., Outlook) only send minimal webhook payloads with just
 * an ID. This service detects minimal payloads and fetches full data using
 * Composio tools before the capture adapter processes the event.
 *
 * The enrichment registry maps trigger slugs to their corresponding "fetch"
 * tools — a single lookup table, not per-adapter code.
 */

import "server-only";

import { executeComposioAction } from "./actions";
import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";

interface EnrichmentSpec {
  toolSlug: string;
  extractId: (_payload: unknown) => string | null;
  buildInput: (_id: string) => Record<string, unknown>;
  extractResult: (_result: unknown) => unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Registry of trigger slugs that need enrichment.
 *
 * Maps triggerSlug → specification for how to fetch full data.
 * Only triggers whose webhooks don't include full content need entries here.
 */
const ENRICHMENT_REGISTRY: Record<string, EnrichmentSpec> = {
  // Outlook email triggers only send message ID.
  // OUTLOOK_OUTLOOK_GET_MESSAGE replaces OUTLOOK_GET_MESSAGE, which 404s on
  // both metadata and execute endpoints as of 2026-08-06 (Composio toolkit
  // rework) — enrichment was silently failing and captures fell back to
  // minimal payloads.
  OUTLOOK_MESSAGE_TRIGGER: {
    toolSlug: COMPOSIO_TOOL_SLUGS.OUTLOOK_OUTLOOK_GET_MESSAGE,
    extractId: (payload) => {
      if (!isRecord(payload)) return null;
      return (
        str(payload.messageId) ??
        str(payload.message_id) ??
        str(payload.id) ??
        null
      );
    },
    buildInput: (messageId) => ({ message_id: messageId, user_id: "me" }),
    extractResult: unwrapOutlookMessage,
  },
  OUTLOOK_SENT_MESSAGE_TRIGGER: {
    toolSlug: COMPOSIO_TOOL_SLUGS.OUTLOOK_OUTLOOK_GET_MESSAGE,
    extractId: (payload) => {
      if (!isRecord(payload)) return null;
      return (
        str(payload.messageId) ??
        str(payload.message_id) ??
        str(payload.id) ??
        null
      );
    },
    buildInput: (messageId) => ({ message_id: messageId, user_id: "me" }),
    extractResult: unwrapOutlookMessage,
  },
};

/**
 * The gate (executeComposioAction) already unwraps Composio's outer `data`
 * wrapper, so the usual shape here is { response_data: {...} } — but stay
 * tolerant of the fully-wrapped and fully-unwrapped shapes too.
 */
function unwrapOutlookMessage(result: unknown): unknown {
  if (!isRecord(result)) return result;
  if (isRecord(result.response_data)) {
    return result.response_data;
  }
  if (isRecord(result.data) && isRecord(result.data.response_data)) {
    return result.data.response_data;
  }
  if (isRecord(result.data)) {
    return result.data;
  }
  return result;
}

/**
 * Check if a payload needs enrichment (minimal data only).
 *
 * A payload is considered "minimal" if it lacks essential content fields
 * like subject, body, or sender information.
 */
function isMinimalPayload(payload: unknown): boolean {
  if (!isRecord(payload)) return true;

  // If we have subject OR from/sender, it's not minimal
  const hasSubject = str(payload.subject) !== null;
  const hasFrom =
    str(payload.from) !== null ||
    str(payload.sender) !== null ||
    (isRecord(payload.from) &&
      isRecord(payload.from.emailAddress) &&
      str(payload.from.emailAddress.address) !== null);
  const hasBody =
    str(payload.body) !== null ||
    str(payload.bodyPreview) !== null ||
    str(payload.snippet) !== null;

  // Minimal = has none of the content fields
  return !hasSubject && !hasFrom && !hasBody;
}

export interface EnrichmentResult {
  enriched: boolean;
  payload: unknown;
  error?: string;
}

/**
 * Enrich a webhook payload if needed.
 *
 * Checks if the trigger slug needs enrichment and if the payload is minimal.
 * If both conditions are met, fetches full data using the appropriate
 * Composio tool.
 *
 * @param triggerSlug - The webhook trigger slug
 * @param payload - The original webhook payload
 * @param connectedAccountId - The Composio connected account ID
 * @param workspaceId - The Salt workspace ID (= Composio entity ID)
 * @returns Enriched payload or original if enrichment not needed/failed
 */
export async function enrichWebhookPayload(
  triggerSlug: string,
  payload: unknown,
  connectedAccountId: string,
  workspaceId: string,
): Promise<EnrichmentResult> {
  const spec = ENRICHMENT_REGISTRY[triggerSlug];

  // No enrichment spec for this trigger → return original
  if (!spec) {
    return { enriched: false, payload };
  }

  // Payload already has content → no enrichment needed
  if (!isMinimalPayload(payload)) {
    return { enriched: false, payload };
  }

  // Extract the ID we need to fetch
  const messageId = spec.extractId(payload);
  if (!messageId) {
    console.warn("[webhook-enrichment] Could not extract ID from payload:", {
      triggerSlug,
      payload,
    });
    return { enriched: false, payload, error: "no_id" };
  }

  // workspaceId = Composio entity ID (set when connection was created)
  try {
    console.warn("[webhook-enrichment] Enriching payload:", {
      triggerSlug,
      messageId,
      toolSlug: spec.toolSlug,
    });

    const input = spec.buildInput(messageId);

    // Through the single gate: canSpend admission, read-class rate limit,
    // classification policy, and the audit log all apply to this spend.
    // skipAuthCheck: webhooks carry no user session — tenancy was already
    // established upstream by signature verification + the connected-account
    // lookup that produced workspaceId. unattended: read-class tools only.
    const result = await executeComposioAction<Record<string, unknown>, unknown>(
      spec.toolSlug,
      input,
      connectedAccountId,
      workspaceId, // Composio entity = workspace ID
      {
        skipAuthCheck: true,
        unattended: true,
        workspaceId,
      },
    );

    const enrichedPayload = spec.extractResult(result);

    console.warn("[webhook-enrichment] Enrichment successful:", {
      triggerSlug,
      messageId,
      hasSubject: isRecord(enrichedPayload) && "subject" in enrichedPayload,
    });

    return { enriched: true, payload: enrichedPayload };
  } catch (error) {
    console.error("[webhook-enrichment] Enrichment failed:", {
      triggerSlug,
      messageId,
      error: error instanceof Error ? error.message : error,
    });
    // Return original payload on failure — better to have minimal data
    // than no capture at all
    return {
      enriched: false,
      payload,
      error: error instanceof Error ? error.message : "unknown",
    };
  }
}

/**
 * Check if a trigger slug has an enrichment spec registered.
 */
export function hasEnrichmentSpec(triggerSlug: string): boolean {
  return triggerSlug in ENRICHMENT_REGISTRY;
}
