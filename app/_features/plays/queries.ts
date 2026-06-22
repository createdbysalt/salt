import "server-only";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { fetchCaptureSourceUrlMap } from "@/app/_features/capture/utils/fetch-capture-source-urls";
import { buildGmailInboxUrl } from "@/app/_features/capture/utils/capture-source-url";
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
import {
  getAuthoredPlaybookBlueprintRow,
  loadAuthoredPlaybookBlueprintViews,
} from "./playbooks/load-authored-playbook-blueprints";
import { normalizePlaybookTrigger } from "./utils/playbook-display";
import type {
  ProfileFillRulesDocument,
  ProfilePlaybookSettings,
  ProfileProvenanceFeedItem,
  ProfileProvenanceStats,
} from "./playbooks/profile/types";

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
    "keeper",
  ];
  if (slug && allowed.includes(slug as PlayerSlug)) {
    return slug as PlayerSlug;
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

export async function listQueuedPlayRuns(): Promise<QueuePlayView[]> {
  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("play_runs")
    .select(
      `
      *,
      players:player_id ( slug, name ),
      play_templates:template_id ( name )
    `,
    )
    .eq("studio_id", workspaceId)
    .in("state", ["queued", "draft"])
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) =>
    mapPlayRunToQueueView({
      ...(row as PlayRunRow),
      player_slug: (row.players as { slug?: string } | null)?.slug ?? null,
      template_name: (row.play_templates as { name?: string } | null)?.name ?? null,
    }),
  );
}

export async function listHqQueuePlays(): Promise<HqQueuePlayView[]> {
  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();

  const { data } = await supabase
    .from("play_runs")
    .select(
      `
      *,
      players:player_id ( slug )
    `,
    )
    .eq("studio_id", workspaceId)
    .eq("state", "queued")
    .order("created_at", { ascending: true })
    .limit(6);

  if (!data) return [];

  return data.map((row) =>
    mapPlayRunToHqView({
      ...(row as PlayRunRow),
      player_slug: (row.players as { slug?: string } | null)?.slug ?? null,
    }),
  );
}

export async function listActivityEntries(limit = 50): Promise<ActivityEntryRow[]> {
  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();

  const { data } = await supabase
    .from("activity_entries")
    .select("*")
    .eq("studio_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as ActivityEntryRow[];
  return enrichActivitySourceUrls(rows, workspaceId, supabase);
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
          .eq("studio_id", workspaceId)
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
    .eq("studio_id", workspaceId)
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
    .eq("studio_id", workspaceId)
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
    .eq("studio_id", workspaceId)
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
    .eq("studio_id", workspaceId)
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
  };
}

export async function listPlaybookBlueprints(): Promise<PlaybookBlueprintView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("playbook_blueprints")
    .select("*")
    .eq("status", "active")
    .order("player_slug")
    .order("name");

  if (!error && data && data.length > 0) {
    return (data as PlaybookBlueprintRow[]).map(mapBlueprintRow);
  }

  return loadAuthoredPlaybookBlueprintViews(mapBlueprintRow);
}

export async function getProfileBlueprintDetail(
  slug: string,
): Promise<(PlaybookBlueprintView & { fillRules: ProfileFillRulesDocument | null }) | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("playbook_blueprints")
    .select("*")
    .eq("slug", slug)
    .eq("kind", "profile")
    .maybeSingle();

  if (!error && data) {
    const row = data as PlaybookBlueprintRow;
    return {
      ...mapBlueprintRow(row),
      fillRules: row.fill_rules,
    };
  }

  const authored = getAuthoredPlaybookBlueprintRow(slug);
  if (!authored || authored.kind !== "profile") return null;

  return {
    ...mapBlueprintRow(authored),
    fillRules: authored.fill_rules,
  };
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
      .eq("studio_id", workspaceId)
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

export async function listPlayTemplates(): Promise<PlayTemplateView[]> {
  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();

  const [{ data: templates }, { data: blueprints }] = await Promise.all([
    supabase
      .from("play_templates")
      .select(
        `
        id, slug, name, description, is_active, blueprint_slug, blueprint_version,
        players:player_id ( slug )
      `,
      )
      .eq("studio_id", workspaceId)
      .order("name"),
    supabase.from("playbook_blueprints").select("slug, version"),
  ]);

  const blueprintVersions = new Map(
    (blueprints ?? []).map((b: { slug: string; version: number }) => [b.slug, b.version]),
  );

  return (templates ?? []).map((row) => {
    const playerSlug = (row.players as { slug?: string } | null)?.slug ?? null;
    const blueprintSlug = row.blueprint_slug as string | null;
    const adoptedVersion = row.blueprint_version as number | null;
    const latestVersion = blueprintSlug
      ? blueprintVersions.get(blueprintSlug) ?? adoptedVersion
      : null;

    return {
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      description: (row.description as string | null) ?? null,
      playerSlug: playerSlug ? mapPlayerSlug(playerSlug) : null,
      blueprintSlug,
      blueprintVersion: adoptedVersion,
      isActive: Boolean(row.is_active),
      upgradeAvailable:
        Boolean(blueprintSlug && latestVersion && adoptedVersion && latestVersion > adoptedVersion),
    };
  });
}

export async function listPlayers(): Promise<PlayerView[]> {
  const workspaceId = await getWorkspaceId();
  const supabase = await createClient();

  const { data } = await supabase
    .from("players")
    .select("id, slug, name, role_label, description, is_active")
    .eq("studio_id", workspaceId)
    .eq("is_active", true)
    .order("name");

  return (data ?? []).map((row) => ({
    id: row.id as string,
    slug: mapPlayerSlug(row.slug as string),
    name: row.name as string,
    roleLabel: (row.role_label as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    isActive: Boolean(row.is_active),
  }));
}
