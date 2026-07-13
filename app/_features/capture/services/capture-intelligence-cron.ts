import "server-only";

/**
 * Capture Intelligence Cron Service
 *
 * Runs the daily intelligence scan across all workspaces with capture-enabled
 * connections. This is the automated version of the manual "Sync & Scan" button.
 *
 * Flow:
 * 1. Find workspaces with capture_enabled integrations
 * 2. For each workspace, run the daily scan (classify captures, create findings/plays)
 * 3. Aggregate results for logging
 *
 * The scan only processes captures that haven't been scanned yet (awaiting_scan),
 * so overlapping runs are safe and idempotent.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { sendLlm } from "@/app/_lib/ai/gpt";
import { runDailyScan, type DailyScanResult } from "./intelligence";

const DEFAULT_LOOKBACK_HOURS = 48;
const MAX_WORKSPACES_PER_RUN = 50;

export interface CaptureIntelligenceRunResult {
  workspacesProcessed: number;
  workspacesSkipped: number;
  totalEmailsProcessed: number;
  totalFindingsCreated: number;
  totalPeopleResolved: number;
  failures: Array<{ workspaceId: string; error: string }>;
  durationMs: number;
}

interface WorkspaceWithMember {
  workspaceId: string;
  userId: string;
}

function createLlmCall(userId: string) {
  return async (systemPrompt: string, userPrompt: string): Promise<string> => {
    const result = await sendLlm(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      userId,
      {
        routingKey: "insights",
        maxTokens: 1000,
        temperature: 0.3,
      }
    );
    return result || "{}";
  };
}

/**
 * Find workspaces that have capture-enabled integrations and need scanning.
 * Returns workspace + a user_id for LLM billing.
 */
async function getWorkspacesWithCaptures(): Promise<WorkspaceWithMember[]> {
  const admin = createAdminClient();

  const { data: integrations, error: intError } = await admin
    .from("workspace_integrations")
    .select("workspace_id")
    .eq("capture_enabled", true)
    .eq("is_active", true);

  if (intError) {
    throw new Error(`Failed to list capture-enabled workspaces: ${intError.message}`);
  }

  const workspaceIds = [...new Set((integrations ?? []).map((i) => i.workspace_id))];

  if (workspaceIds.length === 0) {
    return [];
  }

  const { data: members, error: memError } = await admin
    .from("workspace_members")
    .select("workspace_id, user_id")
    .in("workspace_id", workspaceIds)
    .eq("role", "owner");

  if (memError) {
    throw new Error(`Failed to get workspace members: ${memError.message}`);
  }

  const memberMap = new Map<string, string>();
  for (const member of members ?? []) {
    if (!memberMap.has(member.workspace_id)) {
      memberMap.set(member.workspace_id, member.user_id);
    }
  }

  if (memberMap.size < workspaceIds.length) {
    const { data: fallbackMembers, error: fallbackError } = await admin
      .from("workspace_members")
      .select("workspace_id, user_id")
      .in("workspace_id", workspaceIds)
      .limit(100);

    if (!fallbackError) {
      for (const member of fallbackMembers ?? []) {
        if (!memberMap.has(member.workspace_id)) {
          memberMap.set(member.workspace_id, member.user_id);
        }
      }
    }
  }

  return workspaceIds
    .filter((wsId) => memberMap.has(wsId))
    .slice(0, MAX_WORKSPACES_PER_RUN)
    .map((wsId) => ({
      workspaceId: wsId,
      userId: memberMap.get(wsId)!,
    }));
}

/**
 * Run a single workspace's intelligence scan.
 */
async function scanWorkspace(
  workspaceId: string,
  userId: string,
  options: { lookbackHours: number }
): Promise<DailyScanResult> {
  return runDailyScan(workspaceId, userId, {
    llmCall: createLlmCall(userId),
    lookbackHours: options.lookbackHours,
    scanAll: false,
    rescan: false,
  });
}

/**
 * Run capture intelligence scan across all eligible workspaces.
 * Called by the cron job.
 */
export async function runCaptureIntelligenceScan(options?: {
  lookbackHours?: number;
}): Promise<CaptureIntelligenceRunResult> {
  const startTime = Date.now();
  const lookbackHours = options?.lookbackHours ?? DEFAULT_LOOKBACK_HOURS;

  const result: CaptureIntelligenceRunResult = {
    workspacesProcessed: 0,
    workspacesSkipped: 0,
    totalEmailsProcessed: 0,
    totalFindingsCreated: 0,
    totalPeopleResolved: 0,
    failures: [],
    durationMs: 0,
  };

  let workspaces: WorkspaceWithMember[];
  try {
    workspaces = await getWorkspacesWithCaptures();
  } catch (error) {
    result.failures.push({
      workspaceId: "global",
      error: error instanceof Error ? error.message : "Failed to get workspaces",
    });
    result.durationMs = Date.now() - startTime;
    return result;
  }

  if (workspaces.length === 0) {
    result.durationMs = Date.now() - startTime;
    return result;
  }

  for (const { workspaceId, userId } of workspaces) {
    try {
      const scanResult = await scanWorkspace(workspaceId, userId, { lookbackHours });

      if (scanResult.emailsProcessed === 0 && scanResult.errors.length === 0) {
        result.workspacesSkipped++;
        continue;
      }

      result.workspacesProcessed++;
      result.totalEmailsProcessed += scanResult.emailsProcessed;
      result.totalFindingsCreated += scanResult.findingsCreated;
      result.totalPeopleResolved += scanResult.peopleResolved;

      if (scanResult.errors.length > 0) {
        const criticalErrors = scanResult.errors.filter(
          (e) => !e.includes("No Gmail captures") && !e.includes("Capture sync skipped")
        );
        if (criticalErrors.length > 0) {
          result.failures.push({
            workspaceId,
            error: criticalErrors.slice(0, 3).join("; "),
          });
        }
      }
    } catch (error) {
      result.failures.push({
        workspaceId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  result.durationMs = Date.now() - startTime;
  return result;
}
