/**
 * Sources plan 4.3 — Gmail sender-scoped filter experiment (live).
 *
 * Two measurements against a real connected Gmail account:
 *
 *   Part A — query length limits. Gmail documents no hard `q` limit, so we
 *   probe escalating sender-scoped queries (both `from:(a OR b)` and
 *   `{from:a from:b}` syntaxes) with synthetic senders and record where the
 *   API starts rejecting or degrading. This gates whether per-workspace
 *   sender scoping is even buildable BEFORE any UI work.
 *
 *   Part B — delivered-event reduction. Fetch the last 7 days under the
 *   CURRENT seeded trigger query, then measure what fraction of those
 *   messages come from senders already in Memory (people.email). That
 *   fraction is what a sender-scoped trigger would still deliver; the rest
 *   is the delivered-event reduction (deferred to Lane B discovery).
 *
 * Run: op run --env-file=.env.1password -- pnpm tsx scripts/gmail-sender-filter-experiment.ts
 * (needs COMPOSIO_API_KEY + NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY;
 *  use .env.staging.1password to run against staging instead)
 */

import { Composio } from "@composio/core";
import { createClient } from "@supabase/supabase-js";

import { buildSenderScopedQuery } from "../app/_features/capture/services/gmail-sender-query";

const GMAIL_FETCH = "GMAIL_FETCH_EMAILS";
const LOOKBACK_DAYS = 7;
const REDUCTION_PAGE_CAP = 5;
const PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} not set — run via op run --env-file=.env.1password`);
    process.exit(1);
  }
  return value;
}

const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const composio = new Composio({ apiKey: requireEnv("COMPOSIO_API_KEY") });

interface GmailTarget {
  workspaceId: string;
  connectionId: string;
  email: string | null;
}

async function findGmailTarget(): Promise<GmailTarget> {
  const { data, error } = await supabase
    .from("workspace_integrations")
    .select("workspace_id, composio_connection_id, config, capture_enabled")
    .eq("provider", "gmail")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error(`Failed to query workspace_integrations: ${error.message}`);
    process.exit(1);
  }
  const row =
    (data ?? []).find((r) => r.capture_enabled && r.composio_connection_id) ??
    (data ?? []).find((r) => r.composio_connection_id);
  if (!row) {
    console.error("No active Gmail connection found in this environment.");
    process.exit(1);
  }
  const config = (row.config ?? {}) as Record<string, unknown>;
  return {
    workspaceId: row.workspace_id as string,
    connectionId: row.composio_connection_id as string,
    email: typeof config.email === "string" ? config.email : null,
  };
}

async function loadMemoryEmails(workspaceId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("people")
    .select("email")
    .eq("workspace_id", workspaceId)
    .not("email", "is", null)
    .limit(1000);
  if (error) {
    console.error(`Failed to load people: ${error.message}`);
    process.exit(1);
  }
  return new Set(
    (data ?? [])
      .map((r) => (r.email as string | null)?.trim().toLowerCase())
      .filter((e): e is string => Boolean(e))
  );
}

// ---------------------------------------------------------------------------
// Composio fetch helper
// ---------------------------------------------------------------------------

interface FetchOutcome {
  ok: boolean;
  latencyMs: number;
  messageCount?: number;
  messages?: unknown[];
  nextPageToken?: string;
  error?: string;
}

async function fetchPage(
  target: GmailTarget,
  query: string,
  maxResults: number,
  pageToken?: string,
  includePayload = false
): Promise<FetchOutcome> {
  const started = Date.now();
  try {
    const result = (await composio.tools.execute(GMAIL_FETCH, {
      userId: target.workspaceId,
      connectedAccountId: target.connectionId,
      arguments: {
        query,
        max_results: maxResults,
        page_token: pageToken,
        include_payload: includePayload,
        verbose: false,
      },
      dangerouslySkipVersionCheck: true,
    })) as Record<string, unknown>;

    const latencyMs = Date.now() - started;
    // Composio wraps tool payloads; unwrap the common envelopes.
    let payload: unknown = result;
    for (const key of ["data", "result", "response"]) {
      if (payload && typeof payload === "object" && key in payload) {
        payload = (payload as Record<string, unknown>)[key];
      }
    }
    const record = (payload ?? {}) as Record<string, unknown>;
    const messages =
      [record.messages, record.data, record.emails, record.results].find(Array.isArray) ?? [];
    const token = record.nextPageToken;
    return {
      ok: true,
      latencyMs,
      messageCount: messages.length,
      messages: messages as unknown[],
      nextPageToken: typeof token === "string" && token.length > 0 ? token : undefined,
    };
  } catch (error) {
    // Walk the cause chain — the SDK wraps API errors (e.g. the 410
    // expired-connection body) two levels deep.
    const parts: string[] = [];
    let cursor: unknown = error;
    for (let depth = 0; depth < 4 && cursor; depth++) {
      const e = cursor as {
        message?: string;
        code?: number | string;
        status?: number;
        cause?: unknown;
      };
      if (e?.message) parts.push(e.message.slice(0, 200));
      if (e?.status) parts.push(`http=${e.status}`);
      cursor = e?.cause;
    }
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: parts.join(" | "),
    };
  }
}

// ---------------------------------------------------------------------------
// Part A — query length limits
// ---------------------------------------------------------------------------

function syntheticSenders(count: number): string[] {
  // ~30-char addresses to track real-world email length, not best-case.
  return Array.from({ length: count }, (_, i) => `first.last${i}@example-company.com`);
}

function braceSyntaxQuery(emails: string[]): string {
  return `{${emails.map((e) => `from:${e}`).join(" ")}}`;
}

async function runLengthProbe(target: GmailTarget): Promise<void> {
  console.log("\n=== Part A: Gmail query length limits (synthetic senders) ===");
  const sizes = [10, 25, 50, 75, 100, 150, 200, 300];

  for (const syntax of ["or-group", "brace"] as const) {
    console.log(`\n-- syntax: ${syntax} --`);
    for (const size of sizes) {
      const emails = syntheticSenders(size);
      const query =
        syntax === "or-group" ? buildSenderScopedQuery(emails) : braceSyntaxQuery(emails);
      const outcome = await fetchPage(target, query, 1);
      const status = outcome.ok
        ? `OK (${outcome.messageCount} msgs)`
        : `FAIL: ${(outcome.error ?? "").slice(0, 120)}`;
      console.log(
        `  ${String(size).padStart(3)} senders | ${String(query.length).padStart(5)} chars | ${String(outcome.latencyMs).padStart(5)}ms | ${status}`
      );
      if (!outcome.ok) break; // found this syntax's ceiling
    }
  }
}

// ---------------------------------------------------------------------------
// Part B — delivered-event reduction
// ---------------------------------------------------------------------------

function extractFromHeader(message: unknown): string | null {
  if (!message || typeof message !== "object") return null;
  const record = message as Record<string, unknown>;
  const payload = record.payload as Record<string, unknown> | undefined;
  const headers = payload?.headers;
  if (Array.isArray(headers)) {
    for (const header of headers) {
      const h = header as Record<string, unknown>;
      if (typeof h.name === "string" && h.name.toLowerCase() === "from") {
        const value = typeof h.value === "string" ? h.value : "";
        const match = value.match(/[^\s<>]+@[^\s<>]+/);
        return match ? match[0].toLowerCase() : null;
      }
    }
  }
  const from = record.from ?? record.sender;
  if (typeof from === "string") {
    const match = from.match(/[^\s<>]+@[^\s<>]+/);
    return match ? match[0].toLowerCase() : null;
  }
  return null;
}

function hasLabel(message: unknown, label: string): boolean {
  const labels = (message as Record<string, unknown>)?.labelIds;
  return Array.isArray(labels) && labels.includes(label);
}

async function runReductionMeasurement(
  target: GmailTarget,
  memoryEmails: Set<string>
): Promise<void> {
  console.log("\n=== Part B: delivered-event reduction (real mail, 7d) ===");
  const after = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]
    .replace(/-/g, "/");
  // The CURRENT seeded trigger query (20260807000000_capture_cost_controls).
  const currentQuery = `{label:inbox label:sent} -category:promotions -category:social -category:updates -category:forums after:${after}`;

  const messages: unknown[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < REDUCTION_PAGE_CAP; page++) {
    const outcome = await fetchPage(target, currentQuery, PAGE_SIZE, pageToken, true);
    if (!outcome.ok) {
      console.log(`  fetch failed on page ${page + 1}: ${outcome.error}`);
      break;
    }
    messages.push(...(outcome.messages ?? []));
    if (!outcome.nextPageToken || (outcome.messageCount ?? 0) === 0) break;
    pageToken = outcome.nextPageToken;
  }

  let known = 0;
  let unknown = 0;
  let sentByUser = 0;
  const unknownSenders = new Map<string, number>();

  for (const message of messages) {
    if (hasLabel(message, "SENT")) {
      sentByUser++;
      continue;
    }
    const from = extractFromHeader(message);
    if (from && memoryEmails.has(from)) {
      known++;
    } else {
      unknown++;
      if (from) unknownSenders.set(from, (unknownSenders.get(from) ?? 0) + 1);
    }
  }

  const inbound = known + unknown;
  console.log(`  window: ${LOOKBACK_DAYS}d, query: ${currentQuery}`);
  console.log(`  messages sampled: ${messages.length} (cap ${REDUCTION_PAGE_CAP * PAGE_SIZE})`);
  console.log(`  sent by user (reply-loop learning): ${sentByUser}`);
  console.log(`  inbound from Memory-known senders:  ${known}`);
  console.log(`  inbound from UNKNOWN senders:       ${unknown}`);
  if (inbound > 0) {
    const reduction = ((unknown / inbound) * 100).toFixed(1);
    console.log(
      `  → sender-scoped trigger would suppress ~${reduction}% of inbound deliveries (deferred to Lane B)`
    );
  }
  console.log(`  Memory senders on file: ${memoryEmails.size}`);

  const topUnknown = [...unknownSenders.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (topUnknown.length > 0) {
    console.log("  top unknown senders (would rely on Lane B discovery):");
    for (const [sender, count] of topUnknown) {
      console.log(`    ${String(count).padStart(3)}× ${sender}`);
    }
  }

  // Positive control: a sender-scoped query for an address we KNOW has mail
  // in the window must return their message — proves the filter is applied,
  // not silently ignored (Part A only proved long queries don't error).
  const control = topUnknown[0]?.[0] ?? [...memoryEmails][0];
  if (control) {
    const outcome = await fetchPage(
      target,
      `${buildSenderScopedQuery([control])} after:${after}`,
      10,
      undefined,
      true
    );
    const hits = (outcome.messages ?? []).filter((m) => extractFromHeader(m) === control);
    console.log(
      `  positive control: from:(${control}) → ${outcome.ok ? `${hits.length} matching msg(s)` : `FAIL: ${outcome.error}`}`
    );
  }
}

// ---------------------------------------------------------------------------

async function main() {
  const target = await findGmailTarget();
  console.log(
    `Target: workspace ${target.workspaceId} (connection ${target.connectionId}, ${target.email ?? "email unknown"})`
  );
  const memoryEmails = await loadMemoryEmails(target.workspaceId);
  console.log(`Memory people with email: ${memoryEmails.size}`);

  await runLengthProbe(target);
  await runReductionMeasurement(target, memoryEmails);

  console.log(
    "\nDone. Record results in docs/plans/2026-08-07-sources-composio-scale-trust-cost.md (4.3)."
  );
}

main().catch((error) => {
  console.error("Experiment failed:", error);
  process.exit(1);
});
