"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy/context";
import { getWorkspaceMemberOrNull } from "@/app/_lib/tenancy/guards";
import { resolveExecutablePlaybookDefinition } from "@/app/_features/plays/playbooks/trigger-dispatch";
import {
  buildExecutionContextV2,
  executePlaybookV2,
} from "@/app/_features/plays/playbooks/schema/v2/executor";
import { recordPlaybookRun } from "@/app/_features/plays/playbooks/run-recording";
import {
  resolveManualRunEntityNeed,
  resolveManualRunSignal,
  type ManualRunEntityKind,
} from "@/app/_features/plays/lib/manual-run-context";
import type { ActionResult } from "../actions";

export interface RunPlaybookNowData {
  status: "success" | "skipped" | "error" | "paused";
  reason?: string;
  playRunIds?: string[];
}

interface ResolvedEntity {
  entityId: string;
  entitySurface: ManualRunEntityKind;
  entityLabel?: string;
}

async function resolveRunEntity(
  workspaceId: string,
  kind: ManualRunEntityKind
): Promise<ResolvedEntity | null> {
  const supabase = await createClient();

  if (kind === "billing") {
    const { data } = await supabase
      .from("billing_records")
      .select("id, number, due_at")
      .eq("workspace_id", workspaceId)
      .eq("direction", "receivable")
      .in("status", ["due", "overdue", "partial"])
      .not("due_at", "is", null)
      .lt("due_at", new Date().toISOString())
      .order("due_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!data) return null;
    return {
      entityId: data.id as string,
      entitySurface: "billing",
      entityLabel: (data.number as string | null) ?? undefined,
    };
  }

  if (kind === "person") {
    // Never guess a contact. Follow-up plays fire from a relationship signal.
    return null;
  }

  if (kind === "resource") {
    // Most recent contract-classified file, unsigned first — the same
    // population the record_condition trigger fires on.
    const { data } = await supabase
      .from("resources")
      .select("id, file_name, signed_date")
      .eq("workspace_id", workspaceId)
      .eq("category", "contract")
      .is("archived_at", null)
      .is("deleted_at", null)
      .order("signed_date", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;
    return {
      entityId: data.id as string,
      entitySurface: "resource",
      entityLabel: (data.file_name as string | null) ?? undefined,
    };
  }

  const { data } = await supabase
    .from("work_blockers")
    .select("work_id, work:work_id(title)")
    .eq("workspace_id", workspaceId)
    .is("resolved_at", null)
    .order("detected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const work = data.work as { title?: string } | null;
  return {
    entityId: data.work_id as string,
    entitySurface: "work",
    entityLabel: work?.title,
  };
}

/**
 * User-initiated run from the playbook hero. Picks a matching Memory
 * record when the play is signal-scoped (e.g. an overdue invoice).
 */
export async function runPlaybookNow(
  playbookSlug: string
): Promise<ActionResult<RunPlaybookNowData>> {
  const { context } = await getTenantContext();
  const workspace = getWorkspaceMemberOrNull(context);
  const userId = context.userId;
  if (!workspace || !userId) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: "Sign in required" };
  }

  const definition = await resolveExecutablePlaybookDefinition(
    workspace.id,
    playbookSlug
  );
  if (!definition) {
    return {
      ok: false,
      errorCode: "NOT_FOUND",
      message: "Playbook not found",
    };
  }

  const need = resolveManualRunEntityNeed(definition);
  let entity: ResolvedEntity | null = null;
  if (need) {
    entity = await resolveRunEntity(workspace.id, need.kind);
    if (!entity) {
      return {
        ok: false,
        errorCode: "NO_ENTITY",
        message: need.missingMessage,
      };
    }
  }

  const start = Date.now();
  try {
    const execContext = await buildExecutionContextV2(
      workspace.id,
      userId,
      entity
        ? {
            type: "signal",
            signalKey: resolveManualRunSignal(definition.trigger),
            entityId: entity.entityId,
            entitySurface: entity.entitySurface,
            entityLabel: entity.entityLabel,
          }
        : { type: "manual" },
      definition.voice,
      undefined,
      playbookSlug
    );

    const execResult = await executePlaybookV2(definition, execContext);

    await recordPlaybookRun(
      playbookSlug,
      {
        workspaceId: workspace.id,
        trigger: "manual",
        signal: resolveManualRunSignal(definition.trigger),
      },
      {
        success: execResult.status === "success" || execResult.status === "paused",
        error: execResult.status === "error" ? execResult.reason : undefined,
        skipped: execResult.status === "skipped" ? execResult.reason : undefined,
        summary:
          execResult.status === "success"
            ? `Produced ${execResult.outputCount ?? 0} output(s)`
            : execResult.reason,
        data: {
          status: execResult.status,
          outputCount:
            execResult.outputCount ??
            (execResult.status === "paused" ? 1 : 0),
          playRunIds: execResult.playRunIds,
        },
      },
      Date.now() - start
    );

    revalidatePath("/plays");
    revalidatePath(`/plays/playbooks/${playbookSlug}`);

    return {
      ok: true,
      data: {
        status: execResult.status,
        reason: execResult.reason,
        playRunIds: execResult.playRunIds,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Play failed.";
    return { ok: false, errorCode: "RUN_FAILED", message };
  }
}
