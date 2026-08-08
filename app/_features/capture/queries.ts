import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";
import type {
  StreamCaptureSummary,
  StreamPlayDispatch,
  StreamWatchTrigger,
  CaptureState,
  CaptureEventType,
  CaptureOrigin,
  CaptureSourceType,
} from "./types";
import type { FindingEvidence } from "./types/intelligence-findings";
import {
  readIntelligenceMeta,
  resolveCaptureIntelligenceOutcome,
  categoryFromEnrichment,
  type CaptureFindingLink,
} from "./services/intelligence/capture-intelligence-outcome";
import { resolveCaptureSourceUrl } from "./utils/capture-source-url";
import { getTierCapacity } from "@/app/_lib/usage/tiers";
import { nextDiscoveryDueAt } from "./services/discovery-cadence";

/** Shape of the gate_result JSONB subset the stream reads. */
interface StreamGateResult {
  gateResults?: {
    knownEntity?: {
      target?: {
        surface?: string;
        entityId?: string;
        matchType?: string;
      };
      reason?: string;
    } | null;
  };
}

function readKnownEntityWatch(
  gateResult: unknown,
): Omit<StreamWatchTrigger, "entity_label"> | null {
  const target = (gateResult as StreamGateResult | null)?.gateResults?.knownEntity?.target;
  if (!target?.entityId || !target.surface) return null;
  const reason = (gateResult as StreamGateResult | null)?.gateResults?.knownEntity?.reason;
  // Reason format from the known-entity gate: "Watch expression match: email = x@y.com"
  const matchedValue = reason?.includes(" = ") ? reason.split(" = ").pop() ?? null : null;
  return {
    entity_id: target.entityId,
    surface: target.surface,
    match_type: target.matchType ?? "unknown",
    matched_value: matchedValue,
  };
}

function readPlaysDispatched(enrichedMetadata: unknown): StreamPlayDispatch[] {
  const raw = (enrichedMetadata as { plays_dispatched?: unknown } | null)?.plays_dispatched;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (d): d is StreamPlayDispatch =>
      typeof d === "object" && d !== null &&
      typeof (d as StreamPlayDispatch).play_run_id === "string" &&
      typeof (d as StreamPlayDispatch).play_name === "string",
  );
}

/**
 * Resolve display labels for watch-matched entities (people + organizations)
 * in two batched queries — never one per row.
 */
async function getWatchEntityLabels(
  watches: Array<Omit<StreamWatchTrigger, "entity_label">>,
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  const personIds = [...new Set(watches.filter((w) => w.surface === "people").map((w) => w.entity_id))];
  const orgIds = [...new Set(watches.filter((w) => w.surface === "organizations").map((w) => w.entity_id))];
  if (personIds.length === 0 && orgIds.length === 0) return labels;

  const supabase = await createClient();

  if (personIds.length > 0) {
    const { data } = await supabase
      .from("people")
      .select("id, name, email")
      .in("id", personIds);
    for (const row of data ?? []) {
      labels.set(row.id, row.name ?? row.email ?? "Unknown person");
    }
  }

  if (orgIds.length > 0) {
    const { data } = await supabase
      .from("organizations")
      .select("id, name, domain")
      .in("id", orgIds);
    for (const row of data ?? []) {
      labels.set(row.id, row.name ?? row.domain ?? "Unknown organization");
    }
  }

  return labels;
}

function buildFindingLinkMap(
  rows: Array<{
    id: string;
    finding_type: string;
    state: string;
    evidence: unknown;
  }> | null,
): Map<string, CaptureFindingLink> {
  const map = new Map<string, CaptureFindingLink>();
  for (const row of rows ?? []) {
    if (row.state !== "needs_you" && row.state !== "auto_handled") {
      continue;
    }
    const evidence = row.evidence as FindingEvidence | null;
    const sourceId = evidence?.source_id;
    if (!sourceId || map.has(sourceId)) continue;
    map.set(sourceId, {
      finding_id: row.id,
      finding_type: row.finding_type,
      finding_state: row.state,
    });
  }
  return map;
}

/**
 * Resolve finding links for specific capture IDs (scoped in SQL — no workspace-wide scan).
 */
async function getFindingLinksByCaptureIds(
  workspaceId: string,
  captureIds: string[],
): Promise<Map<string, CaptureFindingLink>> {
  if (captureIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();
  const uniqueIds = [...new Set(captureIds)];
  const scopedRows: Array<{
    id: string;
    finding_type: string;
    state: string;
    evidence: unknown;
  }> = [];

  const chunkSize = 40;
  for (let index = 0; index < uniqueIds.length; index += chunkSize) {
    const chunk = uniqueIds.slice(index, index + chunkSize);
    const orFilter = chunk.map((id) => `evidence->>source_id.eq.${id}`).join(",");

    const { data, error } = await supabase
      .from("intelligence_findings")
      .select("id, finding_type, state, evidence")
      .eq("workspace_id", workspaceId)
      .in("state", ["needs_you", "auto_handled"])
      .or(orFilter);

    if (error) {
      console.error("[capture-queries] getFindingLinksByCaptureIds error:", error);
      continue;
    }

    scopedRows.push(...(data ?? []));
  }

  return buildFindingLinkMap(scopedRows);
}

const STREAM_SELECT = `
  id,
  workspace_id,
  title,
  capture_type,
  source_type,
  source_external_id,
  origin,
  state,
  overall_confidence,
  created_at,
  processed_at,
  extracted_data,
  enriched_metadata,
  gate_action,
  gate_result,
  is_bootstrap
`;

/** Deciding gate's reason — the "why not" for dropped/held/noise rows. */
function extractGateReason(gateResult: unknown): string | null {
  if (!gateResult || typeof gateResult !== "object") return null;
  const results = (gateResult as { gateResults?: Record<string, { reason?: unknown }> })
    .gateResults;
  if (!results) return null;
  for (const key of ["preIngest", "blocklist", "admission"] as const) {
    const reason = results[key]?.reason;
    if (typeof reason === "string" && reason) return reason;
  }
  return null;
}

type StreamRow = {
  id: string;
  workspace_id: string;
  title: string | null;
  capture_type: string;
  source_type: string;
  source_external_id: string | null;
  origin: string;
  state: string;
  overall_confidence: number | null;
  created_at: string;
  processed_at: string | null;
  extracted_data: unknown;
  enriched_metadata: unknown;
  gate_action: string | null;
  gate_result: unknown;
  is_bootstrap: boolean | null;
};

async function mapStreamRows(
  workspaceId: string,
  rows: StreamRow[],
): Promise<StreamCaptureSummary[]> {
  const captureIds = rows.map((row) => row.id);
  const findingLinks = await getFindingLinksByCaptureIds(workspaceId, captureIds);

  // Watch matches (known-entity gate) live in gate_result; resolve their
  // entity labels in two batched lookups instead of one query per row.
  const watchByRow = new Map(
    rows
      .map((row) => [row.id, readKnownEntityWatch(row.gate_result)] as const)
      .filter(
        (entry): entry is [string, Omit<StreamWatchTrigger, "entity_label">] =>
          entry[1] !== null,
      ),
  );
  const watchLabels = await getWatchEntityLabels([...watchByRow.values()]);

  return rows.map((row) => {
    const findingLink = findingLinks.get(row.id) ?? null;
    const intelligenceMeta = readIntelligenceMeta(row.extracted_data);
    const intelligence_outcome = resolveCaptureIntelligenceOutcome({
      intelligenceMeta,
      findingLink,
      routingState: row.state as CaptureState,
    });

    const watch = watchByRow.get(row.id);
    const watchesTriggered: StreamWatchTrigger[] = watch
      ? [
          {
            ...watch,
            entity_label:
              watchLabels.get(watch.entity_id) ?? watch.matched_value ?? "Watched record",
          },
        ]
      : [];

    // Extract sender and preview from extracted_data
    const extracted = row.extracted_data as {
      from_name?: string;
      from_email?: string;
      body_text?: string;
      snippet?: string;
    } | null;
    const fromLabel = extracted?.from_name?.trim() || extracted?.from_email || null;
    const bodyPreview = extracted?.snippet || extracted?.body_text?.slice(0, 200) || null;

    return {
      capture_id: row.id,
      workspace_id: row.workspace_id,
      title: row.title,
      capture_type: row.capture_type as CaptureEventType,
      source_type: row.source_type,
      origin: row.origin as CaptureOrigin,
      state: row.state as CaptureState,
      overall_confidence: row.overall_confidence,
      created_at: row.created_at,
      processed_at: row.processed_at,
      intelligence_outcome,
      finding_id:
        findingLink?.finding_id ?? intelligenceMeta?.finding_id ?? null,
      source_url:
        // Prefer deep_link from enriched_metadata (populated during enrichment)
        (row.enriched_metadata as { deep_link?: string | null } | null)?.deep_link ??
        // Fall back to resolved URL (e.g., Gmail thread link)
        resolveCaptureSourceUrl({
          sourceType: row.source_type,
          sourceExternalId: row.source_external_id,
          extractedData: row.extracted_data,
        }),
      from_label: fromLabel,
      body_preview: bodyPreview,
      extracted_data: row.extracted_data as Record<string, unknown> | null,
      enriched_metadata:
        (row.enriched_metadata as StreamCaptureSummary["enriched_metadata"]) ?? null,
      is_bootstrap: row.is_bootstrap ?? false,
      gate_action: row.gate_action ?? null,
      gate_reason: extractGateReason(row.gate_result),
      plays_dispatched: readPlaysDispatched(row.enriched_metadata),
      watches_triggered: watchesTriggered,
    };
  });
}

export const getCaptureStream = cache(async (
  workspaceId: string,
  options: {
    limit?: number;
    offset?: number;
    /** Cursor: only return captures created strictly before this ISO timestamp. */
    before?: string;
    state?: CaptureState;
    origin?: "added" | "found";
    includeDropped?: boolean;
  } = {}
): Promise<StreamCaptureSummary[]> => {
  const { limit = 50, offset = 0, before, state, origin, includeDropped = false } = options;
  const supabase = await createClient();

  let query = supabase
    .from("capture_events")
    .select(STREAM_SELECT)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (before) {
    query = query.lt("created_at", before);
  }
  if (state) {
    query = query.eq("state", state);
  }
  if (origin) {
    query = query.eq("origin", origin);
  }
  if (!includeDropped) {
    // Memory-first: held rows (unknown-sender email awaiting discovery) are
    // hidden from the stream along with drops — the stream shows
    // Memory-matched and admitted captures only.
    query = query.or("gate_action.is.null,gate_action.not.in.(drop,held)");
  }

  const { data, error } = await query;

  if (error) {
    console.error("[capture-queries] getCaptureStream error:", JSON.stringify(error, null, 2));
    console.error("[capture-queries] workspaceId:", workspaceId);
    console.error("[capture-queries] error.message:", error.message);
    console.error("[capture-queries] error.code:", error.code);
    return [];
  }

  return mapStreamRows(workspaceId, (data ?? []) as StreamRow[]);
});

/**
 * Activity-as-diagnostic (Sources plan 2.9): search ALL capture history —
 * including dropped/held rows the stream hides — by title, sender, or
 * subject. Each result carries its gate_action + gate_reason so the user can
 * answer "did Salt see X, and what did it do with it?" without guessing.
 */
export async function searchCaptureHistory(
  workspaceId: string,
  options: { query: string; limit?: number },
): Promise<StreamCaptureSummary[]> {
  const { limit = 50 } = options;
  // Strip PostgREST or()-delimiters and ILIKE wildcards from the raw term.
  const term = options.query.replace(/[%_,()"]/g, " ").replace(/\s+/g, " ").trim();
  if (term.length < 2) return [];

  const supabase = await createClient();
  const like = `%${term}%`;
  const { data, error } = await supabase
    .from("capture_events")
    .select(STREAM_SELECT)
    .eq("workspace_id", workspaceId)
    .or(
      [
        `title.ilike.${like}`,
        `extracted_data->>from_email.ilike.${like}`,
        `extracted_data->>from_name.ilike.${like}`,
        `extracted_data->>sender_email.ilike.${like}`,
        `extracted_data->>sender_name.ilike.${like}`,
        `extracted_data->>subject.ilike.${like}`,
      ].join(","),
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[capture-queries] searchCaptureHistory error:", error.message, error.code);
    return [];
  }

  return mapStreamRows(workspaceId, (data ?? []) as StreamRow[]);
}

/**
 * Get today's capture statistics for a workspace.
 */
export const getTodayCaptureStats = cache(async (
  workspaceId: string
): Promise<{
  total: number;
  added: number;
  found: number;
  autoRouted: number;
  pending: number;
  findingCreated: number;
  noSignal: number;
  awaitingScan: number;
  scanError: number;
}> => {
  const supabase = await createClient();

  // Start of today in UTC
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Mirror the stream's drop filter so the summary matches what the stream shows
  const { data: captures, error: captureError } = await supabase
    .from("capture_events")
    .select("id, origin, state, extracted_data, enriched_metadata")
    .eq("workspace_id", workspaceId)
    .gte("created_at", today.toISOString())
    .or("gate_action.is.null,gate_action.not.in.(drop,held)");

  if (captureError) {
    console.error("[capture-queries] getTodayCaptureStats error:", captureError);
    return {
      total: 0,
      added: 0,
      found: 0,
      autoRouted: 0,
      pending: 0,
      findingCreated: 0,
      noSignal: 0,
      awaitingScan: 0,
      scanError: 0,
    };
  }

  const captureIds = (captures ?? []).map((c) => c.id);
  const findingLinks = await getFindingLinksByCaptureIds(workspaceId, captureIds);

  // Count auto-linked captures (legacy routing engine wrote these)
  let autoRouted = 0;
  if (captureIds.length > 0) {
    const { count } = await supabase
      .from("capture_record_links")
      .select("id", { count: "exact", head: true })
      .in("capture_event_id", captureIds)
      .eq("link_source", "auto");
    autoRouted = count ?? 0;
  }

  const rows = captures ?? [];
  let findingCreated = 0;
  let noSignal = 0;
  let awaitingScan = 0;
  let scanError = 0;

  for (const row of rows) {
    const outcome = resolveCaptureIntelligenceOutcome({
      intelligenceMeta: readIntelligenceMeta(row.extracted_data),
      findingLink: findingLinks.get(row.id) ?? null,
      routingState: row.state as CaptureState,
    });
    const category = categoryFromEnrichment(
      row.enriched_metadata as {
        enriched_at?: string | null;
        signals_matched?: string[];
        linked_records?: unknown[];
      } | null,
      outcome
    );

    switch (category) {
      case "queued":
        findingCreated++;
        break;
      case "no-signal":
        noSignal++;
        break;
      case "processing":
        awaitingScan++;
        break;
      case "error":
        scanError++;
        break;
    }
  }

  return {
    total: rows.length,
    added: rows.filter((r) => r.origin === "added").length,
    found: rows.filter((r) => r.origin === "found").length,
    autoRouted,
    pending: rows.filter((r) => r.state === "pending").length,
    findingCreated,
    noSignal,
    awaitingScan,
    scanError,
  };
});

/**
 * Check if a workspace has any captures.
 */
export const hasCaptures = cache(async (workspaceId: string): Promise<boolean> => {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("capture_events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .limit(1);

  if (error) {
    console.error("[capture-queries] hasCaptures error:", error);
    return false;
  }

  return (count ?? 0) > 0;
});

/**
 * Discovery status for the Sources surface (Sources plan 4.4): the workspace's
 * plan tier and the last relationship-discovery stamp, with the next due time
 * derived from the same cadence math the cron gates on.
 *
 * Null when discovery is not scheduled work for this workspace (no
 * capture-enabled active integration — the cron's own eligibility rule) or on
 * query error: the UI shows nothing rather than something wrong.
 */
export interface CaptureDiscoveryStatus {
  tier: string;
  tierLabel: string;
  lastRunAt: string | null;
  /** ISO due time; at/before now means the next cron tick picks it up. */
  nextRunAt: string;
}

export const getDiscoveryStatus = cache(async (
  workspaceId: string,
): Promise<CaptureDiscoveryStatus | null> => {
  const supabase = await createClient();

  const [integrationsRes, subscriptionRes, settingsRes] = await Promise.all([
    supabase
      .from("workspace_integrations")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("capture_enabled", true)
      .eq("is_active", true),
    supabase
      .from("workspace_subscriptions")
      .select("tier, pricing_version")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    supabase
      .from("workspace_capture_settings")
      .select("last_discovery_at")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
  ]);

  if (integrationsRes.error) {
    console.error("[capture-queries] getDiscoveryStatus integrations error:", integrationsRes.error);
    return null;
  }
  if (subscriptionRes.error) {
    console.error("[capture-queries] getDiscoveryStatus subscription error:", subscriptionRes.error);
    return null;
  }
  if (settingsRes.error) {
    console.error("[capture-queries] getDiscoveryStatus settings error:", settingsRes.error);
    return null;
  }

  if ((integrationsRes.count ?? 0) === 0) return null;

  const tier = subscriptionRes.data?.tier ?? null;
  const capacity = getTierCapacity(tier, subscriptionRes.data?.pricing_version);
  const lastRunAt = settingsRes.data?.last_discovery_at ?? null;

  return {
    tier: capacity.tier,
    tierLabel: capacity.label,
    lastRunAt,
    nextRunAt: new Date(nextDiscoveryDueAt(tier, lastRunAt)).toISOString(),
  };
});
