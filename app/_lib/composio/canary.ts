import "server-only";

import { getComposioClient } from "@/app/_lib/composio/client";
import { COMPOSIO_TOOL_SLUGS } from "@/app/_lib/composio/tool-slugs";
import { createAdminClient } from "@/app/_lib/supabase/admin";

/**
 * Composio slug canary (Founder Ops Phase 1).
 *
 * The Aug 2026 Outlook break proved a toolkit rework kills slugs server-side
 * with no SDK signal: both the metadata and execute endpoints 404, and every
 * caller silently failed for weeks. This probe reads tool METADATA
 * (`tools.getRawComposioToolBySlug`) for the read-class slugs Salt actually
 * executes — zero metering cost, zero user data, no connected account needed.
 *
 * Verified live 2026-08-29 (scripts/verify-canary-probe.ts): a dead slug
 * rejects with ComposioToolNotFoundError whose cause carries status 404
 * (Tool_ToolNotFound); a live slug resolves with inputParameters present.
 * The SDK wraps ALL retrieve errors in ComposioToolNotFoundError, so the
 * HTTP status is read off `error.cause` to tell a dead slug (404) from a
 * transient 5xx.
 *
 * Alerting: a slug alerts only at ALERT_THRESHOLD consecutive failures
 * (flap protection for transient 5xx), computed from platform_health_checks
 * history, and emails exactly once at the crossing plus once on recovery.
 * The VERCEL_ENV gate lives in the cron route, not here.
 */

export const CANARY_KIND = "slug_canary";
export const ALERT_THRESHOLD = 2;

export interface CanaryTarget {
  toolkit: string;
  slug: string;
}

/**
 * Critical read-class slugs per toolkit — the exact COMPOSIO_TOOL_SLUGS
 * values the capture/agent paths execute, so a server-side slug rework is
 * caught where it hurts. Only slugs verified live belong here (e.g.
 * QUICKBOOKS_CUSTOMER_BALANCE_DETAIL, not the reworked 2026-07-13 block).
 */
export const CANARY_SLUGS: readonly CanaryTarget[] = [
  { toolkit: "outlook", slug: COMPOSIO_TOOL_SLUGS.OUTLOOK_GET_MESSAGE },
  { toolkit: "outlook", slug: COMPOSIO_TOOL_SLUGS.OUTLOOK_LIST_MESSAGES },
  { toolkit: "gmail", slug: COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES },
  { toolkit: "gmail", slug: COMPOSIO_TOOL_SLUGS.GMAIL_GET_MESSAGE },
  { toolkit: "googlecalendar", slug: COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_LIST_EVENTS },
  { toolkit: "googlecalendar", slug: COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_GET_EVENT },
  { toolkit: "stripe", slug: COMPOSIO_TOOL_SLUGS.STRIPE_LIST_CUSTOMERS },
  { toolkit: "stripe", slug: COMPOSIO_TOOL_SLUGS.STRIPE_RETRIEVE_BALANCE },
  { toolkit: "quickbooks", slug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_CUSTOMER_BALANCE_DETAIL },
  { toolkit: "googledrive", slug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_FIND_FILE },
  { toolkit: "googledrive", slug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_LIST_FILES },
  { toolkit: "slack", slug: COMPOSIO_TOOL_SLUGS.SLACK_FETCH_CONVERSATION_HISTORY },
  { toolkit: "slack", slug: COMPOSIO_TOOL_SLUGS.SLACK_CONVERSATIONS_LIST },
  { toolkit: "cal", slug: COMPOSIO_TOOL_SLUGS.CAL_FETCH_ALL_BOOKINGS },
  { toolkit: "calendly", slug: COMPOSIO_TOOL_SLUGS.CALENDLY_LIST_EVENTS },
  { toolkit: "fireflies", slug: COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_TRANSCRIPT },
  { toolkit: "zoom", slug: COMPOSIO_TOOL_SLUGS.ZOOM_LIST_MEETINGS },
  { toolkit: "notion", slug: COMPOSIO_TOOL_SLUGS.NOTION_SEARCH_ENTITY },
  { toolkit: "dropbox", slug: COMPOSIO_TOOL_SLUGS.DROPBOX_LIST_FILES_IN_FOLDER },
  { toolkit: "hubspot", slug: COMPOSIO_TOOL_SLUGS.HUBSPOT_LIST_COMPANY_ACTIVITIES },
];

export interface CanaryResult {
  kind: typeof CANARY_KIND;
  target: string;
  toolkit: string;
  status: "ok" | "failed";
  errorCode: string | null;
  errorMessage: string | null;
  latencyMs: number;
  checkedAt: string;
}

export interface CanaryHistoryRow {
  status: string;
  checked_at: string;
}

export interface CanaryStreakSignal {
  type: "failure" | "recovery";
  toolkit: string;
  slug: string;
  streak: number;
  /** checked_at of the oldest failure in the streak (evidence for the email). */
  firstSeenAt: string | null;
}

export interface CanaryAlert extends CanaryStreakSignal {
  result: CanaryResult;
}

export interface CanaryRunSummary {
  results: CanaryResult[];
  failedCount: number;
  alerts: CanaryAlert[];
}

/** Resolves tool metadata or throws. Injectable for tests. */
export type CanaryProbe = (slug: string) => Promise<unknown>;

/** Persistence seam — the Supabase-backed default lives at the bottom. */
export interface CanaryStore {
  insertResults(rows: CanaryResult[]): Promise<void>;
  /** Most recent rows for a target, newest first, EXCLUDING the current run. */
  recentHistory(target: string, limit: number): Promise<CanaryHistoryRow[]>;
}

function httpStatusOf(error: unknown): number | null {
  const cause = error instanceof Error ? (error as { cause?: unknown }).cause : null;
  if (cause && typeof cause === "object" && "status" in cause) {
    const status = Number((cause as { status: unknown }).status);
    return Number.isFinite(status) ? status : null;
  }
  return null;
}

function classifyProbeError(error: unknown): { code: string; message: string } {
  const message = error instanceof Error ? error.message : String(error);
  const status = httpStatusOf(error);
  if (status === 404) return { code: "tool_not_found", message };
  if (status !== null && status >= 500) return { code: "composio_5xx", message };
  if (status !== null) return { code: `http_${status}`, message };
  return { code: "probe_error", message };
}

function hasInputSchema(tool: unknown): boolean {
  return (
    typeof tool === "object" &&
    tool !== null &&
    "inputParameters" in tool &&
    typeof (tool as { inputParameters: unknown }).inputParameters === "object" &&
    (tool as { inputParameters: unknown }).inputParameters !== null
  );
}

/** Probe one slug: content-asserted (schema present), latency-measured. */
export async function probeSlug(
  target: CanaryTarget,
  probe: CanaryProbe,
  checkedAt: string,
): Promise<CanaryResult> {
  const started = Date.now();
  const base = {
    kind: CANARY_KIND,
    target: target.slug,
    toolkit: target.toolkit,
    checkedAt,
  } as const;

  try {
    const tool = await probe(target.slug);
    const latencyMs = Date.now() - started;
    if (!hasInputSchema(tool)) {
      return {
        ...base,
        status: "failed",
        errorCode: "schema_missing",
        errorMessage: "Tool metadata resolved without inputParameters",
        latencyMs,
      };
    }
    return {
      ...base,
      status: "ok",
      errorCode: null,
      errorMessage: null,
      latencyMs,
    };
  } catch (error) {
    const { code, message } = classifyProbeError(error);
    return {
      ...base,
      status: "failed",
      errorCode: code,
      errorMessage: message.slice(0, 500),
      latencyMs: Date.now() - started,
    };
  }
}

/**
 * Derive at most one alert from a target's history. `history` is newest-first
 * and INCLUDES the current run's row at index 0.
 *
 * Failure alerts fire only when the streak lands exactly on ALERT_THRESHOLD
 * (2 → alert once; 3, 4, … stay silent until recovery). Recovery fires when
 * the current row is ok and the streak it broke had reached the threshold
 * (i.e. a failure alert actually went out).
 */
export function computeStreakAlert(
  target: CanaryTarget,
  history: CanaryHistoryRow[],
): CanaryStreakSignal | null {
  const current = history[0];
  if (!current) return null;

  if (current.status === "failed") {
    let streak = 0;
    for (const row of history) {
      if (row.status !== "failed") break;
      streak += 1;
    }
    if (streak !== ALERT_THRESHOLD) return null;
    return {
      type: "failure",
      toolkit: target.toolkit,
      slug: target.slug,
      streak,
      firstSeenAt: history[streak - 1]?.checked_at ?? null,
    };
  }

  let previousStreak = 0;
  for (let i = 1; i < history.length; i += 1) {
    if (history[i].status !== "failed") break;
    previousStreak += 1;
  }
  if (previousStreak < ALERT_THRESHOLD) return null;
  return {
    type: "recovery",
    toolkit: target.toolkit,
    slug: target.slug,
    streak: previousStreak,
    firstSeenAt: history[previousStreak]?.checked_at ?? null,
  };
}

const defaultProbe: CanaryProbe = (slug) =>
  getComposioClient().tools.getRawComposioToolBySlug(slug);

/**
 * Evidence-first subject + body lines for the ops alert email. Failures lead;
 * a recovery-only run still mails (the founder is waiting on it).
 */
export function formatCanaryAlertEmail(alerts: CanaryAlert[]): {
  subject: string;
  lines: string[];
} {
  const failures = alerts.filter((alert) => alert.type === "failure");
  const subject =
    failures.length > 0
      ? `[Salt ops] Composio canary: ${failures.length} slug${failures.length === 1 ? "" : "s"} failing`
      : `[Salt ops] Composio canary: ${alerts.length} slug${alerts.length === 1 ? "" : "s"} recovered`;

  const lines = alerts.flatMap((alert) => {
    if (alert.type === "recovery") {
      return [
        `RECOVERED ${alert.slug} (${alert.toolkit}) — ok after ${alert.streak} consecutive failures`,
        "",
      ];
    }
    return [
      `FAILING ${alert.slug} (${alert.toolkit}) — ${alert.streak} consecutive failures`,
      `  error: ${alert.result.errorCode ?? "unknown"} — ${alert.result.errorMessage ?? "no message"}`,
      `  first seen: ${alert.firstSeenAt ?? "unknown"}`,
      `  last check: ${alert.result.checkedAt} (${alert.result.latencyMs}ms)`,
      "",
    ];
  });

  return { subject, lines };
}

/**
 * Probe every registry slug, persist results, and return the run summary
 * with any threshold-crossing alerts. Sending email is the caller's job
 * (the cron route gates on VERCEL_ENV).
 */
export async function runSlugCanary(deps?: {
  probe?: CanaryProbe;
  store?: CanaryStore;
  now?: Date;
}): Promise<CanaryRunSummary> {
  const probe = deps?.probe ?? defaultProbe;
  const store = deps?.store ?? createSupabaseCanaryStore();
  const checkedAt = (deps?.now ?? new Date()).toISOString();

  const results = await Promise.all(
    CANARY_SLUGS.map((target) => probeSlug(target, probe, checkedAt)),
  );

  const alerts: CanaryAlert[] = [];
  for (let i = 0; i < CANARY_SLUGS.length; i += 1) {
    const target = CANARY_SLUGS[i];
    const previous = await store.recentHistory(target.slug, ALERT_THRESHOLD);
    const signal = computeStreakAlert(target, [
      { status: results[i].status, checked_at: results[i].checkedAt },
      ...previous,
    ]);
    if (signal) {
      alerts.push({ ...signal, result: results[i] });
    }
  }

  await store.insertResults(results);

  return {
    results,
    failedCount: results.filter((r) => r.status === "failed").length,
    alerts,
  };
}

function createSupabaseCanaryStore(): CanaryStore {
  const supabase = createAdminClient();
  return {
    async insertResults(rows) {
      const { error } = await supabase.from("platform_health_checks").insert(
        rows.map((row) => ({
          kind: row.kind,
          target: row.target,
          toolkit: row.toolkit,
          status: row.status,
          error_code: row.errorCode,
          error_message: row.errorMessage,
          latency_ms: row.latencyMs,
          checked_at: row.checkedAt,
        })),
      );
      if (error) throw new Error(`platform_health_checks insert failed: ${error.message}`);
    },
    async recentHistory(target, limit) {
      const { data, error } = await supabase
        .from("platform_health_checks")
        .select("status, checked_at")
        .eq("kind", CANARY_KIND)
        .eq("target", target)
        .order("checked_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(`platform_health_checks read failed: ${error.message}`);
      return data ?? [];
    },
  };
}
