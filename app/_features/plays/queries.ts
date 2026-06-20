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
  PlayChannel,
  PlayerSlug,
  PlayRunRow,
  QueuePlayView,
} from "./types";

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

function mapPlayRunToQueueView(row: PlayRunRow): QueuePlayView {
  const draftBody = row.draft_body
    ? row.draft_body.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)
    : row.preview
      ? [row.preview]
      : [row.title];

  return {
    id: row.id,
    playerId: mapPlayerSlug(row.player_slug),
    playbook: row.template_id ? "Playbook" : "Starter play",
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
      players:player_id ( slug, name )
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
