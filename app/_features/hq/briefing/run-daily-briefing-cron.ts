import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { generateDailyBriefing, isDailyBriefingDue } from "./generate-daily-briefing";
import type { GenerateDailyBriefingStatus } from "./types";

const WORKSPACE_LIMIT = 100;

export interface DailyBriefingCronResult {
  due: boolean;
  workspaces: number;
  created: number;
  alreadyExists: number;
  skippedEmpty: number;
  skippedNoDraft: number;
  skippedNoUser: number;
  failures: number;
}

async function getBillingUserIds(
  workspaceIds: string[],
): Promise<Map<string, string>> {
  const admin = createAdminClient();
  const memberMap = new Map<string, string>();
  if (workspaceIds.length === 0) return memberMap;

  const { data: owners } = await admin
    .from("workspace_members")
    .select("workspace_id, user_id")
    .in("workspace_id", workspaceIds)
    .eq("role", "owner");

  for (const member of owners ?? []) {
    if (!memberMap.has(member.workspace_id)) {
      memberMap.set(member.workspace_id, member.user_id);
    }
  }

  if (memberMap.size < workspaceIds.length) {
    const { data: fallback } = await admin
      .from("workspace_members")
      .select("workspace_id, user_id")
      .in("workspace_id", workspaceIds)
      .limit(200);

    for (const member of fallback ?? []) {
      if (!memberMap.has(member.workspace_id)) {
        memberMap.set(member.workspace_id, member.user_id);
      }
    }
  }

  return memberMap;
}

export async function runDailyBriefingCron(
  now: Date = new Date(),
): Promise<DailyBriefingCronResult> {
  const empty: DailyBriefingCronResult = {
    due: false,
    workspaces: 0,
    created: 0,
    alreadyExists: 0,
    skippedEmpty: 0,
    skippedNoDraft: 0,
    skippedNoUser: 0,
    failures: 0,
  };

  if (!isDailyBriefingDue(now)) {
    return empty;
  }

  const admin = createAdminClient();
  const { data: workspaces, error } = await admin
    .from("workspaces")
    .select("id")
    .is("deleted_at", null)
    .limit(WORKSPACE_LIMIT);

  if (error || !workspaces) {
    throw new Error(
      `Failed to list workspaces: ${error?.message ?? "unknown"}`,
    );
  }

  const billingUsers = await getBillingUserIds(workspaces.map((w) => w.id));
  const counts: Record<GenerateDailyBriefingStatus, number> = {
    created: 0,
    already_exists: 0,
    skipped_empty: 0,
    skipped_no_draft: 0,
    error: 0,
  };
  let skippedNoUser = 0;

  for (const workspace of workspaces) {
    const userId = billingUsers.get(workspace.id);
    if (!userId) {
      skippedNoUser++;
      continue;
    }

    const result = await generateDailyBriefing(workspace.id, userId, now);
    counts[result.status]++;
    if (result.status === "error") {
      console.error(
        `[Daily briefing cron] failed for workspace ${workspace.id}: ${result.error}`,
      );
    }
  }

  return {
    due: true,
    workspaces: workspaces.length,
    created: counts.created,
    alreadyExists: counts.already_exists,
    skippedEmpty: counts.skipped_empty,
    skippedNoDraft: counts.skipped_no_draft,
    skippedNoUser,
    failures: counts.error,
  };
}
