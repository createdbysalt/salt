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
import { backgroundSpend, sendLlm } from "@/app/_lib/ai/gpt";
import { runDailyScan, type DailyScanResult } from "./intelligence";
import { runRelationshipDiscovery } from "./relationship-discovery";

const DEFAULT_LOOKBACK_HOURS = 48;
const DEFAULT_MAX_WORKSPACES_PER_RUN = 50;
const DEFAULT_MAX_EMAILS_PER_WORKSPACE = 100;
const DEFAULT_MAX_EMAILS_PER_RUN = 500;

/**
 * Hard budget caps for LLM vendor spend, read from env so staging can run
 * this cron with tighter limits than production. Every email scanned is an
 * LLM call — the run stops as soon as the run-level budget is exhausted.
 */
function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readBudget() {
  return {
    maxWorkspaces: envInt(
      "CAPTURE_INTELLIGENCE_MAX_WORKSPACES",
      DEFAULT_MAX_WORKSPACES_PER_RUN
    ),
    maxEmailsPerWorkspace: envInt(
      "CAPTURE_INTELLIGENCE_MAX_EMAILS_PER_WORKSPACE",
      DEFAULT_MAX_EMAILS_PER_WORKSPACE
    ),
    maxEmailsPerRun: envInt(
      "CAPTURE_INTELLIGENCE_MAX_EMAILS_PER_RUN",
      DEFAULT_MAX_EMAILS_PER_RUN
    ),
  };
}

export interface CaptureIntelligenceRunResult {
  workspacesProcessed: number;
  workspacesSkipped: number;
  totalEmailsProcessed: number;
  totalFindingsCreated: number;
  totalPeopleResolved: number;
  /** Relationship discovery (Memory-first): held senders promoted into Memory. */
  totalSendersPromoted: number;
  /** Held senders that need a human decision (surfaced in the digest). */
  totalSendersNeedingConfirmation: number;
  /** True when the run stopped early because the email budget ran out. */
  budgetExhausted: boolean;
  failures: Array<{ workspaceId: string; error: string }>;
  durationMs: number;
}

interface WorkspaceWithMember {
  workspaceId: string;
  userId: string;
}

function createLlmCall(workspaceId: string, userId: string) {
  return async (systemPrompt: string, userPrompt: string): Promise<string> => {
    const result = await sendLlm(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      // One cron invocation loops over every eligible workspace, so the
      // workspace has to travel with the call rather than sit in ambient
      // request state — there is no single "current workspace" here.
      //
      // Background: nobody is waiting on a scheduled scan, so an over-budget
      // workspace simply skips this cycle instead of surfacing an error for
      // work it never asked for.
      backgroundSpend(workspaceId, userId),
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
async function getWorkspacesWithCaptures(
  maxWorkspaces: number
): Promise<WorkspaceWithMember[]> {
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
    .slice(0, maxWorkspaces)
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
  options: { lookbackHours: number; maxEmails: number }
): Promise<DailyScanResult> {
  return runDailyScan(workspaceId, userId, {
    llmCall: createLlmCall(workspaceId, userId),
    lookbackHours: options.lookbackHours,
    maxEmails: options.maxEmails,
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
  const budget = readBudget();

  const result: CaptureIntelligenceRunResult = {
    workspacesProcessed: 0,
    workspacesSkipped: 0,
    totalEmailsProcessed: 0,
    totalFindingsCreated: 0,
    totalPeopleResolved: 0,
    totalSendersPromoted: 0,
    totalSendersNeedingConfirmation: 0,
    budgetExhausted: false,
    failures: [],
    durationMs: 0,
  };

  let workspaces: WorkspaceWithMember[];
  try {
    workspaces = await getWorkspacesWithCaptures(budget.maxWorkspaces);
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
    // Relationship discovery runs regardless of the LLM email budget — it is
    // pure DB scoring, and held senders can qualify (e.g. you replied) even
    // when there is no new mail to scan.
    try {
      const discovery = await runRelationshipDiscovery(workspaceId);
      result.totalSendersPromoted += discovery.promoted;
      result.totalSendersNeedingConfirmation += discovery.needsConfirmation;
      if (discovery.errors.length > 0) {
        result.failures.push({
          workspaceId,
          error: `discovery: ${discovery.errors.slice(0, 3).join("; ")}`,
        });
      }
    } catch (error) {
      result.failures.push({
        workspaceId,
        error: `discovery: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }

    // Hard stop once the run-level email budget is spent — remaining
    // workspaces are picked up by the next scheduled run (scan is idempotent).
    if (result.totalEmailsProcessed >= budget.maxEmailsPerRun) {
      result.budgetExhausted = true;
      result.workspacesSkipped++;
      continue;
    }

    try {
      const remainingBudget = budget.maxEmailsPerRun - result.totalEmailsProcessed;
      const scanResult = await scanWorkspace(workspaceId, userId, {
        lookbackHours,
        maxEmails: Math.min(budget.maxEmailsPerWorkspace, remainingBudget),
      });

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
