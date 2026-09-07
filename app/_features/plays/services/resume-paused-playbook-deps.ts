import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { TablesUpdate } from "@/app/_lib/supabase/database.types";
import { recordPlayExecution } from "@/app/_lib/usage/record-play-usage";
import { getWorkspaceConnectorPolicy } from "@/app/_features/connectors/queries";
import { loadDraftSender } from "../lib/draft-sender";
import { sanitizePayUrl } from "../lib/draft-payment-link";
import { executeConnectorTool } from "./execute-connector-tool";
import { writeMemoryNote } from "./write-memory-note";
import type {
  PlaybookApprovalContext,
  ResumePausedPlaybookDeps,
} from "./resume-paused-playbook";

/**
 * Production bindings for the paused-playbook resume path.
 *
 * ⚠️ RLS IS BYPASSED. Resume runs from a server action but writes through the
 * service-role client so the claim is atomic against the same races the
 * executor faces. Every query filters `workspace_id` explicitly — that filter
 * is the entire tenant boundary here.
 */
export function createResumePausedPlaybookDeps(): ResumePausedPlaybookDeps {
  const admin = createAdminClient();

  return {
    async loadRun(runId, workspaceId) {
      const { data } = await admin
        .from("play_runs")
        .select("id, title, draft_body, approval_context, metadata, context_inputs, target_id")
        .eq("id", runId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (!data) return null;

      return {
        id: data.id as string,
        title: (data.title as string) ?? "",
        approvalContext:
          (data.approval_context as PlaybookApprovalContext | null) ?? null,
        draftBody: (data.draft_body as string | null) ?? null,
        metadata: (data.metadata as Record<string, unknown> | null) ?? null,
        contextInputs:
          (data.context_inputs as Record<string, unknown> | null) ?? null,
        targetId: (data.target_id as string | null) ?? null,
      };
    },

    async claimRun(runId, workspaceId) {
      // The state filter is the lock: whichever caller flips `approved` to
      // `executing` first is the only one that reaches the send.
      const { data } = await admin
        .from("play_runs")
        .update({ state: "executing", updated_at: new Date().toISOString() })
        .eq("id", runId)
        .eq("workspace_id", workspaceId)
        .eq("paused_for_approval", true)
        .in("state", ["approved", "queued", "draft", "scheduled"])
        .select("id")
        .maybeSingle();

      return Boolean(data);
    },

    async executeTool(toolSlug, args, context) {
      return executeConnectorTool(toolSlug, args, context);
    },

    // Narrower than the deps contract's Record<string, unknown>: every patch
    // the resume path writes is a real play_runs column set.
    async finalizeRun(runId, workspaceId, patch: TablesUpdate<"play_runs">) {
      await admin
        .from("play_runs")
        .update(patch)
        .eq("id", runId)
        .eq("workspace_id", workspaceId);
    },

    async recordActivity(entry) {
      await admin.from("activity_entries").insert({
        workspace_id: entry.workspaceId,
        play_run_id: entry.playRunId,
        actor_user_id: entry.userId,
        action: entry.action,
        title: entry.title,
        detail: entry.detail,
        metadata: {},
      });
    },

    async meterExecution(workspaceId, playRunId, toolSlugs) {
      // Never throws into the caller: the send already happened, and a ledger
      // failure must not turn a completed action into an error. The write is
      // idempotent on the run id, so a backfill lands exactly once.
      try {
        await recordPlayExecution({ workspaceId, playRunId, toolSlugs });
      } catch (error) {
        console.error("[usage] failed to meter resumed playbook", playRunId, error);
      }
    },

    writeMemoryNote,

    async loadEmailMode(workspaceId, provider) {
      const policy = await getWorkspaceConnectorPolicy(workspaceId);
      return policy.emailModeByProvider?.[provider] ?? "draft";
    },

    now() {
      return new Date().toISOString();
    },

    loadSender: loadDraftSender,

    async loadInvoicePayUrl(workspaceId, targetId) {
      if (!targetId) return null;
      const { data } = await admin
        .from("billing_records")
        .select("app_url")
        .eq("id", targetId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      return sanitizePayUrl((data?.app_url as string | null) ?? null);
    },
  };
}
