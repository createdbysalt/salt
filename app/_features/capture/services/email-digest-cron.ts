import "server-only";

/**
 * Email Digest cron (Capture Quality Repair, Phase C).
 *
 * Runs the email-digest v2 playbook for each workspace with email capture
 * enabled. The digest batches the classifier's `batch_digest` mail from the
 * last 24h plus the held pool's new senders (Memory-first policy) into one
 * briefing play run — the user-visible payoff for demoting unknown senders.
 *
 * Cost control: the draft step is one LLM call per workspace, and workspaces
 * with nothing to digest are skipped before any LLM spend.
 * EMAIL_DIGEST_MAX_WORKSPACES caps a run (staging safety).
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getPlaybookBySlug } from "@/app/_features/plays/playbooks/schema/v2/discovery";
import {
  buildExecutionContextV2,
  executePlaybookV2,
} from "@/app/_features/plays/playbooks/schema/v2/executor";
import { EMAIL_SCAN_SOURCE_TYPES } from "../adapters/categories/email";
import { listHeldSenders } from "./relationship-discovery";

const DIGEST_PLAYBOOK_SLUG = "email-digest";
const DIGEST_LOOKBACK_HOURS = 24;

/**
 * capture_events.source_type is TEXT (Sources plan 5.2), so scan source types
 * no longer need filtering to a frozen enum — any provider key is queryable.
 */
const EMAIL_SOURCE_TYPES: readonly string[] = EMAIL_SCAN_SOURCE_TYPES;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export interface EmailDigestRunResult {
  workspacesConsidered: number;
  digestsCreated: number;
  skippedEmpty: number;
  errors: string[];
}

export async function runEmailDigestCron(): Promise<EmailDigestRunResult> {
  const maxWorkspaces = envInt("EMAIL_DIGEST_MAX_WORKSPACES", 25);

  const result: EmailDigestRunResult = {
    workspacesConsidered: 0,
    digestsCreated: 0,
    skippedEmpty: 0,
    errors: [],
  };

  const playbook = getPlaybookBySlug(DIGEST_PLAYBOOK_SLUG);
  if (!playbook) {
    result.errors.push("email-digest playbook not found");
    return result;
  }

  const workspaces = await getEmailCaptureWorkspaces(maxWorkspaces);
  result.workspacesConsidered = workspaces.length;

  for (const { workspaceId, userId } of workspaces) {
    try {
      const hasContent = await workspaceHasDigestContent(workspaceId);
      if (!hasContent) {
        result.skippedEmpty++;
        continue;
      }

      const context = await buildExecutionContextV2(
        workspaceId,
        userId,
        { type: "schedule" },
        playbook.definition.voice
      );

      const execution = await executePlaybookV2(playbook.definition, context);
      if (execution.status === "success" && (execution.outputCount ?? 0) > 0) {
        result.digestsCreated++;
      } else if (execution.status === "error") {
        result.errors.push(`${workspaceId}: ${execution.reason ?? "digest failed"}`);
      }
    } catch (error) {
      result.errors.push(
        `${workspaceId}: ${error instanceof Error ? error.message : "unknown error"}`
      );
    }
  }

  return result;
}

/** Skip the LLM call entirely when there's nothing to digest. */
async function workspaceHasDigestContent(workspaceId: string): Promise<boolean> {
  const admin = createAdminClient();
  const cutoffIso = new Date(
    Date.now() - DIGEST_LOOKBACK_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { count } = await admin
    .from("capture_events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .in("source_type", EMAIL_SOURCE_TYPES)
    .eq("enriched_metadata->email_classification->>triage_action", "batch_digest")
    .gte("created_at", cutoffIso);

  if ((count ?? 0) > 0) return true;

  const heldSenders = await listHeldSenders(workspaceId, {
    lookbackHours: DIGEST_LOOKBACK_HOURS,
    limit: 1,
  });
  return heldSenders.length > 0;
}

/** Workspaces with active email capture + an owner (or any member) to act as. */
async function getEmailCaptureWorkspaces(
  maxWorkspaces: number
): Promise<Array<{ workspaceId: string; userId: string }>> {
  const admin = createAdminClient();

  const { data: integrations, error } = await admin
    .from("workspace_integrations")
    .select("workspace_id")
    .eq("capture_enabled", true)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to list capture-enabled workspaces: ${error.message}`);
  }

  const workspaceIds = [...new Set((integrations ?? []).map((i) => i.workspace_id))];
  if (workspaceIds.length === 0) return [];

  const { data: members } = await admin
    .from("workspace_members")
    .select("workspace_id, user_id, role")
    .in("workspace_id", workspaceIds);

  const memberMap = new Map<string, string>();
  for (const member of members ?? []) {
    if (member.role === "owner" || !memberMap.has(member.workspace_id)) {
      memberMap.set(member.workspace_id, member.user_id);
    }
  }

  return workspaceIds
    .filter((id) => memberMap.has(id))
    .slice(0, maxWorkspaces)
    .map((id) => ({ workspaceId: id, userId: memberMap.get(id)! }));
}
