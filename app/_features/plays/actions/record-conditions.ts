"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy/context";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import {
  evaluateConditionValue,
  findFieldDescriptor,
} from "@/app/_features/plays/playbooks/record-conditions";
import type {
  RecordConditionEntity,
  RecordConditionOp,
} from "@/app/_features/plays/playbooks/schema/v2/types";

export interface RecordConditionTestMatch {
  id: string;
  label: string;
  actualValue: string;
  updatedAt: string | null;
}

export interface RecordConditionTestResult {
  success: boolean;
  matches?: RecordConditionTestMatch[];
  /** Rows examined within the 30-day window. */
  scanned?: number;
  error?: string;
}

const ENTITY_TABLES: Record<
  RecordConditionEntity,
  { table: "people" | "organizations" | "work" | "billing_records" | "resources"; labelColumn: string }
> = {
  person: { table: "people", labelColumn: "name" },
  org: { table: "organizations", labelColumn: "name" },
  work: { table: "work", labelColumn: "name" },
  billing: { table: "billing_records", labelColumn: "number" },
  resource: { table: "resources", labelColumn: "file_name" },
};

const HISTORY_WINDOW_DAYS = 30;
const HISTORY_ROW_LIMIT = 200;
const MATCH_LIMIT = 20;

/**
 * "Test against the last 30 days" — runs a record-condition trigger over
 * recent record history and returns the rows it would have fired on, so the
 * author can sanity-check a condition before saving it. Read-only; creates
 * no runs.
 */
export async function testRecordConditionAction(input: {
  entity: RecordConditionEntity;
  field: string;
  op: RecordConditionOp;
  value: string;
}): Promise<RecordConditionTestResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);

    const descriptor = findFieldDescriptor(input.entity, input.field);
    if (!descriptor?.dbColumn) {
      return {
        success: false,
        error: `Unknown ${input.entity} field: "${input.field}"`,
      };
    }

    const { table, labelColumn } = ENTITY_TABLES[input.entity];
    const cutoff = new Date(
      Date.now() - HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from(table)
      .select(`id, ${labelColumn}, ${descriptor.dbColumn}, updated_at`)
      .eq("workspace_id", workspace.id)
      .is("archived_at", null)
      .is("deleted_at", null)
      .gte("updated_at", cutoff)
      .order("updated_at", { ascending: false })
      .limit(HISTORY_ROW_LIMIT);

    if (error) {
      console.error("testRecordConditionAction query failed:", error);
      return { success: false, error: error.message };
    }

    // Boundary cast: dynamic select list (registry-driven dbColumn) — see
    // the field registry for column validity.
    const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
    const matches: RecordConditionTestMatch[] = [];

    for (const row of rows) {
      const actual = row[descriptor.dbColumn];
      if (!evaluateConditionValue(input.op, input.value, actual)) continue;
      if (matches.length >= MATCH_LIMIT) continue;

      const label = row[labelColumn];
      matches.push({
        id: String(row.id),
        label: typeof label === "string" && label ? label : String(row.id),
        actualValue: String(actual),
        updatedAt:
          typeof row.updated_at === "string" ? row.updated_at : null,
      });
    }

    return { success: true, matches, scanned: rows.length };
  } catch (err) {
    console.error("testRecordConditionAction error:", err);
    return { success: false, error: "Could not test the condition" };
  }
}
