import "server-only";

import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { listQueueFindings } from "@/app/_features/capture/queries/intelligence-findings";
import { mapFindingToCard } from "./play-card/map-finding-to-card";
import { mapHandledFindingToCard } from "./play-card/map-handled-finding-to-card";
import { mapPlayRunToCardClient } from "./play-card/map-play-run-to-card-client";
import { validatePlayCard } from "./play-card/validate-play-card";
import type { PlayCardViewModel } from "./play-card/types";
import type {
  ActivityEntryRow,
  HqQueuePlayView,
  OpportunityGapRow,
  PlayActivityCounts,
  PlayActivityRunRow,
  PlayRunSourceSnippet,
  PlaybookBlueprintView,
  PlayChannel,
  PlayerSlug,
  PlayerView,
  PlayRunRow,
  PlayRunState,
  QueuePlayView,
} from "./types";
import type { PlaybookBlueprintRow } from "./playbooks/types";
import { isActLayerPlayRun } from "./utils/plays-activity-filter";
import { activityCategoryForState } from "./utils/map-play-run-to-activity";
import {
  filterActivityScanRows,
  paginateActivityRows,
  type ActivityPageFilter,
  type ActivityScanRow,
} from "./utils/activity-page-filter";

interface PlayRunSourceRow {
  play_run_id: string;
  label: string | null;
  excerpt: string | null;
  external_url: string | null;
  source_type: string | null;
}
// v1 authored playbooks removed - v2 playbooks are filesystem-based
import { normalizePlaybookTrigger } from "./utils/playbook-display";
import type {
  ProfileFillRulesDocument,
  ProfilePlaybookSettings,
} from "./playbooks/records-engine/types";
import { getPlaybookBySlug } from "./playbooks/schema/v2/discovery";
import { discoverV2Playbooks } from "./playbooks/schema/v2/discovery";
import type { PlaybookSection } from "./playbooks/schema/v2/types";
import { getCaptureCategoryMap } from "@/app/_lib/composio/capture-categories";
import {
  computePlaybookRunStats,
  computeWorkspaceRunStats,
  estimatePlaybookRunDurationMs,
  type CompletedRunRow,
  type PlaybookRunStats,
  type WorkspaceRunStats,
} from "./run-stats";

const DEFAULT_PLAYER_SLUG: PlayerSlug = "follow-up";

function mapChannel(value: string | null): PlayChannel {
  const allowed: PlayChannel[] = ["Gmail", "Slack", "Notion", "Memory", "Stripe"];
  if (value && allowed.includes(value as PlayChannel)) {
    return value as PlayChannel;
  }
  return "Gmail";
}

function mapPlayerSlug(slug: string | null | undefined): PlayerSlug {
  const allowed: PlayerSlug[] = [
    "follow-up",
    "brief",
    "client-risk",
    "scope",
    "billing",
    "memory-care",
    "general",
  ];
  // The retired "keeper" slug maps onto Memory Care.
  const normalized = slug === "keeper" ? "memory-care" : slug;
  if (normalized && allowed.includes(normalized as PlayerSlug)) {
    return normalized as PlayerSlug;
  }
  return DEFAULT_PLAYER_SLUG;
}

function ageMinutesFromIso(iso: string): number {
  const created = new Date(iso).getTime();
  const diff = Date.now() - created;
  return Math.max(1, Math.round(diff / 60_000));
}

function mapPlayRunToQueueView(row: PlayRunRow & { template_name?: string | null }): QueuePlayView {
  const draftBody = row.draft_body
    ? row.draft_body.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)
    : row.preview
      ? [row.preview]
      : [row.title];

  return {
    id: row.id,
    playerId: mapPlayerSlug(row.player_slug),
    playbook: row.template_name ?? (row.template_id ? "Playbook" : "Starter play"),
    subject: row.title,
    recipient: row.recipient_label ?? "Recipient",
    source: "Salt scan",
    channel: mapChannel(row.channel),
    draftBody,
    ageMin: ageMinutesFromIso(row.created_at),
    confidence: row.confidence ?? 90,
  };
}

function mapPlayRunToHqView(row: PlayRunRow): HqQueuePlayView {
  return {
    id: row.id,
    playerId: mapPlayerSlug(row.player_slug),
    playbook: "Starter play",
    title: row.title,
    preview: row.preview ?? row.draft_body ?? "",
    recipient: row.recipient_label ?? "Recipient",
    channel: mapChannel(row.channel),
    channels: (row.channels ?? [])
      .map((c) => mapChannel(c))
      .filter(Boolean) as PlayChannel[],
    eta: row.eta_label ?? "Ready to review",
    confidence: row.confidence ?? 90,
  };
}

async function getWorkspaceId(): Promise<string> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  return workspace.id;
}

export async function listQueuedPlayRuns(): Promise<PlayRunRow[]> {
  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("play_runs")
    .select("*")
    .eq("workspace_id", workspaceId)
    // "blocked" runs are parked on connector failures and must stay visible —
    // the queue is the notification that a reconnect is needed.
    .in("state", ["queued", "draft", "blocked"])
    .order("created_at", { ascending: true })
    .limit(50);

  if (error || !data) return [];

  return data as PlayRunRow[];
}

export async function listAutoHandledPlayRuns(since?: Date): Promise<PlayRunRow[]> {
  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();

  let query = supabase
    .from("play_runs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("queue", "auto_handled")
    .in("state", ["approved", "ran"])
    .order("created_at", { ascending: false })
    .limit(50);

  if (since) {
    query = query.gte("created_at", since.toISOString());
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return data as PlayRunRow[];
}

/** @deprecated Use listHqNeedsYouCards — same source as Plays → Needs You. */
export async function listHqQueuePlays(): Promise<HqQueuePlayView[]> {
  const cards = await listHqNeedsYouCards();
  return cards.map(mapPlayCardToHqView);
}

/**
 * Validated Needs You cards — same source as Plays → Queue → Needs You.
 * Cached per request so HQ briefing counts and the stack share one fetch.
 *
 * Maps play runs with the CLIENT mapper on purpose: Plays counts and renders
 * client-mapped cards, so HQ must run the identical pipeline or the briefing
 * "Need you" number drifts from the Plays badge. The filesystem mapper can
 * fail playbook resolution (`notFound` → profile kind → invalid card) for a
 * run the client mapper resolves fine from metadata, silently dropping it here.
 */
const buildHqNeedsYouCards = cache(async (): Promise<PlayCardViewModel[]> => {
  const [playRuns, findings] = await Promise.all([
    listQueuedPlayRuns(),
    listQueueFindings("needs_you"),
  ]);

  return [
    ...findings.map(mapFindingToCard),
    ...playRuns.map(mapPlayRunToCardClient),
  ].filter((vm) => validatePlayCard(vm).ok);
});

const buildHqAutoHandledCards = cache(async (): Promise<PlayCardViewModel[]> => {
  const findings = await listQueueFindings("auto_handled");

  return findings
    .map(mapHandledFindingToCard)
    .filter((vm) => validatePlayCard(vm).ok);
});

/** Full validated count for HQ briefing + Plays badge parity. */
export async function countHqNeedsYouQueue(): Promise<number> {
  const cards = await buildHqNeedsYouCards();
  return cards.length;
}

/** Validated auto-handled count — mirrors Plays → Auto-Handled tab badge. */
export async function countHqAutoHandledQueue(): Promise<number> {
  const cards = await buildHqAutoHandledCards();
  return cards.length;
}

/** HQ Today stack — first 6 validated Needs You cards. */
export async function listHqNeedsYouCards(): Promise<PlayCardViewModel[]> {
  const cards = await buildHqNeedsYouCards();
  return cards.slice(0, 6);
}

function mapPlayCardToHqView(vm: PlayCardViewModel): HqQueuePlayView {
  const channel = mapChannel(vm.channel);
  const target =
    vm.targetLabel != null
      ? `${vm.targetPrefix} ${vm.targetLabel}`
      : "Ready to review";

  return {
    id: vm.id,
    playerId: mapPlayerSlug(vm.playerSlug),
    playbook: vm.playbookName ?? vm.sectionLabel ?? "Play",
    title: vm.subject,
    preview: vm.preview ?? "",
    recipient: target,
    channel,
    eta:
      vm.ageMinutes != null
        ? `${vm.ageMinutes}m ago`
        : "Ready to review",
    confidence: vm.confidence ?? 90,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Plays → Activity (run-centric)
 *
 * One card per play run. draft/queued stay in the Queue tab; Activity shows
 * everything in flight or finished: executing/scheduled/approved (in progress),
 * ran (completed), failed/blocked (needs attention), dismissed (decided).
 * ──────────────────────────────────────────────────────────────────────────── */

export const PLAY_ACTIVITY_VISIBLE_STATES = [
  "executing",
  "scheduled",
  "approved",
  "ran",
  "failed",
  "blocked",
  "dismissed",
] as const;

export interface PlayActivityPageParams extends ActivityPageFilter {
  page: number;
  pageSize: number;
}

export interface PlayActivityPage {
  runs: PlayActivityRunRow[];
  totalCount: number;
  /** Requested page, clamped into the valid range. */
  page: number;
  pageSize: number;
  counts: PlayActivityCounts;
}

function computeActivityCounts(rows: ActivityScanRow[]): PlayActivityCounts {
  const counts: PlayActivityCounts = {
    completed: 0,
    decided: 0,
    inProgress: 0,
    needsAttention: 0,
  };
  for (const row of rows) {
    const category = activityCategoryForState(row.state);
    if (category === "in-progress") counts.inProgress += 1;
    if (category === "needs-attention") counts.needsAttention += 1;
    if (category === "completed") counts.completed += 1;
    if (category === "decided") counts.decided += 1;
  }
  return counts;
}

/**
 * One page of the Activity feed, filtered and counted exactly.
 *
 * Phase 1 scans minimal columns for every visible run: the act-layer
 * allowlist depends on the filesystem playbook registry, so it cannot be
 * pushed into SQL. Scanning cheap columns keeps the total count exact
 * (numbered pagination needs it) without a schema change. Phase 2 then
 * fetches full rows + sources + timeline events for just the page's ids.
 */
export async function getPlayActivityPage(
  params: PlayActivityPageParams,
): Promise<PlayActivityPage> {
  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();
  const pageSize = Math.min(Math.max(1, Math.floor(params.pageSize)), 100);

  const { data, error } = await supabase
    .from("play_runs")
    .select(
      "id, state, title, target_label, recipient_label, ran_at, dismissed_at, updated_at, source_context",
    )
    .eq("workspace_id", workspaceId)
    .in("state", [...PLAY_ACTIVITY_VISIBLE_STATES])
    .order("updated_at", { ascending: false });

  if (error) throw error;

  // Allowlist: only Ask Salt / manual actions and runs attributed to a live
  // act-layer YAML playbook. Retired Care slugs, legacy keeper-* runs, and
  // unattributed historical rows are learn-layer audit history — they belong
  // on Memory surfaces, not here.
  const layerForSlug = (slug: string): "learn" | "act" | null =>
    getPlaybookBySlug(slug)?.definition.layer ?? null;
  const nameForSlug = (slug: string): string | null =>
    getPlaybookBySlug(slug)?.definition.name ?? null;

  const scanRows: ActivityScanRow[] = (data ?? []).map((row) => ({
    id: row.id,
    state: row.state as PlayRunState,
    title: row.title,
    target_label: row.target_label,
    recipient_label: row.recipient_label,
    ran_at: row.ran_at,
    dismissed_at: row.dismissed_at,
    updated_at: row.updated_at,
    source_context:
      row.source_context as ActivityScanRow["source_context"],
  }));

  const actRows = scanRows.filter((row) => isActLayerPlayRun(row, layerForSlug));
  const counts = computeActivityCounts(actRows);
  const filtered = filterActivityScanRows(actRows, params, nameForSlug);
  const slice = paginateActivityRows(filtered, params.page, pageSize);
  const runIds = slice.pageRows.map((row) => row.id);

  if (runIds.length === 0) {
    return {
      runs: [],
      totalCount: slice.totalCount,
      page: slice.page,
      pageSize,
      counts,
    };
  }

  const [runsResult, sourcesResult, entriesResult] = await Promise.all([
    supabase.from("play_runs").select("*").in("id", runIds),
    supabase
      .from("play_run_sources")
      .select("play_run_id, label, excerpt, external_url, source_type")
      .eq("workspace_id", workspaceId)
      .in("play_run_id", runIds),
    supabase
      .from("activity_entries")
      .select(
        "id, workspace_id, play_run_id, actor_user_id, action, title, detail, metadata, created_at",
      )
      .eq("workspace_id", workspaceId)
      .in("play_run_id", runIds)
      .order("created_at", { ascending: false }),
  ]);

  if (runsResult.error) throw runsResult.error;

  // `.in()` does not preserve order — restore the filtered page order.
  const orderById = new Map(runIds.map((id, index) => [id, index]));
  const pageRows = ((runsResult.data ?? []) as PlayRunRow[]).sort(
    (a, b) => (orderById.get(a.id) ?? 0) - (orderById.get(b.id) ?? 0),
  );

  const sourcesByRunId = new Map<string, PlayRunSourceSnippet[]>();
  for (const row of (sourcesResult.data ?? []) as PlayRunSourceRow[]) {
    const list = sourcesByRunId.get(row.play_run_id) ?? [];
    list.push({
      label: row.label,
      excerpt: row.excerpt,
      external_url: row.external_url,
      source_type: row.source_type,
    });
    sourcesByRunId.set(row.play_run_id, list);
  }

  const eventsByRunId = new Map<string, ActivityEntryRow[]>();
  for (const entry of (entriesResult.data ?? []) as ActivityEntryRow[]) {
    if (!entry.play_run_id) continue;
    const list = eventsByRunId.get(entry.play_run_id) ?? [];
    list.push(entry);
    eventsByRunId.set(entry.play_run_id, list);
  }

  const defBySlug = new Map<
    string,
    { name: string; section: PlaybookSection }
  >();
  for (const row of pageRows) {
    const slug = row.source_context?.playbook_slug;
    if (slug && !defBySlug.has(slug)) {
      const definition = getPlaybookBySlug(slug)?.definition;
      if (definition) {
        defBySlug.set(slug, {
          name: definition.name,
          section: definition.section,
        });
      }
    }
  }

  const runs: PlayActivityRunRow[] = pageRows.map((row) => {
    const slug = row.source_context?.playbook_slug;
    const def = slug ? defBySlug.get(slug) : undefined;
    return {
      ...row,
      playbookName: def?.name ?? null,
      playbookSection: def?.section ?? null,
      sources: sourcesByRunId.get(row.id) ?? [],
      events: eventsByRunId.get(row.id) ?? [],
    };
  });

  return { runs, totalCount: slice.totalCount, page: slice.page, pageSize, counts };
}

export async function getPrimaryOpportunityGap(): Promise<OpportunityGapRow | null> {
  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();

  const { data } = await supabase
    .from("opportunity_gaps")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("dismissed_at", null)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as OpportunityGapRow | null) ?? null;
}

export async function countPlayRunsByState(
  states: string[],
): Promise<number> {
  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();

  const { count } = await supabase
    .from("play_runs")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .in("state", states);

  return count ?? 0;
}

export async function countPlaysRanToday(): Promise<number> {
  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("play_runs")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("state", "ran")
    .gte("ran_at", start.toISOString());

  return count ?? 0;
}

export async function getPlayRunById(id: string): Promise<PlayRunRow | null> {
  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();

  const { data } = await supabase
    .from("play_runs")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return (data as PlayRunRow | null) ?? null;
}

function mapBlueprintRow(row: PlaybookBlueprintRow): PlaybookBlueprintView {
  const definition = row.definition as { steps?: unknown[] } | null;
  const fillRules = row.fill_rules as { rules?: unknown[] } | null;
  return {
    slug: row.slug,
    name: row.name,
    kind: row.kind ?? "acting",
    playerSlug: mapPlayerSlug(row.player_slug),
    description: row.description,
    whenToUse: row.when_to_use,
    trigger: normalizePlaybookTrigger(row.trigger),
    version: row.version,
    stepCount: definition?.steps?.length ?? 0,
    requiredActions: row.required_actions ?? [],
    reliabilityLabel: null,
    fillRuleCount: fillRules?.rules?.length ?? 0,
    procedureMd: row.procedure_md ?? null,
    origin: row.origin ?? "salt",
  };
}

/**
 * @deprecated v1 playbooks retired. Use getPlaybooksV2ForWorkspace() instead.
 */
export async function listPlaybookBlueprints(): Promise<PlaybookBlueprintView[]> {
  return [];
}

/**
 * @deprecated v1 playbooks retired. Returns null.
 */
export async function getProfileBlueprintDetail(
  _slug: string,
): Promise<(PlaybookBlueprintView & { fillRules: ProfileFillRulesDocument | null }) | null> {
  return null;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Run statistics (Phase 5b)
 *
 * One source of truth for "Runs this week" / "Runtime" / "Time saved": the
 * billing unit is a completed playbook run (state = ran), attribution reads
 * source_context.playbook_slug (Phase 1), runtime is the executor's recorded
 * duration_ms in activity_entries, and minutes saved = the playbook's
 * declared value.estimate × runs. Hero cards and the HQ Today widget both
 * read through here so the surfaces can never disagree.
 * ──────────────────────────────────────────────────────────────────────────── */

const RUN_STATS_WINDOW_DAYS = 14;

function toCompletedRunRow(row: {
  ran_at: string | null;
  approved_at: string | null;
  created_at: string;
  source_context: unknown;
}): CompletedRunRow {
  const sourceContext = row.source_context as { playbook_slug?: string } | null;
  return {
    playbookSlug: sourceContext?.playbook_slug ?? null,
    ranAt: row.ran_at,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
  };
}

/** Per-playbook stats for the detail-page hero (act layer). */
export async function getPlaybookRunStats(
  playbookSlug: string,
): Promise<PlaybookRunStats> {
  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();
  const windowStart = new Date(
    Date.now() - RUN_STATS_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const [runsResult, durationsResult] = await Promise.all([
    // All-time completed runs for this playbook (runs this week is a filter
    // over the same rows — one query, two counts).
    supabase
      .from("play_runs")
      .select("ran_at, approved_at, created_at, source_context")
      .eq("workspace_id", workspaceId)
      .eq("source_context->>playbook_slug", playbookSlug)
      .eq("state", "ran"),
    // Runtime: the executor's recorded durations, most recent first.
    supabase
      .from("activity_entries")
      .select("metadata")
      .eq("workspace_id", workspaceId)
      .eq("metadata->>playbook_slug", playbookSlug)
      .eq("metadata->>success", "true")
      .gte("created_at", windowStart)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const rows = (runsResult.data ?? []).map(toCompletedRunRow);
  const durationsMs = (durationsResult.data ?? [])
    .map((row) => {
      const metadata = row.metadata as { duration_ms?: unknown } | null;
      const value = Number(metadata?.duration_ms);
      return Number.isFinite(value) && value > 0 ? value : null;
    })
    .filter((value): value is number => value !== null);

  const definition = getPlaybookBySlug(playbookSlug)?.definition;
  const estimate = definition?.value?.estimate ?? null;

  return computePlaybookRunStats(
    rows,
    durationsMs,
    estimate,
    new Date(),
    estimatePlaybookRunDurationMs(definition?.steps)
  );
}

/** Workspace-wide stats for the HQ Today time-saved widget. */
export async function getWorkspaceRunStats(): Promise<WorkspaceRunStats> {
  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();
  const windowStart = new Date(
    Date.now() - RUN_STATS_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const [runsResult, anyRunResult] = await Promise.all([
    supabase
      .from("play_runs")
      .select("ran_at, approved_at, created_at, source_context")
      .eq("workspace_id", workspaceId)
      .eq("state", "ran")
      .gte("created_at", windowStart),
    // hasActivity must not depend on the 14-day math window.
    supabase
      .from("play_runs")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("state", "ran"),
  ]);

  const estimateBySlug = new Map<string, number>();
  for (const parsed of discoverV2Playbooks().allPlaybooks) {
    const estimate = parsed.definition.value?.estimate;
    if (typeof estimate === "number") {
      estimateBySlug.set(parsed.definition.slug, estimate);
    }
  }

  const rows = (runsResult.data ?? []).map(toCompletedRunRow);
  const stats = computeWorkspaceRunStats(rows, estimateBySlug);

  return { ...stats, hasActivity: (anyRunResult.count ?? 0) > 0 };
}

/**
 * Count non-manual profile fields applied in the trailing window. Used by the
 * Trust dashboard accuracy metric. Goes through the RLS-scoped client like
 * the other provenance queries — the workspace filter is belt-and-braces.
 */
export async function countAutoAppliedProfileFields(
  workspaceId: string,
  days = 30,
): Promise<number> {
  const supabase = await createClient();
  const windowStart = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  ).toISOString();

  const { count } = await supabase
    .from("profile_field_provenance")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "applied")
    .neq("source", "manual")
    .gte("set_at", windowStart);

  return count ?? 0;
}

export async function getProfilePlaybookSettings(
  blueprintSlug: string,
): Promise<ProfilePlaybookSettings | null> {
  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_playbook_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("blueprint_slug", blueprintSlug)
    .maybeSingle();

  if (!data) return null;

  return {
    autoApplyThreshold: data.auto_apply_threshold,
    aiFallbackEnabled: data.ai_fallback_enabled,
    contextFacts: (data.context_facts as ProfilePlaybookSettings["contextFacts"]) ?? {},
    fillRulesOverride: (data.fill_rules_override as ProfileFillRulesDocument | null) ?? null,
    activeSections: (data.active_sections as ProfilePlaybookSettings["activeSections"]) ?? [],
  };
}

/**
 * @deprecated Players retired 2026-07-13. Returns empty array.
 * Use playbook sections instead.
 */
export async function listPlayers(): Promise<PlayerView[]> {
  return [];
}

export interface PlaybookConnectorStats {
  /** Connected apps (active integrations) serving one of this playbook's categories. */
  connected: number;
  /** Required categories covered by at least one connected app. */
  requiredCovered: number;
  required: number;
  optional: number;
}

export async function getPlaybookConnectorStats(
  playbookSlug: string
): Promise<PlaybookConnectorStats> {
  const empty = { connected: 0, requiredCovered: 0, required: 0, optional: 0 };
  const parsed = getPlaybookBySlug(playbookSlug);
  if (!parsed?.definition?.requirements?.categories) {
    return empty;
  }

  const { required = [], optional = [] } = parsed.definition.requirements.categories;
  const allCategories = new Set<string>([...required, ...optional]);

  if (allCategories.size === 0) {
    return { ...empty, required: required.length, optional: optional.length };
  }

  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();

  const { data: integrations } = await supabase
    .from("workspace_integrations")
    .select("provider, is_active, composio_connection_id")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .not("composio_connection_id", "is", null);

  // Playbook requirement categories use Salt's taxonomy ("email", "billing"),
  // while connector_catalog.category is Composio's ("communication", "files").
  // Map provider → Salt category via the DB capture taxonomy (same mapping the
  // executor's category-fetcher uses) or the two never intersect.
  const providerCategories = await getCaptureCategoryMap();
  let connected = 0;
  const coveredRequired = new Set<string>(required);
  const covered = new Set<string>();
  for (const integration of integrations ?? []) {
    const category = providerCategories.get(integration.provider as string);
    if (!category || !allCategories.has(category)) continue;
    connected += 1;
    if (coveredRequired.has(category)) covered.add(category);
  }

  return {
    connected,
    requiredCovered: covered.size,
    required: required.length,
    optional: optional.length,
  };
}
