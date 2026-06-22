import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { PlaybookLearningSignalInput } from "../types";

export async function capturePlaybookLearningSignal(
  input: PlaybookLearningSignalInput,
): Promise<void> {
  if (!input.blueprintSlug && !input.templateId) {
    return;
  }

  const admin = createAdminClient();
  await admin.from("playbook_learning_signals").insert({
    workspace_id: input.workspaceId,
    blueprint_slug: input.blueprintSlug,
    template_id: input.templateId,
    play_run_id: input.playRunId,
    signal_type: input.signalType,
    delta: input.delta,
  });
}

export async function loadTemplateBlueprintMeta(
  templateId: string,
  workspaceId: string,
): Promise<{ blueprint_slug: string | null; slug: string } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("play_templates")
    .select("blueprint_slug, slug")
    .eq("id", templateId)
    .eq("studio_id", workspaceId)
    .maybeSingle();

  return data ?? null;
}
