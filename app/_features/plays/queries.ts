import "server-only";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
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

  return (data ?? []) as ActivityEntryRow[];
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
