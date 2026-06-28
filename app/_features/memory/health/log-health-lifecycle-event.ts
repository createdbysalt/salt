import type { SupabaseClient } from "@supabase/supabase-js";

type HealthEntityType = "person" | "organization" | "work";

type HealthSnapshot = {
  score: number | null;
  band: string | null;
};

type HealthFactorLike = {
  reason?: string;
  detail?: string;
  label?: string;
};

export function formatHealthLifecycleValue(snapshot: HealthSnapshot): string | null {
  if (snapshot.score == null && snapshot.band == null) return null;
  if (snapshot.band == null) return snapshot.score != null ? String(snapshot.score) : null;
  if (snapshot.score == null) return snapshot.band;
  return `${snapshot.score} · ${snapshot.band}`;
}

export function healthCacheChanged(from: HealthSnapshot, to: HealthSnapshot): boolean {
  return from.score !== to.score || from.band !== to.band;
}

function summarizeHealthFactors(factors: HealthFactorLike[] | undefined): string {
  const parts = (factors ?? [])
    .slice(0, 2)
    .map((factor) => factor.reason ?? factor.detail ?? factor.label)
    .filter(Boolean);

  return parts.length > 0 ? parts.join("; ") : "Health recomputed from latest signals";
}

export async function logHealthChangeLifecycleEvent(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    entityType: HealthEntityType;
    entityId: string;
    from: HealthSnapshot;
    to: HealthSnapshot;
    factors?: HealthFactorLike[];
  },
): Promise<void> {
  if (!healthCacheChanged(input.from, input.to)) return;

  const toValue = formatHealthLifecycleValue(input.to);
  if (!toValue) return;

  const { error } = await supabase.from("lifecycle_events").insert({
    workspace_id: input.workspaceId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    event_type: "health_change",
    from_value: formatHealthLifecycleValue(input.from),
    to_value: toValue,
    source: "system",
    because: summarizeHealthFactors(input.factors),
  });

  if (error) {
    console.error("[health-lifecycle] failed to log health_change", {
      entityType: input.entityType,
      entityId: input.entityId,
      error,
    });
  }
}
