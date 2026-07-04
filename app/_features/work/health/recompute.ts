import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { logHealthChangeLifecycleEvent } from "@/app/_features/memory/health/log-health-lifecycle-event";
import { gatherWorkHealthSignals } from "./gather-signals";
import { detectWorkBlockers, syncDetectedBlockers } from "./detect-blockers";
import { scoreWorkHealth } from "./score-work-health";
import { WORK_HEALTH_VERSION } from "./types";
import type { WorkHealthResult } from "./types";

function logRecomputeError(message: string, error: unknown, meta?: Record<string, string>): void {
  if (meta) {
    console.error("[work-health]", message, meta, error);
  } else {
    console.error("[work-health]", message, error);
  }
}

export async function recomputeWorkHealth(workId: string): Promise<WorkHealthResult | null> {
  const admin = createAdminClient();

  const { data: project, error: projectError } = await admin
    .from("work")
    .select(
      `id, workspace_id, organization_id, person_id, status, work_type, payment_type,
       stage_entered_at, deadline, start_date, updated_at,
       renewal_date, hours_estimate, hours_logged,
       hourly_rate_cents, retainer_mrr_cents, contract_value_cents,
       health_score_cached, health_band`,
    )
    .eq("id", workId)
    .is("deleted_at", null)
    .maybeSingle();

  if (projectError || !project) {
    logRecomputeError("project lookup failed", projectError);
    return null;
  }

  const workspaceId = project.workspace_id as string;

  const detectedBlockers = await detectWorkBlockers({
    supabase: admin,
    workspaceId,
    workId,
  });

  await syncDetectedBlockers({
    supabase: admin,
    workspaceId,
    workId,
    detected: detectedBlockers,
  });

  const signals = await gatherWorkHealthSignals({
    supabase: admin,
    workspaceId,
    workId,
    organizationId: (project.organization_id as string | null) ?? null,
    personId: (project.person_id as string | null) ?? null,
    status: project.status as string,
    workType: (project.work_type as string | null) ?? null,
    paymentType: (project.payment_type as string | null) ?? null,
    stageEnteredAt: (project.stage_entered_at as string | null) ?? null,
    deadline: (project.deadline as string | null) ?? null,
    startDate: (project.start_date as string | null) ?? null,
    updatedAt: (project.updated_at as string | null) ?? null,
    renewalDate: (project.renewal_date as string | null) ?? null,
    hoursEstimate: project.hours_estimate != null ? Number(project.hours_estimate) : null,
    hoursLogged: project.hours_logged != null ? Number(project.hours_logged) : null,
    hourlyRateCents: (project.hourly_rate_cents as number | null) ?? null,
    retainerMrrCents: (project.retainer_mrr_cents as number | null) ?? null,
    contractValueCents: (project.contract_value_cents as number | null) ?? null,
  });

  const result = scoreWorkHealth(signals);
  const previousHealth = {
    score: (project.health_score_cached as number | null) ?? null,
    band: (project.health_band as string | null) ?? null,
  };

  const { error: updateError } = await admin
    .from("work")
    .update({
      health_score_cached: result.score,
      health_band: result.band,
      health_archetype: result.archetype,
      health_factors: result.factors,
      health_updated_at: new Date().toISOString(),
      health_version: result.version,
    })
    .eq("id", workId);

  if (updateError) {
    logRecomputeError("cache write failed", updateError);
  } else {
    await logHealthChangeLifecycleEvent(admin, {
      workspaceId,
      entityType: "work",
      entityId: workId,
      from: previousHealth,
      to: { score: result.score, band: result.band },
      factors: result.factors,
    });
  }

  return result;
}

export function scheduleWorkHealthRecompute(workId: string): void {
  console.log("[work-health] triggering recompute for", workId);
  void recomputeWorkHealth(workId)
    .then((result) => {
      console.log("[work-health] recompute complete", workId, result?.archetype, result?.version);
    })
    .catch((error) => {
      logRecomputeError("scheduled recompute failed", error, { workId });
    });
}

export function isWorkHealthStale(
  healthUpdatedAt: string | null,
  healthVersion: number | null = null,
  maxAgeHours = 24,
): boolean {
  if (!healthUpdatedAt) return true;

  if (healthVersion != null && healthVersion < WORK_HEALTH_VERSION) return true;

  const updatedAt = new Date(healthUpdatedAt);
  if (Number.isNaN(updatedAt.getTime())) return true;
  const ageMs = Date.now() - updatedAt.getTime();
  return ageMs > maxAgeHours * 60 * 60 * 1000;
}
