import "server-only";

import type { RelationshipStatus } from "@/app/_features/relationships/types";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { logHealthChangeLifecycleEvent } from "@/app/_features/memory/health/log-health-lifecycle-event";
import { gatherOrgHealthSignals } from "./gather-signals";
import { scoreOrgHealth } from "./org-health";
import type { OrgHealthResult } from "./types";

function logRecomputeError(message: string, error: unknown, meta?: Record<string, string>): void {
  if (meta) {
    console.error("[org-health]", message, meta, error);
  } else {
    console.error("[org-health]", message, error);
  }
}

export async function recomputeOrgHealth(orgId: string): Promise<OrgHealthResult | null> {
  const admin = createAdminClient();

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id, workspace_id, relationship_status, relationship_health_score, relationship_health_band")
    .eq("id", orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (orgError || !org) {
    logRecomputeError("org lookup failed", orgError);
    return null;
  }

  const { data: primaryLink } = await admin
    .from("organization_people")
    .select("person_id")
    .eq("organization_id", orgId)
    .eq("is_primary", true)
    .maybeSingle();

  const signals = await gatherOrgHealthSignals({
    supabase: admin,
    orgId,
    primaryPersonId: (primaryLink?.person_id as string | null) ?? null,
  });

  const result = scoreOrgHealth({
    context: {
      relationshipStatus: (org.relationship_status as RelationshipStatus | null) ?? null,
    },
    signals,
  });

  const previousHealth = {
    score: (org.relationship_health_score as number | null) ?? null,
    band: (org.relationship_health_band as string | null) ?? null,
  };

  const { error: updateError } = await admin
    .from("organizations")
    .update({
      relationship_health_score: result.score,
      relationship_health_band: result.band,
      relationship_health_archetype: result.archetype,
      relationship_health_factors: result.factors,
      relationship_health_version: result.version,
      relationship_health_updated_at: new Date().toISOString(),
    })
    .eq("id", orgId);

  if (updateError) {
    logRecomputeError("cache write failed", updateError);
  } else {
    await logHealthChangeLifecycleEvent(admin, {
      workspaceId: org.workspace_id as string,
      entityType: "organization",
      entityId: orgId,
      from: previousHealth,
      to: { score: result.score, band: result.band },
      factors: result.factors,
    });
  }

  return result;
}

export function scheduleOrgHealthRecompute(orgId: string): void {
  void recomputeOrgHealth(orgId).catch((error) => {
    logRecomputeError("scheduled recompute failed", error, { orgId });
  });
}
