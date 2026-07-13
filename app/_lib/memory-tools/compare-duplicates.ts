/**
 * Compare Duplicates - Side-by-side comparison of two records
 *
 * Provides detailed field-by-field comparison and merge preview.
 * Used by Duplicate Detector playbook for review UI.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { LearningEntityType } from "./types";

export interface FieldComparison {
  field: string;
  valueA: unknown;
  valueB: unknown;
  match: "identical" | "different" | "a_only" | "b_only";
  suggestedValue: unknown;
  suggestedSource: "a" | "b" | "merged";
}

export interface CompareDuplicatesInput {
  workspaceId: string;
  entityType: LearningEntityType;
  recordAId: string;
  recordBId: string;
}

export interface CompareDuplicatesResult {
  recordA: {
    id: string;
    name: string;
    fieldCount: number;
    lastActivityAt: string | null;
    billingCount: number;
    createdAt: string;
  };
  recordB: {
    id: string;
    name: string;
    fieldCount: number;
    lastActivityAt: string | null;
    billingCount: number;
    createdAt: string;
  };
  suggestedWinner: "a" | "b";
  winnerReason: string;
  fields: FieldComparison[];
  mergePreview: Record<string, unknown>;
}

export async function memoryCompareDuplicates(
  input: CompareDuplicatesInput
): Promise<CompareDuplicatesResult | null> {
  const { workspaceId, entityType, recordAId, recordBId } = input;
  const supabase = createAdminClient();

  const table = getTableName(entityType);
  if (!table) return null;

  const { data: records, error } = await supabase
    .from(table)
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("id", [recordAId, recordBId]);

  if (error || !records || records.length !== 2) {
    return null;
  }

  const recordA = records.find((r) => r.id === recordAId);
  const recordB = records.find((r) => r.id === recordBId);

  if (!recordA || !recordB) return null;

  const billingCountA = await getBillingCount(supabase, workspaceId, entityType, recordAId);
  const billingCountB = await getBillingCount(supabase, workspaceId, entityType, recordBId);

  const fieldCountA = countNonEmptyFields(recordA);
  const fieldCountB = countNonEmptyFields(recordB);

  const { winner, reason } = determineWinner(
    { fieldCount: fieldCountA, billingCount: billingCountA, createdAt: recordA.created_at },
    { fieldCount: fieldCountB, billingCount: billingCountB, createdAt: recordB.created_at }
  );

  const fields = compareFields(recordA, recordB, entityType);
  const mergePreview = generateMergePreview(recordA, recordB, fields, winner);

  return {
    recordA: {
      id: recordAId,
      name: getRecordName(recordA, entityType),
      fieldCount: fieldCountA,
      lastActivityAt: recordA.updated_at || recordA.created_at,
      billingCount: billingCountA,
      createdAt: recordA.created_at,
    },
    recordB: {
      id: recordBId,
      name: getRecordName(recordB, entityType),
      fieldCount: fieldCountB,
      lastActivityAt: recordB.updated_at || recordB.created_at,
      billingCount: billingCountB,
      createdAt: recordB.created_at,
    },
    suggestedWinner: winner,
    winnerReason: reason,
    fields,
    mergePreview,
  };
}

function getTableName(entityType: LearningEntityType): string | null {
  const tables: Record<string, string> = {
    person: "people",
    organization: "organizations",
    work: "work",
    billing: "billing_records",
    meeting: "meetings",
    file: "files",
  };
  return tables[entityType] || null;
}

function getRecordName(record: Record<string, unknown>, entityType: LearningEntityType): string {
  switch (entityType) {
    case "person":
      return (record.display_name as string) || (record.email as string) || "Unknown";
    case "organization":
      return (record.name as string) || "Unknown";
    case "work":
      return (record.name as string) || "Unknown";
    case "billing":
      return (record.number as string) || "Unknown";
    case "meeting":
      return (record.title as string) || "Unknown";
    case "file":
      return (record.title as string) || (record.filename as string) || "Unknown";
    default:
      return "Unknown";
  }
}

async function getBillingCount(
  supabase: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  entityType: LearningEntityType,
  recordId: string
): Promise<number> {
  if (entityType === "person") {
    const { count } = await supabase
      .from("billing_records")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("person_id", recordId);
    return count || 0;
  }
  if (entityType === "organization") {
    const { count } = await supabase
      .from("billing_records")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("organization_id", recordId);
    return count || 0;
  }
  return 0;
}

function countNonEmptyFields(record: Record<string, unknown>): number {
  const skipFields = ["id", "workspace_id", "created_at", "updated_at", "deleted_at"];
  return Object.entries(record).filter(
    ([key, value]) => !skipFields.includes(key) && value !== null && value !== ""
  ).length;
}

function determineWinner(
  a: { fieldCount: number; billingCount: number; createdAt: string },
  b: { fieldCount: number; billingCount: number; createdAt: string }
): { winner: "a" | "b"; reason: string } {
  if (a.fieldCount > b.fieldCount + 2) {
    return { winner: "a", reason: "Record A has more complete data" };
  }
  if (b.fieldCount > a.fieldCount + 2) {
    return { winner: "b", reason: "Record B has more complete data" };
  }

  if (a.billingCount > b.billingCount) {
    return { winner: "a", reason: "Record A has more billing history" };
  }
  if (b.billingCount > a.billingCount) {
    return { winner: "b", reason: "Record B has more billing history" };
  }

  const dateA = new Date(a.createdAt).getTime();
  const dateB = new Date(b.createdAt).getTime();
  if (dateA < dateB) {
    return { winner: "a", reason: "Record A was created first" };
  }
  return { winner: "b", reason: "Record B was created first" };
}

function compareFields(
  recordA: Record<string, unknown>,
  recordB: Record<string, unknown>,
  entityType: LearningEntityType
): FieldComparison[] {
  const skipFields = ["id", "workspace_id", "created_at", "updated_at", "deleted_at"];
  const allKeys = new Set([...Object.keys(recordA), ...Object.keys(recordB)]);
  const fields: FieldComparison[] = [];

  for (const key of allKeys) {
    if (skipFields.includes(key)) continue;

    const valueA = recordA[key];
    const valueB = recordB[key];
    const hasA = valueA !== null && valueA !== "" && valueA !== undefined;
    const hasB = valueB !== null && valueB !== "" && valueB !== undefined;

    let match: FieldComparison["match"];
    let suggestedValue: unknown;
    let suggestedSource: FieldComparison["suggestedSource"];

    if (!hasA && !hasB) continue;

    if (hasA && hasB) {
      if (JSON.stringify(valueA) === JSON.stringify(valueB)) {
        match = "identical";
        suggestedValue = valueA;
        suggestedSource = "a";
      } else {
        match = "different";
        suggestedValue = selectBetterValue(key, valueA, valueB, entityType);
        suggestedSource = suggestedValue === valueA ? "a" : suggestedValue === valueB ? "b" : "merged";
      }
    } else if (hasA) {
      match = "a_only";
      suggestedValue = valueA;
      suggestedSource = "a";
    } else {
      match = "b_only";
      suggestedValue = valueB;
      suggestedSource = "b";
    }

    fields.push({
      field: key,
      valueA,
      valueB,
      match,
      suggestedValue,
      suggestedSource,
    });
  }

  return fields;
}

function selectBetterValue(
  field: string,
  valueA: unknown,
  valueB: unknown,
  _entityType: LearningEntityType
): unknown {
  if (field === "relationship_type" || field === "relationship_status") {
    const hierarchy = ["client", "prospect", "partner", "vendor", "team", "personal", "unknown"];
    const rankA = hierarchy.indexOf(String(valueA));
    const rankB = hierarchy.indexOf(String(valueB));
    if (rankA !== -1 && rankB !== -1) {
      return rankA < rankB ? valueA : valueB;
    }
  }

  if (typeof valueA === "string" && typeof valueB === "string") {
    return valueA.length >= valueB.length ? valueA : valueB;
  }

  return valueA;
}

function generateMergePreview(
  recordA: Record<string, unknown>,
  recordB: Record<string, unknown>,
  fields: FieldComparison[],
  winner: "a" | "b"
): Record<string, unknown> {
  const base = winner === "a" ? { ...recordA } : { ...recordB };

  for (const field of fields) {
    if (field.match !== "identical" && field.suggestedValue !== undefined) {
      base[field.field] = field.suggestedValue;
    }
  }

  delete base.id;
  delete base.workspace_id;
  delete base.created_at;
  delete base.updated_at;

  return base;
}
