/**
 * Waitlist conversion report (service role).
 *
 * Reads marketing_funnel_events + waitlist_leads / waitlist_leads_sheet.
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   pnpm waitlist:report
 *   pnpm waitlist:report -- --days 7
 *   pnpm waitlist:report -- --export csv > waitlist-complete.csv
 *   pnpm waitlist:report:op
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required environment variables:");
  console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type FunnelRow = { event: string; created_at: string };

function parseArgs(argv: string[]) {
  let days: number | null = null;
  let exportCsv = false;
  let statusFilter: "complete" | "all" = "complete";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--export" && argv[i + 1] === "csv") {
      exportCsv = true;
      i += 1;
    } else if (arg === "--days" && argv[i + 1]) {
      days = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--status" && argv[i + 1]) {
      const value = argv[i + 1];
      if (value === "complete" || value === "all") {
        statusFilter = value;
      }
      i += 1;
    }
  }

  return { days, exportCsv, statusFilter };
}

function projectRef(url: string): string {
  return url.match(/https:\/\/([^.]+)/)?.[1] ?? "unknown";
}

function countEvents(rows: FunnelRow[], event: string): number {
  return rows.filter((row) => row.event === event).length;
}

function conversionPct(views: number, signups: number): string {
  if (views === 0) return "0.00";
  return ((100 * signups) / views).toFixed(2);
}

function csvEscape(value: unknown): string {
  const text =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

async function fetchFunnelEvents(since: Date | null): Promise<FunnelRow[]> {
  let query = supabase
    .from("marketing_funnel_events")
    .select("event, created_at")
    .order("created_at", { ascending: false });

  if (since) {
    query = query.gte("created_at", since.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`marketing_funnel_events: ${error.message}`);
  }
  return (data ?? []) as FunnelRow[];
}

async function fetchLeadStatusCounts(): Promise<
  Array<{ status: string; leads: number }>
> {
  const { data, error } = await supabase.from("waitlist_leads").select("metadata");

  if (error) {
    throw new Error(`waitlist_leads: ${error.message}`);
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const metadata = row.metadata as { status?: string } | null;
    const status = metadata?.status ?? "unknown";
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([status, leads]) => ({ status, leads }))
    .sort((a, b) => a.status.localeCompare(b.status));
}

async function exportSheetCsv(statusFilter: "complete" | "all"): Promise<void> {
  let query = supabase.from("waitlist_leads_sheet").select("*");

  if (statusFilter === "complete") {
    query = query.eq("status", "complete");
  }

  const { data, error } = await query.order("completed_at", {
    ascending: false,
    nullsFirst: false,
  });

  if (error) {
    throw new Error(`waitlist_leads_sheet: ${error.message}`);
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  if (rows.length === 0) {
    console.log("");
    return;
  }

  const columns = Object.keys(rows[0]);
  console.log(columns.map(csvEscape).join(","));
  for (const row of rows) {
    console.log(columns.map((col) => csvEscape(row[col])).join(","));
  }
}

async function printReport(days: number | null): Promise<void> {
  const since =
    days !== null && days > 0
      ? new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      : null;

  const funnelRows = await fetchFunnelEvents(since);
  const views = countEvents(funnelRows, "homepage_view");
  const partials = countEvents(funnelRows, "waitlist_partial");
  const submits = countEvents(funnelRows, "waitlist_submit");
  const signups = countEvents(funnelRows, "waitlist_success");

  const leadCounts = await fetchLeadStatusCounts();

  const windowLabel =
    since === null ? "all time" : `last ${days} day(s) since ${since.toISOString()}`;

  console.log(`project: ${projectRef(SUPABASE_URL!)}`);
  console.log(`funnel window: ${windowLabel}`);
  console.log("");
  console.log("Funnel events (marketing_funnel_events)");
  console.log(`  homepage_view:     ${views}`);
  console.log(`  waitlist_partial:  ${partials}`);
  console.log(`  waitlist_submit:   ${submits}`);
  console.log(`  waitlist_success:  ${signups}`);
  console.log(
    `  conversion (success / homepage_view): ${conversionPct(views, signups)}%`
  );
  console.log("");
  console.log("Waitlist leads (waitlist_leads.metadata.status)");
  for (const row of leadCounts) {
    console.log(`  ${row.status}: ${row.leads}`);
  }
  console.log("");
  console.log(
    "Export complete signups: pnpm waitlist:report -- --export csv > waitlist-complete.csv"
  );
}

async function main() {
  const { days, exportCsv, statusFilter } = parseArgs(process.argv.slice(2));

  if (exportCsv) {
    await exportSheetCsv(statusFilter);
    return;
  }

  await printReport(days);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
