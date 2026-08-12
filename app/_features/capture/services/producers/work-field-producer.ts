import { createAdminClient } from "@/app/_lib/supabase/admin";
import { runCareForSignal } from "@/app/_features/memory/care/scheduler";
import {
  WORK_STAGE_SETS,
  type WorkType,
} from "@/app/_features/memory/taxonomy/registry";
import type { DerivedWorkFields } from "./record-field-types";

export interface ProduceWorkFieldsResult {
  workId: string | null;
  dispatched: string[];
}

interface WorkRow {
  id: string;
  name: string;
  organization_id: string | null;
  work_type: string | null;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

async function findOrgIdByName(
  workspaceId: string,
  name: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("id")
    .eq("workspace_id", workspaceId)
    .ilike("name", escapeLike(name))
    .is("deleted_at", null)
    .is("archived_at", null)
    .limit(1);
  const rows = (data as Array<{ id: string }> | null) ?? [];
  return rows[0]?.id ?? null;
}

/**
 * Track A deal producer: matches a CRM deal to exactly one active work
 * record (title, disambiguated by account name) and dispatches the mapped
 * stage. Never creates work records — a deal board entry is not an
 * engagement until the user says so.
 */
export async function produceWorkFieldSignals(input: {
  workspaceId: string;
  dealKey: string;
  fields: DerivedWorkFields;
  source: string;
  captureId?: string;
}): Promise<ProduceWorkFieldsResult> {
  const none: ProduceWorkFieldsResult = { workId: null, dispatched: [] };
  const stage = input.fields.signalValues.work_stage_inferred;
  if (!stage) return none;

  const title = input.fields.title ?? input.dealKey;
  if (!title) return none;

  const admin = createAdminClient();
  const { data } = await admin
    .from("work")
    .select("id, name, organization_id, work_type")
    .eq("workspace_id", input.workspaceId)
    .ilike("name", escapeLike(title))
    .is("deleted_at", null)
    .is("archived_at", null);
  let candidates = (data as WorkRow[] | null) ?? [];

  if (candidates.length > 1 && input.fields.orgName) {
    const orgId = await findOrgIdByName(input.workspaceId, input.fields.orgName);
    if (orgId) {
      candidates = candidates.filter((work) => work.organization_id === orgId);
    }
  }
  if (candidates.length !== 1) return none;

  const work = candidates[0];
  if (work.work_type) {
    const stageSet = WORK_STAGE_SETS[work.work_type as WorkType];
    if (stageSet && !(stageSet as readonly string[]).includes(stage)) {
      return { workId: work.id, dispatched: [] };
    }
  }

  await runCareForSignal({
    workspaceId: input.workspaceId,
    entityType: "work",
    entityId: work.id,
    signalKey: "work_stage_inferred",
    evidence: {
      source: input.source,
      captureId: input.captureId,
      signalValues: { work_stage_inferred: stage },
    },
  });
  return { workId: work.id, dispatched: ["work_stage_inferred"] };
}
