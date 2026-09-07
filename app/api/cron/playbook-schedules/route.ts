/**
 * Playbook schedules cron.
 *
 * Runs hourly. Two responsibilities:
 * 1. Memory Care capabilities with due schedules (runDueCareCapabilities).
 * 2. Act-layer v2 playbooks with `trigger: type: schedule`, matched
 *    against the current hour and executed through the v2 step executor
 *    for each active workspace (respecting per-workspace enablement in
 *    profile_playbook_settings).
 *
 * Secured with CRON_SECRET. Schedule: hourly (vercel.json).
 */

import { NextRequest, NextResponse } from "next/server";
import { assertInternalSecret } from "@/app/_lib/security/assert-internal-secret";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { discoverV2Playbooks } from "@/app/_features/plays/playbooks/schema/v2/discovery";
import type { PlaybookDefinitionV2 } from "@/app/_features/plays/playbooks/schema/v2/types";
import {
  buildExecutionContextV2,
  executePlaybookV2,
} from "@/app/_features/plays/playbooks/schema/v2/executor";
import { cronMatchesHour } from "@/app/_features/plays/playbooks/schedule-matcher";
import { recordPlaybookRun } from "@/app/_features/plays/playbooks/run-recording";
import { isPlaybookEnabled } from "@/app/_features/plays/playbooks/trigger-dispatch";
import { runDueCareCapabilities } from "@/app/_features/memory/care/scheduler";

export const maxDuration = 300;

interface DuePlaybook {
  slug: string;
  layer: "learn" | "act";
  cron: string;
  definition: PlaybookDefinitionV2;
}

/**
 * Find playbooks whose schedule expression fires during the current hour.
 */
function findDuePlaybooks(now: Date): DuePlaybook[] {
  const due: DuePlaybook[] = [];
  const discovery = discoverV2Playbooks();

  for (const parsed of discovery.allPlaybooks) {
    const def = parsed.definition;
    const allTriggers = [
      ...(def.trigger ? [def.trigger] : []),
      ...(def.triggers || []),
    ];

    for (const trigger of allTriggers) {
      if (trigger.type !== "schedule" || !trigger.cron) continue;
      if (cronMatchesHour(trigger.cron, now, trigger.timezone)) {
        due.push({
          slug: def.slug,
          layer: def.layer,
          cron: trigger.cron,
          definition: def,
        });
        break;
      }
    }
  }

  return due;
}

/**
 * Map workspace → a user id for LLM billing (owner preferred, any member as
 * fallback). Act-layer playbooks draft with metered LLM calls, which require
 * a user for the spend context.
 */
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

/**
 * Run an act-layer scheduled playbook through the v2 step executor so
 * fetch/classify/draft steps produce queued play runs.
 */
async function runActPlaybook(
  playbook: DuePlaybook,
  workspaceId: string,
  userId: string,
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const startTime = Date.now();

  try {
    const context = await buildExecutionContextV2(
      workspaceId,
      userId,
      { type: "schedule" },
      playbook.definition.voice,
      undefined,
      playbook.slug,
    );

    const result = await executePlaybookV2(playbook.definition, context);

    await recordPlaybookRun(
      playbook.slug,
      { workspaceId, trigger: "schedule" },
      {
        success: result.status === "success" || result.status === "paused",
        error: result.status === "error" ? result.reason : undefined,
        skipped: result.status === "skipped" ? result.reason : undefined,
        summary:
          result.status === "success"
            ? `Produced ${result.outputCount ?? 0} output(s)`
            : result.reason,
        data: {
          status: result.status,
          outputCount: result.outputCount,
          playRunIds: result.playRunIds,
        },
      },
      Date.now() - startTime,
    );

    if (result.status === "error") {
      return { success: false, error: result.reason };
    }
    if (result.status === "skipped") {
      return { success: true, skipped: true };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Execution failed",
    };
  }
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  const unauthorized = assertInternalSecret(req, "[Playbook schedules cron]");
  if (unauthorized) return unauthorized;

  try {
    const now = new Date();
    const duePlaybooks = findDuePlaybooks(now);

    // Memory Care runs on its own schedules, independent of the playbook
    // engine (care capabilities are not playbooks).
    const care = await runDueCareCapabilities(now);

    if (duePlaybooks.length === 0) {
      return NextResponse.json({
        ok: true,
        durationMs: Date.now() - startTime,
        duePlaybooks: [],
        runs: 0,
        memoryCare: care,
      });
    }

    const admin = createAdminClient();
    const { data: workspaces, error: workspacesError } = await admin
      .from("workspaces")
      .select("id")
      .is("deleted_at", null)
      .limit(100);

    if (workspacesError || !workspaces) {
      throw new Error(
        `Failed to list workspaces: ${workspacesError?.message ?? "unknown"}`,
      );
    }

    const workspaceIds = workspaces.map((w) => w.id);
    const needsBillingUser = duePlaybooks.some((p) => p.layer === "act");
    const billingUsers = needsBillingUser
      ? await getBillingUserIds(workspaceIds)
      : new Map<string, string>();

    let runs = 0;
    let failures = 0;
    let skipped = 0;
    const perPlaybook: Record<string, { runs: number; failures: number }> = {};

    for (const playbook of duePlaybooks) {
      perPlaybook[playbook.slug] = { runs: 0, failures: 0 };

      // Act-layer scheduled playbooks run through the v2 step executor.
      // Memory Care capabilities are not playbooks — they run via
      // runDueCareCapabilities above.
      const isActPlaybook =
        playbook.layer === "act" &&
        (playbook.definition.steps?.length ?? 0) > 0;

      if (!isActPlaybook) {
        skipped++;
        continue;
      }

      for (const workspace of workspaces) {
        const enabled = await isPlaybookEnabled(workspace.id, playbook.slug);
        if (!enabled) {
          skipped++;
          continue;
        }

        const userId = billingUsers.get(workspace.id);
        if (!userId) {
          skipped++;
          continue;
        }
        const result = await runActPlaybook(playbook, workspace.id, userId);

        if (result.skipped) {
          skipped++;
        } else if (result.success) {
          runs++;
          perPlaybook[playbook.slug].runs++;
        } else {
          failures++;
          perPlaybook[playbook.slug].failures++;
          console.error(
            `[Playbook schedules cron] ${playbook.slug} failed for workspace ${workspace.id}: ${result.error}`,
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - startTime,
      duePlaybooks: duePlaybooks.map((p) => p.slug),
      workspaces: workspaces.length,
      runs,
      failures,
      skipped,
      perPlaybook,
      memoryCare: care,
    });
  } catch (error) {
    console.error("[Playbook schedules cron] Run failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Run failed" },
      { status: 500 },
    );
  }
}
