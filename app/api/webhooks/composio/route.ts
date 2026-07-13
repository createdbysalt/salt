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
import { adapterForTriggerSlug } from "@/app/_features/capture/adapters/registry";
import { ingestEnvelope } from "@/app/_features/capture/services/ingest-envelope";
import { isFeatureEnabled, FeatureFlag } from "@/app/_lib/feature-flags";

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

/** Normalize V1/V2/V3 webhook envelopes to one shape (spellings vary). */
function normalizeWebhookEvent(body: unknown): NormalizedTriggerEvent {
  if (!isRecord(body)) {
    return { kind: "unknown", triggerSlug: null, connectedAccountId: null, payload: null };
  }

  const type = str(body.type) ?? str(body.event) ?? "";
  const data = isRecord(body.data) ? body.data : body;

  const connectedAccountId =
    str(data.connected_account_id) ??
    str(data.connectedAccountId) ??
    (isRecord(data.connectedAccount) ? str(data.connectedAccount.id) : null) ??
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

  const triggerSlug =
    str(data.trigger_slug) ??
    str(data.triggerSlug) ??
    (isRecord(data.metadata) ? str(data.metadata.trigger_slug) ?? str(data.metadata.triggerSlug) : null);

  const payload = isRecord(data.payload) ? data.payload : data;

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
    return NextResponse.json({ ok: true, handled: "trigger_disabled" });
  }

  if (event.kind !== "trigger" || !event.triggerSlug) {
    // Unknown event kinds ack with 200 — retries won't make them known.
    console.warn("[composio-webhook] unrecognized event shape — acked");
    return NextResponse.json({ ok: true, handled: "ignored" });
  }

  const adapter = adapterForTriggerSlug(event.triggerSlug);
  if (!adapter) {
    return NextResponse.json({ ok: true, handled: "no_adapter" });
  }

  if (!event.connectedAccountId) {
    console.warn("[composio-webhook] trigger without a connected account id — acked", {
      triggerSlug: event.triggerSlug,
    });
    return NextResponse.json({ ok: true, handled: "no_account" });
  }

  const { data: integration } = await admin
    .from("workspace_integrations")
    .select("id, workspace_id, is_active, capture_enabled, config")
    .eq("composio_connection_id", event.connectedAccountId)
    .maybeSingle();

  if (!integration?.is_active) {
    return NextResponse.json({ ok: true, handled: "inactive_integration" });
  }
  if (!integration.capture_enabled) {
    return NextResponse.json({ ok: true, handled: "capture_disabled" });
  }

  let envelope;
  try {
    envelope = adapter.normalize(event.payload);
  } catch (error) {
    console.error("[composio-webhook] adapter threw on payload", {
      sourceType: adapter.sourceType,
      triggerSlug: event.triggerSlug,
      error,
    });
    return NextResponse.json({ ok: true, handled: "malformed_payload" });
  }

  if (!envelope) {
    return NextResponse.json({ ok: true, handled: "declined" });
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
    },
  );

  return NextResponse.json({ ok: true, handled: "trigger", outcome: result.outcome });
}
