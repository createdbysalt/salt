"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { recordPlayExecution } from "@/app/_lib/usage/record-play-usage";
import type { ActionResult } from "../actions";
import { executeConnectorTool } from "../services/execute-connector-tool";
import { loadConnectedAccountEmail, loadDraftSender } from "../lib/draft-sender";
import { sanitizePayUrl } from "../lib/draft-payment-link";
import {
  materializeInboxDraft,
  syncPreparedDraftBody,
  type MaterializeInboxDraftDeps,
  type MaterializeInboxDraftRun,
} from "../services/materialize-inbox-draft";

function inboxDraftDeps() {
  const admin = createAdminClient();
  const deps: MaterializeInboxDraftDeps = {
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
        draftBody: (data.draft_body as string | null) ?? null,
        approvalContext:
          (data.approval_context as MaterializeInboxDraftRun["approvalContext"]) ??
          null,
        metadata: (data.metadata as Record<string, unknown> | null) ?? null,
        contextInputs:
          (data.context_inputs as Record<string, unknown> | null) ?? null,
        targetId: (data.target_id as string | null) ?? null,
      };
    },
    async executeTool(toolSlug, args, toolContext) {
      return executeConnectorTool(toolSlug, args, toolContext);
    },
    async saveRun(runId, workspaceId, patch) {
      await admin
        .from("play_runs")
        .update({
          metadata: patch.metadata as Json,
          approval_context: patch.approval_context as Json,
          ...(patch.draft_body !== undefined ? { draft_body: patch.draft_body } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", runId)
        .eq("workspace_id", workspaceId);
    },
    async meterExecution(workspaceId, runId, toolSlugs) {
      try {
        await recordPlayExecution({ workspaceId, playRunId: runId, toolSlugs });
      } catch (error) {
        console.error("[usage] failed to meter inbox draft", runId, error);
      }
    },
    loadSender: loadDraftSender,
    async loadInboxEmail(workspaceId, toolSlug) {
      if (toolSlug !== "GMAIL_CREATE_EMAIL_DRAFT") return null;
      return loadConnectedAccountEmail(workspaceId, "gmail");
    },
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
  return deps;
}

export async function refreshPreparedPlayDraft(
  playRunId: string
): Promise<ActionResult<{ draftBody: string; subject: string }>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;
  if (!userId) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: "Sign in required" };
  }

  const result = await syncPreparedDraftBody(
    { playRunId, workspaceId: workspace.id, userId },
    inboxDraftDeps()
  );

  if (!result.ok) {
    return { ok: false, errorCode: "DRAFT_REFRESH_FAILED", message: result.error };
  }

  revalidatePath("/plays");
  revalidatePath("/hq");
  return { ok: true, data: { draftBody: result.draftBody, subject: result.subject } };
}

export async function openPreparedInboxDraft(
  playRunId: string,
  draftBody?: string | null
): Promise<ActionResult<{ url: string; label: string; draftBody: string }>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;
  if (!userId) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: "Sign in required" };
  }

  const result = await materializeInboxDraft(
    { playRunId, workspaceId: workspace.id, userId, draftBody },
    inboxDraftDeps()
  );

  if (!result.ok) {
    return { ok: false, errorCode: "DRAFT_OPEN_FAILED", message: result.error };
  }

  revalidatePath("/plays");
  revalidatePath("/hq");
  return {
    ok: true,
    data: { url: result.url, label: result.label, draftBody: result.draftBody },
  };
}
