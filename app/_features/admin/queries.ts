import "server-only";

import { getPlatformAdmin } from "@/app/_lib/admin/platform-admin";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { listCatalogEntries } from "@/app/_lib/composio/connector-registry";
import { discoverV2Playbooks } from "@/app/_features/plays/playbooks/schema/v2/discovery";
import type { DiscoveryResult } from "@/app/_features/plays/playbooks/schema/v2/discovery";
import { WAITLIST_QUAL_STEPS } from "@/app/_features/marketing/waitlist-qualification";
import { resolvePlaysIncluded } from "@/app/_lib/usage/tiers";

/**
 * Admin dashboard rollups (Founder Ops Phase 2) — read-only platform health
 * for the /admin hub. Design of record:
 * docs/plans/2026-08-29-admin-dashboard-composio-canary.md
 *
 * Bootstrap principles enforced here:
 * - Live counts from source (head/exact counts, capped scans) — never stored
 *   counters that drift out of sync.
 * - Every fetcher re-checks the platform-admin gate and fails closed.
 * - Scans are capped; when a cap is hit the rollup says so (`truncated`)
 *   instead of silently under-reporting.
 *
 * Cross-tenant reads use the service role — ops data, never user-facing.
 */

export const CAPTURE_SCAN_CAP = 10_000;
export const SPEND_SCAN_CAP = 10_000;
const INTEGRATION_SCAN_CAP = 5_000;
const CANARY_HISTORY_SCAN = 500;
const SIGNUP_SERIES_SCAN_CAP = 10_000;
const CANARY_SERIES_SCAN_CAP = 10_000;
const SIGNUP_SERIES_DAYS = 90;
const CANARY_SERIES_HOURS = 7 * 24;

// ── Pure aggregation helpers (unit-tested) ──────────────────────────────

export interface KeyCount {
  key: string;
  count: number;
}

function countBy(rows: string[]): KeyCount[] {
  const counts = new Map<string, number>();
  for (const value of rows) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export function groupTiers(rows: Array<{ tier: string }>): KeyCount[] {
  return countBy(rows.map((row) => row.tier));
}

export interface IntegrationRollupRow {
  provider: string;
  /**
   * Non-healthy Composio statuses with counts (empty = all healthy).
   * Raw status strings are inconsistent across rows ("active" vs
   * "connected"), so only problem states are worth surfacing.
   */
  problems: KeyCount[];
  active: number;
  inactive: number;
}

/** Statuses that mean "nothing to see here" (case-insensitive). */
const HEALTHY_CONNECTION_STATUSES = new Set([
  "active",
  "connected",
  "success",
  "ok",
  "unknown",
]);

/**
 * Roll up workspace_integrations into one row per provider (active vs
 * inactive connections, distinct Composio statuses). When
 * `supportedProviders` is given, rows for providers outside the product
 * catalog (catalog_only entries like GitHub/Fireflies, plus legacy rows)
 * are excluded so the dashboard reflects the connectors Salt actually
 * supports.
 */
export function groupIntegrations(
  rows: Array<{
    provider: string;
    composio_status: string | null;
    is_active: boolean | null;
  }>,
  supportedProviders?: ReadonlySet<string>,
): IntegrationRollupRow[] {
  const byProvider = new Map<
    string,
    { problems: string[]; active: number; inactive: number }
  >();
  for (const row of rows) {
    if (supportedProviders && !supportedProviders.has(row.provider)) continue;
    const bucket = byProvider.get(row.provider) ?? {
      problems: [],
      active: 0,
      inactive: 0,
    };
    const status = row.composio_status ?? "unknown";
    if (!HEALTHY_CONNECTION_STATUSES.has(status.toLowerCase())) {
      bucket.problems.push(status);
    }
    if (row.is_active === true) {
      bucket.active += 1;
    } else {
      bucket.inactive += 1;
    }
    byProvider.set(row.provider, bucket);
  }
  return [...byProvider.entries()]
    .map(([provider, bucket]) => ({
      provider,
      problems: countBy(bucket.problems),
      active: bucket.active,
      inactive: bucket.inactive,
    }))
    .sort(
      (a, b) =>
        b.active + b.inactive - (a.active + a.inactive) ||
        a.provider.localeCompare(b.provider),
    );
}

export interface CanaryStatusRow {
  slug: string;
  toolkit: string;
  status: string;
  errorCode: string | null;
  latencyMs: number | null;
  checkedAt: string;
}

/** Rows must arrive newest-first; the first row per target wins. */
export function latestCanaryPerSlug(
  rows: Array<{
    target: string;
    toolkit: string;
    status: string;
    error_code: string | null;
    latency_ms: number | null;
    checked_at: string;
  }>,
): CanaryStatusRow[] {
  const latest = new Map<string, CanaryStatusRow>();
  for (const row of rows) {
    if (latest.has(row.target)) continue;
    latest.set(row.target, {
      slug: row.target,
      toolkit: row.toolkit,
      status: row.status,
      errorCode: row.error_code,
      latencyMs: row.latency_ms,
      checkedAt: row.checked_at,
    });
  }
  // Failures first — the dashboard is a triage surface.
  return [...latest.values()].sort(
    (a, b) =>
      Number(b.status === "failed") - Number(a.status === "failed") ||
      a.slug.localeCompare(b.slug),
  );
}

export function groupWebhookOutcomes(
  rows: Array<{ detail: unknown }>,
): KeyCount[] {
  const outcomes: string[] = [];
  for (const row of rows) {
    if (
      row.detail &&
      typeof row.detail === "object" &&
      !Array.isArray(row.detail) &&
      typeof (row.detail as { outcome?: unknown }).outcome === "string"
    ) {
      outcomes.push((row.detail as { outcome: string }).outcome);
    }
  }
  return countBy(outcomes);
}

export interface CaptureRollupCounts {
  total: number;
  bySourceType: KeyCount[];
  byGateAction: KeyCount[];
}

export function aggregateCaptureRows(
  rows: Array<{ source_type: string; gate_action: string | null }>,
): CaptureRollupCounts {
  return {
    total: rows.length,
    bySourceType: countBy(rows.map((row) => row.source_type)),
    byGateAction: countBy(rows.map((row) => row.gate_action ?? "ungated")),
  };
}

export interface WorkspaceSpendRow {
  workspaceId: string;
  name: string | null;
  micros: number;
}

export interface SpendRollupCounts {
  mtdMicros: number;
  truncated: boolean;
  topWorkspaces: WorkspaceSpendRow[];
}

export function summarizeSpend(
  rows: Array<{ workspace_id: string; cost_estimate_micros: number }>,
  namesById: Map<string, string>,
  topN: number,
): SpendRollupCounts {
  const byWorkspace = new Map<string, number>();
  let mtdMicros = 0;
  for (const row of rows) {
    mtdMicros += row.cost_estimate_micros;
    byWorkspace.set(
      row.workspace_id,
      (byWorkspace.get(row.workspace_id) ?? 0) + row.cost_estimate_micros,
    );
  }
  const topWorkspaces = [...byWorkspace.entries()]
    .map(([workspaceId, micros]) => ({
      workspaceId,
      name: namesById.get(workspaceId) ?? null,
      micros,
    }))
    .sort((a, b) => b.micros - a.micros)
    .slice(0, topN);
  return {
    mtdMicros,
    truncated: rows.length >= SPEND_SCAN_CAP,
    topWorkspaces,
  };
}

export interface PlaybookLibraryHealth {
  totalPlaybooks: number;
  errors: Array<{ file: string; messages: string[] }>;
  skipped: Array<{ path: string; reason: string }>;
}

/** Discovery result → dashboard rows (pure; tested). */
export function summarizeDiscovery(
  result: DiscoveryResult,
): PlaybookLibraryHealth {
  return {
    totalPlaybooks: result.allPlaybooks.length,
    errors: result.errors.map((entry) => ({
      file: entry.file,
      messages: entry.errors,
    })),
    skipped: result.skipped.map((entry) => ({
      path: entry.path,
      reason: entry.reason,
    })),
  };
}

// ── Gated fetchers ──────────────────────────────────────────────────────

/**
 * Repo playbook discovery health — the "six shipped playbooks went invisible
 * for weeks" detector. Platform-global (the library is Salt-authored repo
 * content), so it belongs to the founder, not the user. Reads the
 * filesystem; no DB.
 */
export async function getPlaybookLibraryHealth(): Promise<PlaybookLibraryHealth | null> {
  const admin = await getPlatformAdmin();
  if (!admin.ok) return null;

  try {
    return summarizeDiscovery(discoverV2Playbooks());
  } catch (error) {
    console.error("[admin] playbook discovery rollup failed:", error);
    return null;
  }
}

export interface SignupSeriesPoint {
  /** YYYY-MM-DD (UTC) — the chart x-axis key. */
  date: string;
  signups: number;
  waitlist: number;
}

/**
 * Daily signup + waitlist buckets for the dashboard area chart. Days with
 * no signups are filled with 0 so the line doesn't interpolate across gaps.
 */
export function bucketSignupsByDay(
  rows: Array<{ created_at: string }>,
  days: number,
  now: Date = new Date(),
  waitlistRows: Array<{ created_at: string }> = [],
): SignupSeriesPoint[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const waitlistCounts = new Map<string, number>();
  for (const row of waitlistRows) {
    const day = row.created_at.slice(0, 10);
    waitlistCounts.set(day, (waitlistCounts.get(day) ?? 0) + 1);
  }
  const points: SignupSeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 86_400_000)
      .toISOString()
      .slice(0, 10);
    points.push({
      date: day,
      signups: counts.get(day) ?? 0,
      waitlist: waitlistCounts.get(day) ?? 0,
    });
  }
  return points;
}

export interface CanarySeriesPoint {
  /** Hour bucket start, ISO — the chart x-axis key. */
  hour: string;
  ok: number;
  failed: number;
}

/**
 * Hourly canary outcome buckets for the connector-health area chart.
 * Hours with no probes are filled with zeros.
 */
export function bucketCanaryByHour(
  rows: Array<{ checked_at: string; status: string }>,
  hours: number,
  now: Date = new Date(),
): CanarySeriesPoint[] {
  const counts = new Map<string, { ok: number; failed: number }>();
  for (const row of rows) {
    const hour = `${row.checked_at.slice(0, 13)}:00:00.000Z`;
    const bucket = counts.get(hour) ?? { ok: 0, failed: 0 };
    if (row.status === "ok") {
      bucket.ok += 1;
    } else {
      bucket.failed += 1;
    }
    counts.set(hour, bucket);
  }
  const currentHourStart = Math.floor(now.getTime() / 3_600_000) * 3_600_000;
  const points: CanarySeriesPoint[] = [];
  for (let i = hours - 1; i >= 0; i--) {
    const hour = new Date(currentHourStart - i * 3_600_000).toISOString();
    const bucket = counts.get(hour) ?? { ok: 0, failed: 0 };
    points.push({ hour, ok: bucket.ok, failed: bucket.failed });
  }
  return points;
}

export type AccountStatus =
  | "trial"
  | "paid"
  | "canceling"
  | "canceled"
  | "past_due";

/**
 * People-tab status. Canceled wins over cancel-at-period-end; a scheduled
 * cancel on an otherwise-active sub is "canceling", not paid.
 */
export function mapAccountStatus(row: {
  status: string | null;
  cancel_at_period_end: boolean | null;
}): AccountStatus {
  const status = (row.status ?? "").toLowerCase();
  if (status === "canceled") return "canceled";
  if (row.cancel_at_period_end === true) return "canceling";
  if (status === "past_due") return "past_due";
  if (status === "trialing" || status === "incomplete") return "trial";
  return "paid";
}

const QUAL_LABELS = new Map(
  WAITLIST_QUAL_STEPS.flatMap((step) =>
    (step.options ?? []).map((option) => [option.value, option.label] as const),
  ),
);

function qualificationValue(
  metadata: unknown,
  field: string,
): string | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }
  const qualification = (metadata as { qualification?: unknown }).qualification;
  if (
    !qualification ||
    typeof qualification !== "object" ||
    Array.isArray(qualification)
  ) {
    return undefined;
  }
  const value = (qualification as Record<string, unknown>)[field];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Counts waitlist qualification answers for one field. Uses the form's
 * option order (not count order) so revenue bands stay in sequence.
 */
export function bucketQualification(
  leads: Array<{ metadata: unknown }>,
  field: string,
): KeyCount[] {
  const step = WAITLIST_QUAL_STEPS.find((entry) => entry.field === field);
  const counts = new Map<string, number>();
  for (const lead of leads) {
    const raw = qualificationValue(lead.metadata, field);
    if (!raw) continue;
    const tokens =
      step?.type === "multi"
        ? raw.split(",").map((token) => token.trim()).filter(Boolean)
        : [raw];
    for (const token of tokens) {
      const label = QUAL_LABELS.get(token) ?? token;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  if (step?.options) {
    return step.options
      .map((option) => ({
        key: option.label,
        count: counts.get(option.label) ?? 0,
      }))
      .filter((row) => row.count > 0);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export interface PeriodOverPeriodPoint {
  /** YYYY-MM-DD of the current window — the chart x-axis. */
  date: string;
  current: number;
  previous: number;
}

/**
 * Daily counts for the last `days` days, with the prior window of the same
 * length aligned onto those dates (Geckoboard this-vs-last overlay).
 */
export function bucketPeriodOverPeriod(
  rows: Array<{ created_at: string }>,
  days: number,
  now: Date = new Date(),
): PeriodOverPeriodPoint[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const points: PeriodOverPeriodPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const currentDay = new Date(now.getTime() - i * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const previousDay = new Date(now.getTime() - (i + days) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    points.push({
      date: currentDay,
      current: counts.get(currentDay) ?? 0,
      previous: counts.get(previousDay) ?? 0,
    });
  }
  return points;
}

/** Accounts whose play usage is at or over `threshold` of the bundle. */
export function usageRiskCount(
  rows: Array<{ used: number; included: number }>,
  threshold = 0.8,
): number {
  return rows.filter(
    (row) =>
      row.included > 0 && row.used / row.included >= threshold,
  ).length;
}

export interface AdminOverviewData {
  totalUsers: number;
  totalWorkspaces: number;
  signups7d: number;
  signupsPrev7d: number;
  signups30d: number;
  waitlistTotal: number;
  waitlist7d: number;
  tiers: KeyCount[];
}

export async function getAdminOverview(): Promise<AdminOverviewData | null> {
  const admin = await getPlatformAdmin();
  if (!admin.ok) return null;

  try {
    const supabase = createAdminClient();
    const now = Date.now();
    const since7d = new Date(now - 7 * 86_400_000).toISOString();
    const since14d = new Date(now - 14 * 86_400_000).toISOString();
    const since30d = new Date(now - 30 * 86_400_000).toISOString();

    const [
      users,
      workspaces,
      signups7d,
      signupsPrev7d,
      signups30d,
      waitlistTotal,
      waitlist7d,
      tierRows,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("workspaces")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since7d),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since14d)
        .lt("created_at", since7d),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since30d),
      supabase
        .from("waitlist_leads")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("waitlist_leads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since7d),
      supabase.from("workspace_subscriptions").select("tier").limit(5_000),
    ]);

    return {
      totalUsers: users.count ?? 0,
      totalWorkspaces: workspaces.count ?? 0,
      signups7d: signups7d.count ?? 0,
      signupsPrev7d: signupsPrev7d.count ?? 0,
      signups30d: signups30d.count ?? 0,
      waitlistTotal: waitlistTotal.count ?? 0,
      waitlist7d: waitlist7d.count ?? 0,
      tiers: groupTiers(tierRows.data ?? []),
    };
  } catch (error) {
    console.error("[admin] overview rollup failed:", error);
    return null;
  }
}

export interface SignupSeries {
  points: SignupSeriesPoint[];
  truncated: boolean;
}

/** Daily signup series for the dashboard area chart (last 90 days). */
export async function getSignupSeries(): Promise<SignupSeries | null> {
  const admin = await getPlatformAdmin();
  if (!admin.ok) return null;

  try {
    const supabase = createAdminClient();
    const since = new Date(
      Date.now() - SIGNUP_SERIES_DAYS * 86_400_000,
    ).toISOString();
    const [signupRows, waitlistRows] = await Promise.all([
      supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(SIGNUP_SERIES_SCAN_CAP),
      supabase
        .from("waitlist_leads")
        .select("created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(SIGNUP_SERIES_SCAN_CAP),
    ]);

    const rows = signupRows.data ?? [];
    const leads = waitlistRows.data ?? [];
    return {
      points: bucketSignupsByDay(rows, SIGNUP_SERIES_DAYS, new Date(), leads),
      truncated:
        rows.length >= SIGNUP_SERIES_SCAN_CAP ||
        leads.length >= SIGNUP_SERIES_SCAN_CAP,
    };
  } catch (error) {
    console.error("[admin] signup series failed:", error);
    return null;
  }
}

export interface CanarySeries {
  points: CanarySeriesPoint[];
  truncated: boolean;
}

/** Hourly canary outcome series for the connector-health chart (last 7 days). */
export async function getCanarySeries(): Promise<CanarySeries | null> {
  const admin = await getPlatformAdmin();
  if (!admin.ok) return null;

  try {
    const supabase = createAdminClient();
    const since = new Date(
      Date.now() - CANARY_SERIES_HOURS * 3_600_000,
    ).toISOString();
    const { data } = await supabase
      .from("platform_health_checks")
      .select("checked_at, status")
      .eq("kind", "slug_canary")
      .gte("checked_at", since)
      .order("checked_at", { ascending: true })
      .limit(CANARY_SERIES_SCAN_CAP);

    const rows = data ?? [];
    return {
      points: bucketCanaryByHour(rows, CANARY_SERIES_HOURS),
      truncated: rows.length >= CANARY_SERIES_SCAN_CAP,
    };
  } catch (error) {
    console.error("[admin] canary series failed:", error);
    return null;
  }
}

export interface ComposioHealthData {
  integrations: IntegrationRollupRow[];
  integrationsTruncated: boolean;
  canary: CanaryStatusRow[];
  webhookOutcomes24h: KeyCount[];
}

export async function getComposioHealth(): Promise<ComposioHealthData | null> {
  const admin = await getPlatformAdmin();
  if (!admin.ok) return null;

  try {
    const supabase = createAdminClient();
    const since24h = new Date(Date.now() - 24 * 3_600_000).toISOString();

    // "Supported" = the connectors in the product's browse UI
    // (showInCatalog), not the full Composio-synced catalog — that table
    // carries every Composio app as catalog_only (GitHub, Fireflies, …).
    // Registry load is cached (5 min); if it's unavailable we degrade to
    // the unfiltered rollup rather than blanking the section.
    let supportedProviders: Set<string> | null = null;
    try {
      const catalog = await listCatalogEntries();
      supportedProviders = new Set(catalog.map((entry) => entry.providerKey));
    } catch (error) {
      console.error("[admin] connector registry unavailable:", error);
    }

    const [integrationRows, canaryRows, outcomeRows] = await Promise.all([
      supabase
        .from("workspace_integrations")
        .select("provider, composio_status, is_active")
        .limit(INTEGRATION_SCAN_CAP),
      supabase
        .from("platform_health_checks")
        .select("target, toolkit, status, error_code, latency_ms, checked_at")
        .eq("kind", "slug_canary")
        .order("checked_at", { ascending: false })
        .limit(CANARY_HISTORY_SCAN),
      supabase
        .from("connector_sync_events")
        .select("detail")
        .eq("kind", "webhook_outcome")
        .gte("created_at", since24h)
        .limit(CAPTURE_SCAN_CAP),
    ]);

    const allIntegrationRows = integrationRows.data ?? [];

    return {
      integrations: groupIntegrations(
        allIntegrationRows,
        supportedProviders ?? undefined,
      ),
      integrationsTruncated: allIntegrationRows.length >= INTEGRATION_SCAN_CAP,
      canary: latestCanaryPerSlug(canaryRows.data ?? []),
      webhookOutcomes24h: groupWebhookOutcomes(outcomeRows.data ?? []),
    };
  } catch (error) {
    console.error("[admin] composio health rollup failed:", error);
    return null;
  }
}

export interface CapturePipelineData extends CaptureRollupCounts {
  truncated: boolean;
  stubCount: number;
  stubCount7d: number;
}

export async function getCapturePipeline(): Promise<CapturePipelineData | null> {
  const admin = await getPlatformAdmin();
  if (!admin.ok) return null;

  try {
    const supabase = createAdminClient();
    const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString();

    const [eventRows, stubCount, stubCount7d] = await Promise.all([
      supabase
        .from("capture_events")
        .select("source_type, gate_action")
        .gte("created_at", since7d)
        .limit(CAPTURE_SCAN_CAP),
      supabase
        .from("capture_events")
        .select("id", { count: "exact", head: true })
        // ->> extracts text, so the boolean compares as the string 'true'
        .eq("raw_payload->>needs_hydration", "true"),
      supabase
        .from("capture_events")
        .select("id", { count: "exact", head: true })
        .eq("raw_payload->>needs_hydration", "true")
        .gte("created_at", since7d),
    ]);

    const rows = eventRows.data ?? [];
    return {
      ...aggregateCaptureRows(rows),
      truncated: rows.length >= CAPTURE_SCAN_CAP,
      stubCount: stubCount.count ?? 0,
      stubCount7d: stubCount7d.count ?? 0,
    };
  } catch (error) {
    console.error("[admin] capture pipeline rollup failed:", error);
    return null;
  }
}

export interface MemoryCareHealth {
  /** Salt writes applied to Memory in the last 7d (salt_learnings births). */
  applies7d: number;
  /** "That's wrong" rollbacks in the last 7d — the care-quality signal. */
  undone7d: number;
  appliesByEntity: KeyCount[];
  /** Calibration corrections by field, 30d — which fields Salt gets wrong. */
  correctionsByField: KeyCount[];
  truncated: boolean;
}

export async function getMemoryCareHealth(): Promise<MemoryCareHealth | null> {
  const admin = await getPlatformAdmin();
  if (!admin.ok) return null;

  try {
    const supabase = createAdminClient();
    const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString();

    const [learningRows, undoneCount, correctionRows] = await Promise.all([
      supabase
        .from("salt_learnings")
        .select("entity_type")
        .gte("created_at", since7d)
        .limit(CAPTURE_SCAN_CAP),
      supabase
        .from("salt_learnings")
        .select("id", { count: "exact", head: true })
        .gte("undone_at", since7d),
      supabase
        .from("field_corrections")
        .select("field")
        .gte("corrected_at", since30d)
        .limit(CAPTURE_SCAN_CAP),
    ]);

    const learnings = learningRows.data ?? [];
    const corrections = correctionRows.data ?? [];
    return {
      applies7d: learnings.length,
      undone7d: undoneCount.count ?? 0,
      appliesByEntity: countBy(learnings.map((row) => row.entity_type)),
      correctionsByField: countBy(corrections.map((row) => row.field)),
      truncated:
        learnings.length >= CAPTURE_SCAN_CAP ||
        corrections.length >= CAPTURE_SCAN_CAP,
    };
  } catch (error) {
    console.error("[admin] memory care rollup failed:", error);
    return null;
  }
}

export interface WorkspaceSpend extends WorkspaceSpendRow {
  tier: string | null;
  stripeCustomerId: string | null;
}

export interface SpendData {
  mtdMicros: number;
  truncated: boolean;
  topWorkspaces: WorkspaceSpend[];
}

export async function getSpendRollup(topN = 10): Promise<SpendData | null> {
  const admin = await getPlatformAdmin();
  if (!admin.ok) return null;

  try {
    const supabase = createAdminClient();
    const monthStart = new Date(
      Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        1,
      ),
    ).toISOString();

    const { data: usageRows } = await supabase
      .from("usage_events")
      .select("workspace_id, cost_estimate_micros")
      .gte("created_at", monthStart)
      .limit(SPEND_SCAN_CAP);

    const rows = usageRows ?? [];
    const workspaceIds = [...new Set(rows.map((row) => row.workspace_id))];

    const [{ data: workspaceRows }, { data: subscriptionRows }] =
      workspaceIds.length > 0
        ? await Promise.all([
            supabase
              .from("workspaces")
              .select("id, name")
              .in("id", workspaceIds),
            supabase
              .from("workspace_subscriptions")
              .select("workspace_id, tier, stripe_customer_id")
              .in("workspace_id", workspaceIds),
          ])
        : [{ data: [] as never[] }, { data: [] as never[] }];

    const namesById = new Map(
      (workspaceRows ?? []).map((row) => [row.id, row.name] as const),
    );
    const subscriptionByWorkspace = new Map(
      (subscriptionRows ?? []).map(
        (row) => [row.workspace_id, row] as const,
      ),
    );

    const summary = summarizeSpend(rows, namesById, topN);
    return {
      mtdMicros: summary.mtdMicros,
      truncated: summary.truncated,
      topWorkspaces: summary.topWorkspaces.map((row) => ({
        ...row,
        tier: subscriptionByWorkspace.get(row.workspaceId)?.tier ?? null,
        stripeCustomerId:
          subscriptionByWorkspace.get(row.workspaceId)?.stripe_customer_id ??
          null,
      })),
    };
  } catch (error) {
    console.error("[admin] spend rollup failed:", error);
    return null;
  }
}

const USERS_SCAN_CAP = 5_000;
const TRIAL_SERIES_DAYS = 30;

export interface UsersFunnel {
  signedUp: number;
  trial: number;
  paid: number;
}

export interface UsersRecentEvent {
  kind: "signed_up" | "canceling" | "canceled";
  at: string;
  label: string;
}

export interface UsersOverviewData {
  trialsStarted7d: number;
  trialsStartedPrev7d: number;
  trialsStarted30d: number;
  trialsActive: number;
  paidAccounts: number;
  trialToPaidPercent: number | null;
  churning30d: number;
  usageRisk: number;
  waitlistLeftover: number;
  funnel: UsersFunnel;
  planMix: KeyCount[];
  series: PeriodOverPeriodPoint[];
  recent: UsersRecentEvent[];
  truncated: boolean;
}

function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function trialToPaidPercent(trial: number, paid: number): number | null {
  const denom = trial + paid;
  if (denom <= 0) return null;
  return (paid / denom) * 100;
}

export async function getUsersOverview(): Promise<UsersOverviewData | null> {
  const admin = await getPlatformAdmin();
  if (!admin.ok) return null;

  try {
    const supabase = createAdminClient();
    const now = Date.now();
    const since7d = new Date(now - 7 * 86_400_000).toISOString();
    const since14d = new Date(now - 14 * 86_400_000).toISOString();
    const since30d = new Date(now - 30 * 86_400_000).toISOString();
    const sinceSeries = new Date(
      now - TRIAL_SERIES_DAYS * 2 * 86_400_000,
    ).toISOString();
    const monthStart = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
    ).toISOString();

    const [
      totalProfiles,
      signups7d,
      signupsPrev7d,
      signups30d,
      waitlistLeftover,
      profileRows,
      subRows,
      usageRows,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since7d),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since14d)
        .lt("created_at", since7d),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since30d),
      supabase
        .from("waitlist_leads")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("id, email, display_name, full_name, created_at")
        .order("created_at", { ascending: false })
        .limit(USERS_SCAN_CAP),
      supabase
        .from("workspace_subscriptions")
        .select(
          "workspace_id, tier, status, cancel_at_period_end, plays_included_override, pricing_version, updated_at, created_at",
        )
        .limit(USERS_SCAN_CAP),
      supabase
        .from("usage_events")
        .select("workspace_id, reverses_event_id")
        .eq("event_type", "play_executed")
        .eq("billable", true)
        .gte("created_at", monthStart)
        .limit(SPEND_SCAN_CAP),
    ]);

    const profiles = profileRows.data ?? [];
    const subs = subRows.data ?? [];
    const usage = usageRows.data ?? [];

    const statuses = subs.map((row) =>
      mapAccountStatus({
        status: row.status,
        cancel_at_period_end: row.cancel_at_period_end,
      }),
    );
    const trialsActive = statuses.filter((status) => status === "trial").length;
    const paidAccounts = statuses.filter((status) => status === "paid").length;
    const churning30d = subs.filter((row) => {
      const status = mapAccountStatus(row);
      if (status !== "canceling" && status !== "canceled") return false;
      return row.updated_at >= since30d;
    }).length;

    const usedByWorkspace = new Map<string, number>();
    for (const row of usage) {
      if (row.reverses_event_id != null) continue;
      usedByWorkspace.set(
        row.workspace_id,
        (usedByWorkspace.get(row.workspace_id) ?? 0) + 1,
      );
    }
    const usageRowsForRisk = subs.map((row) => ({
      used: usedByWorkspace.get(row.workspace_id) ?? 0,
      included: resolvePlaysIncluded(
        row.tier,
        row.plays_included_override,
        row.pricing_version,
      ),
    }));

    const recent: UsersRecentEvent[] = [
      ...profiles.slice(0, 8).map((row) => ({
        kind: "signed_up" as const,
        at: row.created_at,
        label: row.display_name || row.full_name || row.email || row.id,
      })),
      ...subs
        .filter((row) => {
          const status = mapAccountStatus(row);
          return status === "canceling" || status === "canceled";
        })
        .map((row) => ({
          kind: mapAccountStatus(row) === "canceled" ? ("canceled" as const) : ("canceling" as const),
          at: row.updated_at,
          label: row.tier,
        })),
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 8);

    return {
      trialsStarted7d: signups7d.count ?? 0,
      trialsStartedPrev7d: signupsPrev7d.count ?? 0,
      trialsStarted30d: signups30d.count ?? 0,
      trialsActive,
      paidAccounts,
      trialToPaidPercent: trialToPaidPercent(trialsActive, paidAccounts),
      churning30d,
      usageRisk: usageRiskCount(usageRowsForRisk),
      waitlistLeftover: waitlistLeftover.count ?? 0,
      funnel: {
        signedUp: totalProfiles.count ?? profiles.length,
        trial: trialsActive,
        paid: paidAccounts,
      },
      planMix: groupTiers(subs),
      series: bucketPeriodOverPeriod(
        profiles.map((row) => ({ created_at: row.created_at })),
        TRIAL_SERIES_DAYS,
      ),
      recent,
      truncated:
        profiles.length >= USERS_SCAN_CAP ||
        subs.length >= USERS_SCAN_CAP ||
        usage.length >= SPEND_SCAN_CAP,
    };
  } catch (error) {
    console.error("[admin] users overview rollup failed:", error);
    return null;
  }
}

export { percentChange };

export interface ProspectRow {
  email: string;
  status: "partial" | "complete";
  business: string | null;
  revenue: string | null;
  heard: string | null;
  source: string;
  joined: string;
}

export interface ProspectsData {
  total: number;
  complete: number;
  partial: number;
  byBusiness: KeyCount[];
  byRevenue: KeyCount[];
  byBottleneck: KeyCount[];
  byHeard: KeyCount[];
  leads: ProspectRow[];
  truncated: boolean;
}

function leadStatus(metadata: unknown): "partial" | "complete" {
  if (
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata) &&
    (metadata as { status?: unknown }).status === "complete"
  ) {
    return "complete";
  }
  return "partial";
}

function labeledQual(metadata: unknown, field: string): string | null {
  const raw = qualificationValue(metadata, field);
  if (!raw) return null;
  return QUAL_LABELS.get(raw) ?? raw;
}

export async function getProspectsData(): Promise<ProspectsData | null> {
  const admin = await getPlatformAdmin();
  if (!admin.ok) return null;

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("waitlist_leads")
      .select("email, source, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(USERS_SCAN_CAP);

    const rows = data ?? [];
    const leads: ProspectRow[] = rows.map((row) => ({
      email: row.email,
      status: leadStatus(row.metadata),
      business: labeledQual(row.metadata, "primaryBusiness"),
      revenue: labeledQual(row.metadata, "annualRevenue"),
      heard: labeledQual(row.metadata, "hearAbout"),
      source: row.source,
      joined: row.created_at,
    }));

    return {
      total: leads.length,
      complete: leads.filter((lead) => lead.status === "complete").length,
      partial: leads.filter((lead) => lead.status === "partial").length,
      byBusiness: bucketQualification(rows, "primaryBusiness"),
      byRevenue: bucketQualification(rows, "annualRevenue"),
      byBottleneck: bucketQualification(rows, "operationalBottleneck"),
      byHeard: bucketQualification(rows, "hearAbout"),
      leads,
      truncated: rows.length >= USERS_SCAN_CAP,
    };
  } catch (error) {
    console.error("[admin] prospects rollup failed:", error);
    return null;
  }
}

export interface PersonRow {
  id: string;
  name: string;
  email: string | null;
  plan: string | null;
  status: AccountStatus;
  playsUsed: number;
  playsIncluded: number;
  joined: string;
  canceledAt: string | null;
  stripeCustomerId: string | null;
}

export interface PeopleDirectoryData {
  people: PersonRow[];
  truncated: boolean;
}

export async function getPeopleDirectory(): Promise<PeopleDirectoryData | null> {
  const admin = await getPlatformAdmin();
  if (!admin.ok) return null;

  try {
    const supabase = createAdminClient();
    const monthStart = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
    ).toISOString();

    const [profileRows, memberRows, subRows, usageRows] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, email, display_name, full_name, first_name, last_name, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(USERS_SCAN_CAP),
      supabase
        .from("workspace_members")
        .select("user_id, workspace_id, created_at")
        .order("created_at", { ascending: true })
        .limit(USERS_SCAN_CAP),
      supabase
        .from("workspace_subscriptions")
        .select(
          "workspace_id, tier, status, cancel_at_period_end, plays_included_override, pricing_version, stripe_customer_id, updated_at",
        )
        .limit(USERS_SCAN_CAP),
      supabase
        .from("usage_events")
        .select("workspace_id, reverses_event_id")
        .eq("event_type", "play_executed")
        .eq("billable", true)
        .gte("created_at", monthStart)
        .limit(SPEND_SCAN_CAP),
    ]);

    const profiles = profileRows.data ?? [];
    const members = memberRows.data ?? [];
    const subs = subRows.data ?? [];
    const usage = usageRows.data ?? [];

    const firstWorkspace = new Map<string, string>();
    for (const row of members) {
      if (!firstWorkspace.has(row.user_id)) {
        firstWorkspace.set(row.user_id, row.workspace_id);
      }
    }

    const subByWorkspace = new Map(subs.map((row) => [row.workspace_id, row]));

    const usedByWorkspace = new Map<string, number>();
    for (const row of usage) {
      if (row.reverses_event_id != null) continue;
      usedByWorkspace.set(
        row.workspace_id,
        (usedByWorkspace.get(row.workspace_id) ?? 0) + 1,
      );
    }

    const people: PersonRow[] = profiles.map((profile) => {
      const workspaceId = firstWorkspace.get(profile.id);
      const sub = workspaceId ? subByWorkspace.get(workspaceId) : undefined;
      const status = sub
        ? mapAccountStatus(sub)
        : "trial";
      const name =
        profile.display_name ||
        profile.full_name ||
        [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
        profile.email ||
        profile.id;
      return {
        id: profile.id,
        name,
        email: profile.email,
        plan: sub?.tier ?? null,
        status,
        playsUsed: workspaceId ? (usedByWorkspace.get(workspaceId) ?? 0) : 0,
        playsIncluded: resolvePlaysIncluded(
          sub?.tier,
          sub?.plays_included_override,
          sub?.pricing_version,
        ),
        joined: profile.created_at,
        canceledAt:
          status === "canceled" || status === "canceling"
            ? (sub?.updated_at ?? null)
            : null,
        stripeCustomerId: sub?.stripe_customer_id ?? null,
      };
    });

    return {
      people,
      truncated:
        profiles.length >= USERS_SCAN_CAP ||
        members.length >= USERS_SCAN_CAP ||
        subs.length >= USERS_SCAN_CAP ||
        usage.length >= SPEND_SCAN_CAP,
    };
  } catch (error) {
    console.error("[admin] people directory rollup failed:", error);
    return null;
  }
}
