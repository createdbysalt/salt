import "server-only";

import { createClient } from "@/app/_lib/supabase/server";

export type CreatePlayRunResult =
  | { ok: true; value: CreatedPlayRun }
  | { ok: false; error: string };

export interface CreatePlayRunFromTemplateInput {
  workspaceId: string;
  templateId: string;
  /** Queue card title. Falls back to the template name when omitted. */
  title?: string;
  /** Short human preview of what the play will do. */
  preview?: string;
}

export interface CreatedPlayRun {
  runId: string;
  title: string;
  state: "queued";
}

/**
 * Queue a play_run from an adopted template for human approval. This is the
 * single safe entry point Ask Salt's `propose_play` handoff uses: the LLM never
 * executes acting steps itself — it queues a run that the typed engine
 * (executePlayRun) runs only after the user approves it on /plays.
 *
 * Uses the RLS-scoped server client; the workspace_members policy allows
 * owner/admin/member to insert play_runs for their own workspace.
 */
export async function createPlayRunFromTemplate(
  input: CreatePlayRunFromTemplateInput,
): Promise<CreatePlayRunResult> {
  const supabase = await createClient();

  const { data: template, error: templateError } = await supabase
    .from("play_templates")
    .select("id, name, player_id, is_active")
    .eq("id", input.templateId)
    .eq("workspace_id", input.workspaceId)
    .maybeSingle();

  if (templateError) {
    return { ok: false, error: templateError.message };
  }
  if (!template) {
    return { ok: false, error: "Playbook is not adopted in this workspace." };
  }
  if (!template.is_active) {
    return { ok: false, error: "This playbook is turned off in this workspace." };
  }

  const title = input.title?.trim() || (template.name as string);

  const { data: run, error: insertError } = await supabase
    .from("play_runs")
    .insert({
      workspace_id: input.workspaceId,
      player_id: (template.player_id as string | null) ?? null,
      template_id: template.id as string,
      state: "queued",
      title,
      preview: input.preview?.trim() || null,
      eta_label: "Ready to review",
    })
    .select("id")
    .single();

  if (insertError || !run) {
    return { ok: false, error: insertError?.message ?? "Could not queue the play." };
  }

  return { ok: true, value: { runId: run.id as string, title, state: "queued" } };
}
