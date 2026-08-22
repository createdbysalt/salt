import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";
import type {
  StreamCaptureSummary,
  StreamPlayDispatch,
  StreamWatchTrigger,
  CaptureState,
  CaptureEventType,
  CaptureOrigin,
} from "./types";
import type { FindingEvidence } from "./types/intelligence-findings";
import {
  readIntelligenceMeta,
  resolveCaptureIntelligenceOutcome,
  ACTIVE_LEDGER_FINDING_STATES,
  type CaptureFindingLink,
} from "./services/intelligence/capture-intelligence-outcome";
import {
  computeCaptureStreamCounts,
  filterCaptureScanRows,
  isStreamVisibleGateAction,
  paginateCaptureScanRows,
  type CaptureScanRow,
  type CaptureStreamCounts,
  type CaptureStreamPageFilter,
  type ResolveScanFindingLink,
} from "./utils/capture-stream-page-filter";
import type { GateProofRow } from "./utils/gate-proof-counts";
import { keptOutCauseFromGateResult } from "@/app/_features/memory/queries/admission-gate-result";
import { resolveCaptureSourceUrl } from "./utils/capture-source-url";
import type { SeededTriggerFilter } from "./adapters/default-policy";

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
    title: string | null;
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
      finding_title: row.title ?? undefined,
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
    title: string | null;
    evidence: unknown;
  }> = [];

  const chunkSize = 40;
  for (let index = 0; index < uniqueIds.length; index += chunkSize) {
    const chunk = uniqueIds.slice(index, index + chunkSize);
    const orFilter = chunk.map((id) => `evidence->>source_id.eq.${id}`).join(",");

    const { data, error } = await supabase
      .from("intelligence_findings")
      .select("id, finding_type, state, title, evidence")
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
      finding_title: findingLink?.finding_title ?? null,
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
      gate_cause: keptOutCauseFromGateResult(row.gate_result),
      plays_dispatched: readPlaysDispatched(row.enriched_metadata),
      watches_triggered: watchesTriggered,
    };
  });
}

/**
 * Phase-1 scan projection: JSON-projected minimal columns, so the scan stays
 * light even though extracted_data carries full email bodies. Category
 * derivation needs only these subfields.
 */
const STREAM_SCAN_SELECT = `
  id,
  created_at,
  state,
  source_type,
  is_bootstrap,
  gate_action,
  title,
  intelligence:extracted_data->intelligence,
  known_entity_target:gate_result->gateResults->knownEntity->target,
  enriched_at:enriched_metadata->>enriched_at,
  signals_matched:enriched_metadata->signals_matched,
  plays_dispatched:enriched_metadata->plays_dispatched,
  from_email:extracted_data->>from_email,
  from_name:extracted_data->>from_name,
  sender_email:extracted_data->>sender_email,
  sender_name:extracted_data->>sender_name,
  subject:extracted_data->>subject
`;

/** PostgREST caps a response (default 1000 rows) — chunk past it. */
const STREAM_SCAN_CHUNK = 1000;

async function scanCaptureStreamRows(
  workspaceId: string,
  includeDropped: boolean,
): Promise<CaptureScanRow[]> {
  const supabase = await createClient();
  const rows: CaptureScanRow[] = [];

  for (let offset = 0; ; offset += STREAM_SCAN_CHUNK) {
    let query = supabase
      .from("capture_events")
      .select(STREAM_SCAN_SELECT)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .range(offset, offset + STREAM_SCAN_CHUNK - 1);

    if (!includeDropped) {
      // Memory-first: held rows (unknown-sender email awaiting discovery) are
      // hidden from the stream along with drops — the stream shows
      // Memory-matched and admitted captures only.
      query = query.or("gate_action.is.null,gate_action.not.in.(drop,held)");
    }

    const { data, error } = await query;
    if (error) {
      console.error("[capture-queries] scanCaptureStreamRows error:", error.message, error.code);
      throw new Error(error.message);
    }

    const chunk = (data ?? []) as unknown as CaptureScanRow[];
    rows.push(...chunk);
    if (chunk.length < STREAM_SCAN_CHUNK) break;
  }

  return rows;
}

/**
 * Active-ledger finding IDs out of the candidates the scan rows reference.
 * Legacy (pre-enrichment) rows only count as "Triggered Play" when their
 * finding is still live — one batched lookup, never one per row.
 */
async function getActiveFindingIds(
  workspaceId: string,
  candidateIds: string[],
): Promise<Set<string>> {
  const active = new Set<string>();
  if (candidateIds.length === 0) return active;

  const supabase = await createClient();
  const chunkSize = 200;
  for (let index = 0; index < candidateIds.length; index += chunkSize) {
    const chunk = candidateIds.slice(index, index + chunkSize);
    const { data, error } = await supabase
      .from("intelligence_findings")
      .select("id, state")
      .eq("workspace_id", workspaceId)
      .in("id", chunk)
      .in("state", [...ACTIVE_LEDGER_FINDING_STATES]);

    if (error) {
      console.error("[capture-queries] getActiveFindingIds error:", error.message, error.code);
      continue;
    }
    for (const row of data ?? []) active.add(row.id);
  }
  return active;
}

export interface CaptureStreamPageParams extends CaptureStreamPageFilter {
  page: number;
  pageSize: number;
}

export interface CaptureStreamPage {
  captures: StreamCaptureSummary[];
  totalCount: number;
  /** Requested page, clamped into the valid range. */
  page: number;
  pageSize: number;
  counts: CaptureStreamCounts;
}

/**
 * One page of the Sources → Activity stream, filtered and counted exactly.
 *
 * Phase 1 scans JSON-projected minimal columns for every stream row:
 * category derivation reads enrichment/intelligence JSONB, so it cannot be
 * pushed into SQL. Scanning cheap projections keeps the total count exact
 * (numbered pagination needs it) without fetching full email bodies.
 * Phase 2 fetches full rows + finding links + watch labels for just the
 * page's ids (the existing mapStreamRows enrichment).
 *
 * Search is the activity-as-diagnostic path (Sources plan 2.9): a
 * specific-enough term (2+ chars) spans ALL capture history — including
 * dropped/held rows the stream hides — so the user can answer "did Salt see
 * X, and what did it do with it?". The `kept-out` state filter targets the
 * same rows directly. Header counts always reflect the stream-visible rows
 * only.
 */
export async function getCaptureStreamPage(
  workspaceId: string,
  params: CaptureStreamPageParams,
): Promise<CaptureStreamPage> {
  const pageSize = Math.min(Math.max(1, Math.floor(params.pageSize)), 100);
  const search = params.search?.trim() ?? "";
  const fullHistory = search.length >= 2;
  // Kept-out rows (drop/held) join the scan for full-history search, the
  // kept-out peer status, or the includeKeptOut display preference.
  const includeKeptOut =
    fullHistory || params.state === "kept-out" || params.includeKeptOut === true;

  const scanned = await scanCaptureStreamRows(workspaceId, includeKeptOut);
  const streamRows = includeKeptOut
    ? scanned.filter((row) => isStreamVisibleGateAction(row.gate_action))
    : scanned;

  const candidateFindingIds = [
    ...new Set(
      scanned
        .map((row) => readIntelligenceMeta({ intelligence: row.intelligence })?.finding_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  const activeFindingIds = await getActiveFindingIds(workspaceId, candidateFindingIds);
  const resolveFindingLink: ResolveScanFindingLink = (row) => {
    const findingId = readIntelligenceMeta({ intelligence: row.intelligence })?.finding_id;
    return findingId && activeFindingIds.has(findingId)
      ? { finding_id: findingId, finding_type: "", finding_state: "needs_you" }
      : null;
  };

  const counts = computeCaptureStreamCounts(streamRows, resolveFindingLink);
  const filtered = filterCaptureScanRows(
    includeKeptOut ? scanned : streamRows,
    { ...params, search },
    resolveFindingLink,
  );
  const slice = paginateCaptureScanRows(filtered, params.page, pageSize);
  const pageIds = slice.pageRows.map((row) => row.id);

  if (pageIds.length === 0) {
    return { captures: [], totalCount: slice.totalCount, page: slice.page, pageSize, counts };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("capture_events")
    .select(STREAM_SELECT)
    .in("id", pageIds);

  if (error) {
    console.error("[capture-queries] getCaptureStreamPage error:", error.message, error.code);
    throw new Error(error.message);
  }

  // `.in()` does not preserve order — restore the filtered page order.
  const orderById = new Map(pageIds.map((id, index) => [id, index]));
  const pageRows = ((data ?? []) as StreamRow[]).sort(
    (a, b) => (orderById.get(a.id) ?? 0) - (orderById.get(b.id) ?? 0),
  );

  const captures = await mapStreamRows(workspaceId, pageRows);
  return { captures, totalCount: slice.totalCount, page: slice.page, pageSize, counts };
}

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
 * Seeded upstream filters (Sources → Customize transparency layer): the
 * Salt-curated `capture_trigger_config` rows for the given providers, read
 * live from connector_trigger_types so the "What Salt does by default"
 * copy can never drift from what the subscriptions actually filter.
 * Returns only rows that carry a config; renderers live in the pure
 * `adapters/default-policy.ts`.
 */
export async function getSeededCaptureTriggerFilters(
  providers: readonly string[],
): Promise<SeededTriggerFilter[]> {
  if (providers.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("connector_trigger_types")
    .select("toolkit_slug, trigger_slug, capture_trigger_config")
    .in("toolkit_slug", [...providers])
    .eq("enabled_for_capture", true)
    .eq("sync_status", "active")
    .not("capture_trigger_config", "is", null);

  if (error) {
    console.error(
      "[capture-queries] getSeededCaptureTriggerFilters error:",
      error.message,
    );
    return [];
  }

  return (data ?? [])
    .filter(
      (row) =>
        row.capture_trigger_config !== null &&
        typeof row.capture_trigger_config === "object" &&
        !Array.isArray(row.capture_trigger_config),
    )
    .map((row) => ({
      provider: row.toolkit_slug,
      slug: row.trigger_slug,
      config: row.capture_trigger_config as Record<string, unknown>,
    }));
}

/**
 * Gate proof rows (Sources → Customize, Phase S1): one week of
 * source_type × gate_action pairs for the workspace, summarized into
 * per-area proof counts by the pure `utils/gate-proof-counts.ts`.
 * Two columns only, capped — this backs "I skipped 43 promotions this
 * week", not an export. Errors return [] (the surface shows no proof
 * line rather than a wrong one).
 */
export async function getWeeklyGateProofRows(
  workspaceId: string,
): Promise<GateProofRow[]> {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("capture_events")
    .select("source_type, gate_action")
    .eq("workspace_id", workspaceId)
    .not("gate_action", "is", null)
    .gte("created_at", weekAgo)
    .limit(10000);

  if (error) {
    console.error("[capture-queries] getWeeklyGateProofRows error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    sourceType: row.source_type,
    gateAction: row.gate_action,
  }));
}

