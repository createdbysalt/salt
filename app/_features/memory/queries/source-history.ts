import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import { toDbEntityType } from "@/app/_features/memory/types/entity-type";

export type SourceHistoryEntry = {
  id: string;
  provider: string;
  sourceOrigin: string;
  appUrl: string | null;
  sourceExternalId: string | null;
  eventType: "created" | "synced" | "extracted" | "reclassified" | "linked";
  sourcedAt: string;
  context: string | null;
  actorName: string | null;
};

export type EntityTypeForSourceHistory =
  | "person"
  | "org"
  | "work"
  | "billing"
  | "meeting"
  | "resource";

export async function getEntitySourceHistory(
  entityType: EntityTypeForSourceHistory,
  entityId: string
): Promise<SourceHistoryEntry[]> {
  const ctx = await getWorkspaceContext();
  if (!ctx) return [];

  const { workspace, supabase } = ctx;
  const dbEntityType = toDbEntityType(entityType);

  const { data, error } = await supabase
    .from("entity_source_history")
    .select(`
      id,
      provider,
      source_origin,
      app_url,
      source_external_id,
      event_type,
      sourced_at,
      context,
      actor_id
    `)
    .eq("workspace_id", workspace.id)
    .eq("entity_type", dbEntityType)
    .eq("entity_id", entityId)
    .order("sourced_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch source history:", error.message ?? error.code ?? error.details ?? error.hint ?? JSON.stringify(error));
    return [];
  }

  // Fetch actor names for entries that have an actor_id
  const actorIds = [...new Set((data ?? []).map((row) => row.actor_id).filter(Boolean))];
  let actorMap: Record<string, string> = {};

  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", actorIds);

    actorMap = (profiles ?? []).reduce(
      (acc, p) => ({ ...acc, [p.id]: p.display_name }),
      {} as Record<string, string>
    );
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    provider: row.provider,
    sourceOrigin: row.source_origin,
    appUrl: row.app_url,
    sourceExternalId: row.source_external_id,
    eventType: row.event_type as SourceHistoryEntry["eventType"],
    sourcedAt: row.sourced_at,
    context: row.context,
    actorName: row.actor_id ? actorMap[row.actor_id] ?? null : null,
  }));
}

export async function addSourceHistoryEntry(input: {
  entityType: EntityTypeForSourceHistory;
  entityId: string;
  provider: string;
  sourceOrigin: string;
  appUrl?: string | null;
  sourceExternalId?: string | null;
  captureEventId?: string | null;
  eventType: SourceHistoryEntry["eventType"];
  context?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const ctx = await getWorkspaceContext();
  if (!ctx) {
    return { ok: false, message: "No workspace context" };
  }

  const { workspace, supabase, userId } = ctx;

  const { data, error } = await supabase
    .from("entity_source_history")
    .insert({
      workspace_id: workspace.id,
      entity_type: toDbEntityType(input.entityType),
      entity_id: input.entityId,
      provider: input.provider,
      source_origin: input.sourceOrigin,
      app_url: input.appUrl ?? null,
      source_external_id: input.sourceExternalId ?? null,
      capture_event_id: input.captureEventId ?? null,
      event_type: input.eventType,
      context: input.context ?? null,
      actor_id: userId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to add source history:", error.message ?? error.code ?? JSON.stringify(error));
    return { ok: false, message: "Failed to record source history" };
  }

  return { ok: true, id: data.id };
}
