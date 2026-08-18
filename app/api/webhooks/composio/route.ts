/**
 * Composio trigger ingress (connector-platform Phase 3.1).
 *
 * ONE webhook URL per Composio project (Webhook Subscriptions API, V3
 * envelope): every trigger instance fans out here. HMAC-verified, then
 * routed by trigger slug to a capture adapter; the envelope goes through
 * the generic ingestor (noise gate → capture_events). Connected-account
 * expiry events mark the integration so the UI can prompt a reconnect.
 *
 * Fast-ack: one payload = one envelope insert — cheap enough to process
 * inline. Missed deliveries are covered by the reconciliation cron (3.6);
 * envelope dedupe keys make replays idempotent.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { verifyComposioWebhookSignature } from "@/app/_lib/composio/webhook-signature";
import { resolveAdapterForTriggerSlug } from "@/app/_features/capture/adapters/trigger-routing";
import { ingestEnvelope } from "@/app/_features/capture/services/ingest-envelope";
import { isFeatureEnabled, FeatureFlag } from "@/app/_lib/feature-flags";
import {
  enrichWebhookPayload,
  hasEnrichmentSpec,
  type EnrichmentResult,
} from "@/app/_lib/composio/webhook-enrichment";
import { captureAlreadyIngested } from "@/app/_features/capture/services/pre-enrichment-gates";
import {
  getCaptureBudgetStatus,
  recordBudgetExceededWarning,
} from "@/app/_features/capture/services/capture-budget";
import { routeResourceWebhook } from "@/app/_lib/resources/live/signal-router";
import { recordComposioTriggerEvent } from "@/app/_lib/usage/record-trigger-usage";

export const maxDuration = 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

interface NormalizedTriggerEvent {
  kind: "trigger" | "connected_account_expired" | "trigger_disabled" | "unknown";
  triggerSlug: string | null;
  connectedAccountId: string | null;
  payload: unknown;
}

/**
 * Non-success ingress outcomes (capture pipeline repair, Phase 0).
 * Persisted to connector_sync_events so "what happened to webhooks for
 * provider X in the last 24h" is a SQL query, not archaeology.
 */
type WebhookFailureOutcome =
  | "ignored"
  | "no_adapter"
  | "no_account"
  | "no_integration"
  | "inactive_integration"
  | "capture_disabled"
  | "malformed_payload"
  | "declined"
  | "dropped"
  | "ingest_error";

async function recordWebhookOutcome(
  admin: ReturnType<typeof createAdminClient>,
  outcome: WebhookFailureOutcome,
  context: {
    triggerSlug: string | null;
    connectedAccountId: string | null;
    payload?: unknown;
    detail?: Record<string, unknown>;
  },
): Promise<void> {
  // Privacy: persist a key sample only — never payload values.
  const payloadKeys = isRecord(context.payload)
    ? Object.keys(context.payload).slice(0, 25)
    : null;
  try {
    await admin.from("connector_sync_events").insert({
      kind: "webhook_outcome",
      subject_slug: context.triggerSlug ?? "unknown_trigger",
      detail: {
        outcome,
        connectedAccountId: context.connectedAccountId,
        ...(payloadKeys ? { payloadKeys } : {}),
        ...context.detail,
      } as never,
    });
  } catch (error) {
    // Observability must never break the ingress ack path.
    console.error("[composio-webhook] failed to record outcome", {
      outcome,
      error,
    });
  }
}

/**
 * Lifecycle deliveries (account expired, trigger disabled) are billed by
 * Composio at delivery like any trigger event, so they meter too — the
 * workspace is resolved from the connection id. Unattributable deliveries
 * (no integration row) skip recording rather than failing the ack.
 */
async function meterLifecycleDelivery(
  admin: ReturnType<typeof createAdminClient>,
  connectedAccountId: string | null,
  triggerSlug: string,
  webhookDeliveryId: string | null,
): Promise<void> {
  if (!connectedAccountId) return;
  try {
    const { data } = await admin
      .from("workspace_integrations")
      .select("workspace_id")
      .eq("composio_connection_id", connectedAccountId)
      .maybeSingle();
    if (!data?.workspace_id) return;
    await recordComposioTriggerEvent({
      workspaceId: data.workspace_id,
      triggerSlug,
      webhookDeliveryId,
    });
  } catch (error) {
    console.error("[composio-webhook] failed to meter lifecycle delivery", {
      triggerSlug,
      error,
    });
  }
}

/** One delivery-health stamp per connection per hour is plenty (3.3). */
const DELIVERY_STAMP_INTERVAL_MS = 60 * 60 * 1000;

async function stampWebhookDelivery(
  admin: ReturnType<typeof createAdminClient>,
  integrationId: string,
  config: unknown,
): Promise<void> {
  const current = isRecord(config) ? config : {};
  const last =
    typeof current.lastWebhookDeliveryAt === "string"
      ? Date.parse(current.lastWebhookDeliveryAt)
      : NaN;
  if (Number.isFinite(last) && Date.now() - last < DELIVERY_STAMP_INTERVAL_MS) {
    return;
  }
  try {
    // Read-modify-write on the config JSONB can theoretically lose a
    // concurrent lastReconciledAt stamp; both are advisory throttle
    // markers, so a lost stamp costs at most one extra backfill.
    await admin
      .from("workspace_integrations")
      .update({
        config: {
          ...current,
          lastWebhookDeliveryAt: new Date().toISOString(),
        } as never,
      })
      .eq("id", integrationId);
  } catch (error) {
    console.error("[composio-webhook] failed to stamp delivery health", error);
  }
}

/** Normalize V1/V2/V3/V4 webhook envelopes to one shape (spellings vary). */
function normalizeWebhookEvent(body: unknown): NormalizedTriggerEvent {
  if (!isRecord(body)) {
    return { kind: "unknown", triggerSlug: null, connectedAccountId: null, payload: null };
  }

  const type = str(body.type) ?? str(body.event) ?? "";
  const data = isRecord(body.data) ? body.data : body;
  const metadata = isRecord(body.metadata) ? body.metadata : (isRecord(data.metadata) ? data.metadata : null);

  // V3 webhook format: metadata.connected_account_id (snake_case, direct field)
  // V4 SDK format: metadata.connectedAccount.id (nested object, camelCase)
  // Legacy formats: data.connectedAccountId or data.connected_account_id
  const connectedAccountId =
    // V3 webhook: body.metadata.connected_account_id (snake_case)
    (metadata ? str(metadata.connected_account_id) : null) ??
    // V4 SDK: body.metadata.connectedAccount.id (nested object)
    (metadata && isRecord(metadata.connectedAccount) ? str(metadata.connectedAccount.id) : null) ??
    // Legacy: data.connectedAccountId or data.connected_account_id
    str(data.connected_account_id) ??
    str(data.connectedAccountId) ??
    (isRecord(data.connectedAccount) ? str(data.connectedAccount.id) : null) ??
    // V2 fallback: data.metadata.connectedAccount.id
    (isRecord(data.metadata) && isRecord(data.metadata.connectedAccount)
      ? str(data.metadata.connectedAccount.id)
      : null);

  if (type.includes("connected_account.expired")) {
    return { kind: "connected_account_expired", triggerSlug: null, connectedAccountId, payload: data };
  }

  if (type.includes("trigger.disabled")) {
    const disabledSlug =
      str(data.trigger_slug) ?? str(data.triggerSlug) ?? str(data.id);
    return {
      kind: "trigger_disabled",
      triggerSlug: disabledSlug,
      connectedAccountId,
      payload: data,
    };
  }

  // V4 format: triggerSlug at root level
  // V3 format: data.triggerSlug
  // V2 format: data.trigger_slug or data.metadata.triggerSlug
  const triggerSlug =
    // V4: body.triggerSlug at root
    str(body.triggerSlug) ??
    // V3: data.triggerSlug
    str(data.trigger_slug) ??
    str(data.triggerSlug) ??
    // V2 fallback: metadata.triggerSlug
    (metadata ? str(metadata.trigger_slug) ?? str(metadata.triggerSlug) : null) ??
    (isRecord(data.metadata) ? str(data.metadata.trigger_slug) ?? str(data.metadata.triggerSlug) : null);

  // V4 format: payload is body.payload or body.originalPayload
  // V3/V2: data.payload
  const payload = isRecord(body.payload) ? body.payload : (isRecord(data.payload) ? data.payload : data);

  if (triggerSlug) {
    return { kind: "trigger", triggerSlug, connectedAccountId, payload };
  }
  return { kind: "unknown", triggerSlug: null, connectedAccountId, payload: data };
}

export async function POST(req: NextRequest) {
  const secret = process.env.COMPOSIO_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[composio-webhook] COMPOSIO_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const body = await req.text();
  const verified = verifyComposioWebhookSignature(
    body,
    {
      webhookId: req.headers.get("webhook-id"),
      webhookTimestamp: req.headers.get("webhook-timestamp"),
      webhookSignature: req.headers.get("webhook-signature"),
    },
    secret,
  );
  if (!verified) {
    console.warn("[composio-webhook] signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = normalizeWebhookEvent(parsed);
  const admin = createAdminClient();

  if (event.kind === "connected_account_expired") {
    if (event.connectedAccountId) {
      await admin
        .from("workspace_integrations")
        .update({
          composio_status: "expired",
          last_error: "Connection expired — reconnect required",
        })
        .eq("composio_connection_id", event.connectedAccountId);
      console.warn(
        `[composio-webhook] connected account expired: ${event.connectedAccountId}`,
      );
      await meterLifecycleDelivery(
        admin,
        event.connectedAccountId,
        "connected_account.expired",
        req.headers.get("webhook-id"),
      );
    }
    return NextResponse.json({ ok: true, handled: "connected_account_expired" });
  }

  if (event.kind === "trigger_disabled") {
    // Composio auto-disabled a trigger (auth expiry, unrefreshable
    // subscription) — that's drift: log it where the review queue and
    // catalog-sync alerts already surface, so ingestion gaps are visible.
    await admin.from("connector_sync_events").insert({
      kind: "sync_failed",
      subject_slug: event.triggerSlug ?? "unknown_trigger",
      detail: {
        stage: "trigger_disabled_by_composio",
        connectedAccountId: event.connectedAccountId,
      } as never,
    });
    // Constant format string — slug/account are attacker-influenced input.
    console.warn("[composio-webhook] trigger disabled by Composio", {
      triggerSlug: event.triggerSlug,
      connectedAccountId: event.connectedAccountId,
    });
    await meterLifecycleDelivery(
      admin,
      event.connectedAccountId,
      event.triggerSlug ?? "trigger.disabled",
      req.headers.get("webhook-id"),
    );
    return NextResponse.json({ ok: true, handled: "trigger_disabled" });
  }

  if (event.kind !== "trigger" || !event.triggerSlug) {
    // Unknown event kinds ack with 200 — retries won't make them known.
    console.warn("[composio-webhook] unrecognized event shape — acked");
    await recordWebhookOutcome(admin, "ignored", {
      triggerSlug: event.triggerSlug,
      connectedAccountId: event.connectedAccountId,
      payload: event.payload,
    });
    return NextResponse.json({ ok: true, handled: "ignored" });
  }

  // Check if this is a resource-bound trigger (Live mode)
  const eventData = isRecord(parsed) ? parsed : {};
  const metadata = isRecord(eventData.metadata) ? eventData.metadata : {};
  const triggerConfig = isRecord(metadata.triggerConfig) ? metadata.triggerConfig : {};

  if (triggerConfig.resourceId) {
    const resourceResult = await routeResourceWebhook({
      triggerName: event.triggerSlug,
      triggerId: str(metadata.triggerId) ?? "",
      payload: event.payload as Record<string, unknown>,
      metadata: {
        resourceId: str(triggerConfig.resourceId) ?? undefined,
        resourceType: str(triggerConfig.resourceType) ?? undefined,
      },
    });

    // Billed at delivery like any trigger event — meter once the router
    // resolved the workspace from the resource.
    if (resourceResult.workspaceId) {
      await recordComposioTriggerEvent({
        workspaceId: resourceResult.workspaceId,
        triggerSlug: event.triggerSlug,
        webhookDeliveryId: req.headers.get("webhook-id"),
      });
    }

    return NextResponse.json({
      ok: true,
      handled: "resource_signal",
      success: resourceResult.success,
      signalKey: resourceResult.signal?.key,
    });
  }

  // DB-first routing (Phase 5): connector_trigger_types → catalog category →
  // category adapter, with the code-built map as fallback.
  const adapter = await resolveAdapterForTriggerSlug(event.triggerSlug);
  if (!adapter) {
    await recordWebhookOutcome(admin, "no_adapter", {
      triggerSlug: event.triggerSlug,
      connectedAccountId: event.connectedAccountId,
      payload: event.payload,
    });
    return NextResponse.json({ ok: true, handled: "no_adapter" });
  }

  if (!event.connectedAccountId) {
    console.warn("[composio-webhook] trigger without a connected account id — acked", {
      triggerSlug: event.triggerSlug,
    });
    await recordWebhookOutcome(admin, "no_account", {
      triggerSlug: event.triggerSlug,
      connectedAccountId: null,
      payload: event.payload,
    });
    return NextResponse.json({ ok: true, handled: "no_account" });
  }

  const { data: integration } = await admin
    .from("workspace_integrations")
    .select("id, workspace_id, is_active, capture_enabled, config")
    .eq("composio_connection_id", event.connectedAccountId)
    .maybeSingle();

  if (integration) {
    // Composio bills trigger events at DELIVERY — this cost is real even when
    // the integration is inactive or capture-disabled below, so record before
    // any early return. Non-fatal and idempotent on the delivery id.
    await recordComposioTriggerEvent({
      workspaceId: integration.workspace_id,
      triggerSlug: event.triggerSlug,
      webhookDeliveryId: req.headers.get("webhook-id"),
    });
  }

  if (!integration?.is_active) {
    // Distinguish "no row" (orphaned trigger firing at a stale connection)
    // from "row exists but deactivated" — different repairs.
    await recordWebhookOutcome(
      admin,
      integration ? "inactive_integration" : "no_integration",
      {
        triggerSlug: event.triggerSlug,
        connectedAccountId: event.connectedAccountId,
      },
    );
    return NextResponse.json({ ok: true, handled: "inactive_integration" });
  }
  if (!integration.capture_enabled) {
    await recordWebhookOutcome(admin, "capture_disabled", {
      triggerSlug: event.triggerSlug,
      connectedAccountId: event.connectedAccountId,
    });
    return NextResponse.json({ ok: true, handled: "capture_disabled" });
  }

  // Stamp delivery health (Sources plan 3.3): the reconciliation cron skips
  // its repair backfill for connections with proven delivery in the window.
  // Throttled to one write per connection per hour — delivery volume can be
  // hundreds/day, the stamp only needs to be fresh.
  await stampWebhookDelivery(admin, integration.id, integration.config);

  // Normalize BEFORE enrichment (Phase 6): pointer-only payloads (Outlook
  // sends just a message ID) used to pay for a Composio fetch before any
  // gate ran. Cheap gates — adapter decline, dedupe, daily budget — run on
  // the minimal envelope first; only survivors pay for hydration.
  let envelope;
  try {
    envelope = adapter.normalize(event.payload);
  } catch (error) {
    console.error("[composio-webhook] adapter threw on payload", {
      sourceType: adapter.sourceType,
      triggerSlug: event.triggerSlug,
      error,
    });
    await recordWebhookOutcome(admin, "malformed_payload", {
      triggerSlug: event.triggerSlug,
      connectedAccountId: event.connectedAccountId,
      payload: event.payload,
      detail: {
        sourceType: adapter.sourceType,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return NextResponse.json({ ok: true, handled: "malformed_payload" });
  }

  if (!envelope) {
    // The adapter recognized the slug but couldn't build an envelope —
    // historically the silent killer (payload shape drift). The key sample
    // shows what the payload actually looked like.
    await recordWebhookOutcome(admin, "declined", {
      triggerSlug: event.triggerSlug,
      connectedAccountId: event.connectedAccountId,
      payload: event.payload,
      detail: { sourceType: adapter.sourceType, enriched: false },
    });
    return NextResponse.json({ ok: true, handled: "declined" });
  }

  let enrichment: EnrichmentResult = { enriched: false, payload: event.payload };

  const extracted = envelope.extracted as Record<string, unknown> | null;
  const needsHydration =
    extracted?.needs_hydration === true &&
    hasEnrichmentSpec(event.triggerSlug);

  if (needsHydration) {
    // Cheap gate 1: replayed/re-tried delivery of an already-ingested
    // message — ack without paying for a second fetch. Lifecycle updates
    // (event rescheduled/cancelled) must NOT short-circuit here: the point
    // of an update trigger is to hydrate and update the stored row.
    const duplicate =
      envelope.lifecycle === "update"
        ? false
        : await captureAlreadyIngested(
            admin,
            integration.workspace_id,
            envelope.sourceType,
            envelope.externalId,
          );
    if (duplicate) {
      return NextResponse.json({
        ok: true,
        handled: "trigger",
        outcome: "duplicate",
        enriched: false,
      });
    }

    // Cheap gate 2: over the daily capture budget, skip the paid fetch —
    // ingestEnvelope stamps the minimal envelope as noise.
    const budget = await getCaptureBudgetStatus(integration.workspace_id, admin);
    if (budget.exceeded) {
      await recordBudgetExceededWarning(integration.workspace_id, budget, admin);
    } else {
      // Enrich minimal payloads (e.g., Outlook sends only message ID)
      enrichment = await enrichWebhookPayload(
        event.triggerSlug,
        event.payload,
        event.connectedAccountId,
        integration.workspace_id,
      );

      if (enrichment.enriched) {
        let enrichedEnvelope;
        try {
          enrichedEnvelope = adapter.normalize(enrichment.payload);
        } catch (error) {
          console.error("[composio-webhook] adapter threw on enriched payload", {
            sourceType: adapter.sourceType,
            triggerSlug: event.triggerSlug,
            error,
          });
          await recordWebhookOutcome(admin, "malformed_payload", {
            triggerSlug: event.triggerSlug,
            connectedAccountId: event.connectedAccountId,
            payload: enrichment.payload,
            detail: {
              sourceType: adapter.sourceType,
              enriched: true,
              error: error instanceof Error ? error.message : String(error),
            },
          });
          return NextResponse.json({ ok: true, handled: "malformed_payload" });
        }
        if (!enrichedEnvelope) {
          await recordWebhookOutcome(admin, "declined", {
            triggerSlug: event.triggerSlug,
            connectedAccountId: event.connectedAccountId,
            payload: enrichment.payload,
            detail: { sourceType: adapter.sourceType, enriched: true },
          });
          return NextResponse.json({ ok: true, handled: "declined" });
        }
        envelope = enrichedEnvelope;
      }
    }
  }

  const config = integration.config as Record<string, unknown> | null;
  const userEmail = (config?.userEmail as string) ?? null;

  const result = await ingestEnvelope(
    integration.workspace_id,
    integration.id,
    envelope,
    {
      useGatePipeline: isFeatureEnabled(FeatureFlag.CAPTURE_GATE_PIPELINE),
      userEmail,
      // Serverless: unawaited enrichment dies when the instance freezes
      // after the response. Composio retries on slow acks are harmless —
      // the envelope dedupe key makes replays idempotent.
      awaitEnrichment: true,
      // Lane 1: webhook arrival is the real-time path — a genuine inquiry
      // from an unknown sender earns immediate admission via the intent read.
      coldIntentRead: true,
    },
  );

  if (result.outcome === "dropped" || result.outcome === "error") {
    await recordWebhookOutcome(
      admin,
      result.outcome === "dropped" ? "dropped" : "ingest_error",
      {
        triggerSlug: event.triggerSlug,
        connectedAccountId: event.connectedAccountId,
        detail: {
          sourceType: adapter.sourceType,
          ...(result.noiseReason ? { reason: result.noiseReason } : {}),
          ...(result.error ? { error: result.error } : {}),
        },
      },
    );
  }

  return NextResponse.json({
    ok: true,
    handled: "trigger",
    outcome: result.outcome,
    enriched: enrichment.enriched,
  });
}
