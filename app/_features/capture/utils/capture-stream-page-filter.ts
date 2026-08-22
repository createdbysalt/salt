import type { CaptureState } from "../types";
import {
  categoryFromEnrichment,
  readIntelligenceMeta,
  resolveCaptureIntelligenceOutcome,
  type CaptureCategory,
  type CaptureFindingLink,
} from "../services/intelligence/capture-intelligence-outcome";
import {
  ORIGIN_TO_AREA,
  type StreamAreaFilter,
  type StreamStateFilter,
} from "../stream-filters";

/**
 * Pure filtering/pagination for Sources → Activity phase-1 scan rows.
 *
 * Category derivation (`categoryFromEnrichment`) reads JSONB enrichment and
 * intelligence metadata, so it cannot be pushed into SQL. Instead the query
 * scans JSON-projected minimal columns for all stream rows, then applies
 * user filters + pagination here — which also makes the total count exact
 * for numbered pagination.
 */

export interface CaptureScanRow {
  id: string;
  created_at: string;
  state: CaptureState;
  source_type: string;
  is_bootstrap: boolean;
  gate_action: string | null;
  title: string | null;
  /** extracted_data->intelligence */
  intelligence: unknown;
  /** gate_result->gateResults->knownEntity->target */
  known_entity_target: unknown;
  /** enriched_metadata->>enriched_at */
  enriched_at: string | null;
  /** enriched_metadata->signals_matched */
  signals_matched: unknown;
  /** enriched_metadata->plays_dispatched */
  plays_dispatched: unknown;
  from_email: string | null;
  from_name: string | null;
  sender_email: string | null;
  sender_name: string | null;
  subject: string | null;
}

export interface CaptureStreamPageFilter {
  search?: string;
  state?: StreamStateFilter;
  area?: StreamAreaFilter;
  /** Inclusive range bounds as local `yyyy-mm-dd` dates. */
  dateFrom?: string;
  dateTo?: string;
  /**
   * Display preference (default false): include gate-kept rows (drop/held)
   * in the list alongside stream-visible rows. Kept-out rows carry no
   * status, so they bypass the state filter when included this way.
   * Counts are unaffected; they describe stream-visible captures only.
   */
  includeKeptOut?: boolean;
}

/** Stat-tile counts for the stream header strip (all-time). */
export interface CaptureStreamCounts {
  total: number;
  queued: number;
  finding: number;
  memory: number;
  watching: number;
  noSignal: number;
  processing: number;
  error: number;
}

export const EMPTY_CAPTURE_STREAM_COUNTS: CaptureStreamCounts = {
  total: 0,
  queued: 0,
  finding: 0,
  memory: 0,
  watching: 0,
  noSignal: 0,
  processing: 0,
  error: 0,
};

/** The stream hides gate-kept rows (dropped/held) unless searching history. */
export function isStreamVisibleGateAction(gateAction: string | null): boolean {
  return gateAction !== "drop" && gateAction !== "held";
}

/** Category for a scan row; the finding link comes from the caller's batch. */
export function captureScanCategory(
  row: Pick<
    CaptureScanRow,
    "state" | "intelligence" | "enriched_at" | "signals_matched" | "plays_dispatched"
  >,
  findingLink: CaptureFindingLink | null,
): CaptureCategory {
  const outcome = resolveCaptureIntelligenceOutcome({
    intelligenceMeta: readIntelligenceMeta({ intelligence: row.intelligence }),
    findingLink,
    routingState: row.state,
  });
  return categoryFromEnrichment(
    {
      enriched_at: row.enriched_at,
      signals_matched: Array.isArray(row.signals_matched)
        ? (row.signals_matched as string[])
        : undefined,
      plays_dispatched: Array.isArray(row.plays_dispatched)
        ? (row.plays_dispatched as unknown[])
        : undefined,
    },
    outcome,
  );
}

/** Known-entity gate matched a watched person/org for this capture. */
export function captureScanHasWatch(
  row: Pick<CaptureScanRow, "known_entity_target">,
): boolean {
  const target = row.known_entity_target;
  if (!target || typeof target !== "object" || Array.isArray(target)) return false;
  const { entityId, surface } = target as { entityId?: unknown; surface?: unknown };
  return typeof entityId === "string" && typeof surface === "string";
}

function parseLocalDay(value: string, endOfDay: boolean): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date.getTime();
}

export function captureMatchesDateRange(
  iso: string,
  dateFrom?: string,
  dateTo?: string,
): boolean {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  const fromMs = dateFrom ? parseLocalDay(dateFrom, false) : null;
  const toMs = dateTo ? parseLocalDay(dateTo, true) : null;
  if (fromMs != null && time < fromMs) return false;
  if (toMs != null && time > toMs) return false;
  return true;
}

export function captureMatchesSearch(
  row: Pick<
    CaptureScanRow,
    "title" | "from_email" | "from_name" | "sender_email" | "sender_name" | "subject"
  >,
  term: string,
): boolean {
  const normalized = term.trim().toLowerCase();
  if (normalized.length === 0) return true;
  return [
    row.title,
    row.from_email,
    row.from_name,
    row.sender_email,
    row.sender_name,
    row.subject,
  ]
    .filter((value): value is string => typeof value === "string")
    .some((value) => value.toLowerCase().includes(normalized));
}

export type ResolveScanFindingLink = (_row: CaptureScanRow) => CaptureFindingLink | null;

/**
 * Applies state/area/date-range/search filters, then sorts newest
 * first. `resolveFindingLink` supplies the active-ledger finding link for
 * category derivation without this module knowing the findings table.
 */
export function filterCaptureScanRows<T extends CaptureScanRow>(
  rows: T[],
  filter: CaptureStreamPageFilter,
  resolveFindingLink: ResolveScanFindingLink,
): T[] {
  const state = filter.state ?? "all";
  const area = filter.area ?? "all";
  const includeKeptOut = filter.includeKeptOut ?? false;
  return rows
    .filter((row) => {
      const keptOut = !isStreamVisibleGateAction(row.gate_action);
      if (state !== "all") {
        if (state === "kept-out") {
          // Peer status: only gate-kept rows (drop/held) — the caller must
          // pass the unfiltered scan for this state to match anything.
          if (!keptOut) return false;
        } else if (keptOut) {
          // Kept-out rows carry no status. They join a status-filtered view
          // only via the includeKeptOut display preference, and bypass the
          // state match (a held row is not "Processing").
          if (!includeKeptOut) return false;
        } else if (state === "watching") {
          if (!captureScanHasWatch(row)) return false;
        } else if (captureScanCategory(row, resolveFindingLink(row)) !== state) {
          return false;
        }
      }
      if (area !== "all" && (ORIGIN_TO_AREA[row.source_type] ?? "all") !== area) {
        return false;
      }
      if (!captureMatchesDateRange(row.created_at, filter.dateFrom, filter.dateTo)) {
        return false;
      }
      return captureMatchesSearch(row, filter.search ?? "");
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export interface CapturePageSlice<T> {
  pageRows: T[];
  totalCount: number;
  /** Requested page clamped into the valid range (1-based). */
  page: number;
}

export function paginateCaptureScanRows<T>(
  rows: T[],
  page: number,
  pageSize: number,
): CapturePageSlice<T> {
  const totalCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const clampedPage = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (clampedPage - 1) * pageSize;
  return {
    pageRows: rows.slice(start, start + pageSize),
    totalCount,
    page: clampedPage,
  };
}

/** All-time header counts over the stream-visible scan rows. */
export function computeCaptureStreamCounts(
  rows: CaptureScanRow[],
  resolveFindingLink: ResolveScanFindingLink,
): CaptureStreamCounts {
  const counts = { ...EMPTY_CAPTURE_STREAM_COUNTS };
  for (const row of rows) {
    counts.total += 1;
    if (captureScanHasWatch(row)) counts.watching += 1;
    const category = captureScanCategory(row, resolveFindingLink(row));
    if (category === "queued") counts.queued += 1;
    if (category === "finding") counts.finding += 1;
    if (category === "memory") counts.memory += 1;
    if (category === "no-signal") counts.noSignal += 1;
    if (category === "processing") counts.processing += 1;
    if (category === "error") counts.error += 1;
  }
  return counts;
}
