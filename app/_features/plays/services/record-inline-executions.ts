import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";
import { recordPlayExecution } from "@/app/_lib/usage/record-play-usage";
import { buildPlaybookSourceContext } from "@/app/_features/plays/lib/play-record";

/**
 * Record connector tools a playbook executed inline (steps that cleared the
 * approval gates without pausing) as an auto_handled play run, and meter the
 * execution against it.
 *
 * Paused runs can't carry this: their run id is the resume path's metering
 * anchor (idempotency key `play_<runId>`), so pre-pause tool executions meter
 * against their own record here instead.
 *
 * Never throws into the caller — the tools already executed; a recording or
 * metering failure must not turn completed work into an error.
 */
export async function recordInlineToolExecutions(params: {
  workspaceId: string;
  playbookSlug: string;
  title: string;
  preview: string;
  triggerSignal?: string;
  evidence?: Record<string, unknown>;
  toolSlugs: string[];
}): Promise<string | null> {
  const { workspaceId, playbookSlug, title, preview, triggerSignal, evidence, toolSlugs } =
    params;

  if (toolSlugs.length === 0) return null;

  try {
    const admin = createAdminClient();
    const { data: run } = await admin
      .from("play_runs")
      .insert({
        workspace_id: workspaceId,
        state: "auto_handled",
        title,
        preview,
        trigger_source: triggerSignal ? "signal" : "manual",
        source_context: buildPlaybookSourceContext({
          playbookSlug,
          triggerSignal,
        }),
        trigger_evidence: (evidence ?? {}) as Json,
        context_inputs: {
          tools_executed: toolSlugs,
        },
      })
      .select("id")
      .single();

    if (!run) return null;

    try {
      await recordPlayExecution({
        workspaceId,
        playRunId: run.id as string,
        toolSlugs,
      });
    } catch (error) {
      console.error(
        "[usage] failed to meter inline tool executions",
        run.id,
        error
      );
    }

    return run.id as string;
  } catch (error) {
    console.error(
      `[plays] failed to record inline tool executions for ${playbookSlug}`,
      error
    );
    return null;
  }
}

/**
 * Extract the slugs of tools a step list executed inline (the executor marks
 * them with `{ tool, executed: true }` step data).
 */
export function collectExecutedToolSlugs(
  stepResults: Array<{ status: string; data?: unknown }>
): string[] {
  return stepResults
    .filter(
      (step) =>
        step.status === "success" &&
        typeof step.data === "object" &&
        step.data !== null &&
        (step.data as Record<string, unknown>).executed === true &&
        typeof (step.data as Record<string, unknown>).tool === "string"
    )
    .map((step) => (step.data as Record<string, unknown>).tool as string);
}
