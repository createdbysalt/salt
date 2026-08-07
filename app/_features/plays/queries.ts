import "server-only";

import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { listQueueFindings } from "@/app/_features/capture/queries/intelligence-findings";
import { fetchCaptureSourceUrlMap } from "@/app/_features/capture/utils/fetch-capture-source-urls";
import { buildGmailInboxUrl } from "@/app/_features/capture/utils/capture-source-url";
import { mapFindingToCard } from "./play-card/map-finding-to-card";
import { mapHandledFindingToCard } from "./play-card/map-handled-finding-to-card";
import { mapPlayRunToCard } from "./play-card/map-play-run-to-card";
import { validatePlayCard } from "./play-card/validate-play-card";
import type { PlayCardViewModel } from "./play-card/types";
import type {
  ActivityEntryRow,
  HqQueuePlayView,
  OpportunityGapRow,
  PlaybookBlueprintView,
  PlayChannel,
  PlayerSlug,
  PlayerView,
  PlayRunRow,
  PlayTemplateView,
  QueuePlayView,
} from "./types";
import type { PlaybookBlueprintRow } from "./playbooks/types";
import type { PlayDefinition } from "./utils/play-definition";
import type { PlayTemplateRow } from "./types";
import { isMemoryCareActivityMetadata } from "./utils/plays-activity-filter";
// v1 authored playbooks removed - v2 playbooks are filesystem-based
import { normalizePlaybookTrigger } from "./utils/playbook-display";
import type {
  ProfileFillRulesDocument,
  ProfilePlaybookSettings,
  ProfileProvenanceFeedItem,
  ProfileProvenanceStats,
} from "./playbooks/records-engine/types";
import { getPlaybookBySlug } from "./playbooks/schema/v2/discovery";
import { getConnectorRegistry } from "@/app/_lib/composio/connector-registry";

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
    .in("state", ["queued", "draft"])
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
 */
const buildHqNeedsYouCards = cache(async (): Promise<PlayCardViewModel[]> => {
  const [playRuns, findings] = await Promise.all([
    listQueuedPlayRuns(),
    listQueueFindings("needs_you"),
  ]);

  return [
    ...findings.map(mapFindingToCard),
    ...playRuns.map(mapPlayRunToCard),
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

export async function listActivityEntries(
  offset = 0,
  limit = 50,
): Promise<{ entries: ActivityEntryRow[]; totalCount: number }> {
  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();

  // Oversample so post-filter still fills the page after dropping Care rows.
  const fetchLimit = Math.min(Math.max(limit * 3, limit + 50), 200);

  const { data, error } = await supabase
    .from("activity_entries")
    .select(
      "id, workspace_id, play_run_id, actor_user_id, action, title, detail, metadata, created_at",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .range(0, fetchLimit - 1);

  if (error) throw error;

  const filtered = ((data ?? []) as ActivityEntryRow[]).filter(
    (row) => !isMemoryCareActivityMetadata(row.metadata),
  );
  const page = filtered.slice(offset, offset + limit);
  const enriched = await enrichActivitySourceUrls(page, workspaceId, supabase);

  // Count is approximate when Care rows are dense; oversample keeps the page full.
  return {
    entries: enriched,
    totalCount: filtered.length,
  };
}

function readMetadataString(
  metadata: Record<string, unknown> | null,
  key: string
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function enrichActivitySourceUrls(
  entries: ActivityEntryRow[],
  workspaceId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ActivityEntryRow[]> {
  if (entries.length === 0) return entries;

  const playRunIds = [
    ...new Set(
      entries
        .map((entry) => entry.play_run_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const captureIds = [
    ...new Set(
      entries
        .map((entry) => readMetadataString(entry.metadata, "capture_id"))
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const [playRunSourcesResult, captureUrlMap] = await Promise.all([
    playRunIds.length > 0
      ? supabase
          .from("play_run_sources")
          .select("play_run_id, external_url")
          .eq("workspace_id", workspaceId)
          .in("play_run_id", playRunIds)
          .not("external_url", "is", null)
      : Promise.resolve({ data: [] as { play_run_id: string; external_url: string }[] }),
    fetchCaptureSourceUrlMap(supabase, workspaceId, captureIds),
  ]);

  const urlByPlayRunId = new Map<string, string>();
  for (const row of playRunSourcesResult.data ?? []) {
    if (!urlByPlayRunId.has(row.play_run_id) && row.external_url) {
      urlByPlayRunId.set(row.play_run_id, row.external_url);
    }
  }

  return entries.map((entry) => {
    const metaUrl =
      readMetadataString(entry.metadata, "source_url") ??
      buildGmailInboxUrl({
        threadId: readMetadataString(entry.metadata, "gmail_thread_id"),
        messageId: readMetadataString(entry.metadata, "gmail_message_id"),
      });

    const captureId = readMetadataString(entry.metadata, "capture_id");
    const captureUrl = captureId ? captureUrlMap.get(captureId) ?? null : null;

    const playRunUrl = entry.play_run_id
      ? urlByPlayRunId.get(entry.play_run_id) ?? null
      : null;

    return {
      ...entry,
      source_url: metaUrl ?? captureUrl ?? playRunUrl,
    };
  });
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

function mapTemplateRow(row: PlayTemplateRow): PlayTemplateView {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    playerSlug: row.player_id ? mapPlayerSlug(row.slug) : null,
    blueprintSlug: row.blueprint_slug,
    blueprintVersion: row.blueprint_version,
    isActive: row.is_active,
    upgradeAvailable: false,
  };
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

export interface ActingBlueprintDetail extends PlaybookBlueprintView {
  definition: PlayDefinition;
  procedureMd: string;
  requiredToolkits: string[];
  /** Template for this blueprint in this workspace, if adopted. */
  template: PlayTemplateView | null;
}

/**
 * @deprecated v1 playbooks retired. Returns null.
 */
export async function getActingBlueprintDetail(
  _slug: string,
): Promise<ActingBlueprintDetail | null> {
  return null;
}

export async function getProfileProvenanceStats(
  blueprintSlug: string,
): Promise<ProfileProvenanceStats> {
  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [appliedResult, pendingResult, weekResult] = await Promise.all([
    supabase
      .from("profile_field_provenance")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("blueprint_slug", blueprintSlug)
      .eq("status", "applied"),
    supabase
      .from("profile_field_provenance")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("blueprint_slug", blueprintSlug)
      .eq("status", "pending"),
    supabase
      .from("profile_field_provenance")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("blueprint_slug", blueprintSlug)
      .eq("status", "applied")
      .gte("set_at", weekAgo),
  ]);

  return {
    applied: appliedResult.count ?? 0,
    pending: pendingResult.count ?? 0,
    appliedThisWeek: weekResult.count ?? 0,
  };
}

export async function listRecentProfileProvenance(
  blueprintSlug: string,
  limit = 8,
): Promise<ProfileProvenanceFeedItem[]> {
  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profile_field_provenance")
    .select("id, entity_type, entity_id, field, value, source, status, evidence, set_at")
    .eq("workspace_id", workspaceId)
    .eq("blueprint_slug", blueprintSlug)
    .order("set_at", { ascending: false })
    .limit(limit);

  if (!data?.length) return [];

  const personIds = [
    ...new Set(
      data
        .filter((row) => row.entity_type === "person")
        .map((row) => row.entity_id as string),
    ),
  ];

  const nameByPersonId = new Map<string, string>();
  if (personIds.length > 0) {
    const { data: people } = await supabase
      .from("people")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .in("id", personIds);

    for (const person of people ?? []) {
      nameByPersonId.set(person.id as string, person.name as string);
    }
  }

  return data.map((row) => {
    const entityId = row.entity_id as string;
    const entityType = row.entity_type as string;
    const valueObj = row.value as { text?: string } | null;
    const evidence =
      typeof row.evidence === "object" && row.evidence
        ? (row.evidence as { because?: string })
        : null;

    return {
      id: row.id as string,
      entityId,
      entityName:
        entityType === "person" ? nameByPersonId.get(entityId) ?? null : null,
      entityHref: entityType === "person" ? `/people/${entityId}` : null,
      field: row.field as ProfileProvenanceFeedItem["field"],
      value: valueObj?.text ?? null,
      source: row.source as ProfileProvenanceFeedItem["source"],
      status: row.status as ProfileProvenanceFeedItem["status"],
      because: evidence?.because ?? null,
      setAt: row.set_at as string,
    };
  });
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
 * @deprecated v1 playbooks retired. Returns empty array.
 */
export async function listPlayTemplates(): Promise<PlayTemplateView[]> {
  return [];
}

export async function listKeeperActivityEntries(
  offset = 0,
  limit = 50,
): Promise<{ entries: ActivityEntryRow[]; totalCount: number }> {
  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();

  const [{ data, error }, { count }] = await Promise.all([
    supabase
      .from("activity_entries")
      .select(
        "id, workspace_id, play_run_id, actor_user_id, action, title, detail, metadata, created_at"
      )
      .eq("workspace_id", workspaceId)
      .or("metadata->>player_slug.eq.keeper,metadata->>playbook_slug.ilike.keeper-%")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1),
    supabase
      .from("activity_entries")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .or("metadata->>player_slug.eq.keeper,metadata->>playbook_slug.ilike.keeper-%"),
  ]);

  if (error) throw error;

  const rows = (data ?? []) as ActivityEntryRow[];
  const enriched = await enrichActivitySourceUrls(rows, workspaceId, supabase);

  return {
    entries: enriched,
    totalCount: count ?? 0,
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
  connected: number;
  required: number;
  optional: number;
}

export async function getPlaybookConnectorStats(
  playbookSlug: string
): Promise<PlaybookConnectorStats> {
  const parsed = getPlaybookBySlug(playbookSlug);
  if (!parsed?.definition?.requirements?.categories) {
    return { connected: 0, required: 0, optional: 0 };
  }

  const { required = [], optional = [] } = parsed.definition.requirements.categories;
  const allCategories = new Set<string>([...required, ...optional]);

  if (allCategories.size === 0) {
    return { connected: 0, required: required.length, optional: optional.length };
  }

  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();
  const registry = await getConnectorRegistry();

  const { data: integrations } = await supabase
    .from("workspace_integrations")
    .select("provider, is_active, composio_connection_id")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .not("composio_connection_id", "is", null);

  const connectedCategories = new Set<string>();
  for (const integration of integrations ?? []) {
    const provider = integration.provider as string;
    const entry = registry.get(provider);
    if (entry && allCategories.has(entry.category)) {
      connectedCategories.add(entry.category);
    }
  }

  return {
    connected: connectedCategories.size,
    required: required.length,
    optional: optional.length,
  };
}
