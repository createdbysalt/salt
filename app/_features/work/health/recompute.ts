import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { gatherWorkHealthSignals } from "./gather-signals";
import { scoreWorkHealth } from "./score-work-health";
import type { WorkHealthResult } from "./types";

function logRecomputeError(context: string, error: unknown): void {
  console.error(`[work-health] ${context}:`, error);
}

export async function recomputeWorkHealth(workId: string): Promise<WorkHealthResult | null> {
  const admin = createAdminClient();

  const { data: project, error: projectError } = await admin
    .from("projects")
    .select(
      "id, workspace_id, client_id, status, stage_entered_at, deadline, updated_at",
    )
    .eq("id", workId)
    .is("deleted_at", null)
    .maybeSingle();

  if (projectError || !project) {
    logRecomputeError("project lookup failed", projectError);
    return null;
  }

  const signals = await gatherWorkHealthSignals({
    supabase: admin,
    workspaceId: project.workspace_id as string,
    workId,
    clientId: (project.client_id as string | null) ?? null,
    status: project.status as string,
    stageEnteredAt: (project.stage_entered_at as string | null) ?? null,
    deadline: (project.deadline as string | null) ?? null,
    updatedAt: (project.updated_at as string | null) ?? null,
  });

  const result = scoreWorkHealth(signals);

  const { error: updateError } = await admin
    .from("projects")
    .update({
      health_score_cached: result.score,
      health_band: result.band,
      health_factors: result.factors,
      health_updated_at: new Date().toISOString(),
      health_version: result.version,
    })
    .eq("id", workId);

  if (updateError) {
    logRecomputeError("cache write failed", updateError);
  }

  return result;
}

export function scheduleWorkHealthRecompute(workId: string): void {
  void recomputeWorkHealth(workId).catch((error) => {
    logRecomputeError(`scheduled recompute failed for ${workId}`, error);
  });
}

export function isWorkHealthStale(healthUpdatedAt: string | null, maxAgeHours = 24): boolean {
  if (!healthUpdatedAt) return true;
  const updatedAt = new Date(healthUpdatedAt);
  if (Number.isNaN(updatedAt.getTime())) return true;
  const ageMs = Date.now() - updatedAt.getTime();
  return ageMs > maxAgeHours * 60 * 60 * 1000;
}
