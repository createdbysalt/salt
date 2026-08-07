import "server-only";

import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";
import type { LearningEntityType } from "@/app/_lib/learning";

/**
 * Handled items for Memory → Filter → Handled.
 *
 * The audit trail of writes Salt has already applied to Memory records
 * (`salt_learnings`, not undone). Transparency-first: every applied write is
 * visible here with why it happened, and each can be corrected with
 * "That's wrong" (rollback + correction signal).
 */

export interface HandledWrite {
  learningId: string;
  entityType: LearningEntityType;
  entityId: string;
  entityLabel: string;
  fieldPath: string;
  fieldLabel: string;
  oldValue: string | null;
  newValue: string;
  confidence: number;
  evidenceSummary: string;
  /** Capability that applied the write (from the recorded slug). */
  capabilitySlug: string | null;
  createdAt: string;
}

interface SaltLearningQueryRow {
  id: string;
  entity_type: LearningEntityType;
  entity_id: string;
  entity_label: string;
  field_path: string;
  field_label: string | null;
  old_value: unknown;
  new_value: unknown;
  confidence: number;
  evidence_summary: string;
  playbook_slug: string | null;
  created_at: string;
}

function formatValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatFieldLabel(fieldPath: string): string {
  return fieldPath.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const getHandledWrites = cache(
  async (workspaceId: string, limit = 30): Promise<HandledWrite[]> => {
    const supabase = await createClient();

    const since = new Date();
    since.setDate(since.getDate() - 14);

    const { data, error } = await supabase
      .from("salt_learnings")
      .select(
        `
        id,
        entity_type,
        entity_id,
        entity_label,
        field_path,
        field_label,
        old_value,
        new_value,
        confidence,
        evidence_summary,
        playbook_slug,
        created_at
      `,
      )
      .eq("workspace_id", workspaceId)
      .is("undone_at", null)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error(
        "[handled-items] query error:",
        error.message,
        error.code,
      );
      return [];
    }

    return ((data ?? []) as SaltLearningQueryRow[]).map((row) => ({
      learningId: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      entityLabel: row.entity_label,
      fieldPath: row.field_path,
      fieldLabel: row.field_label ?? formatFieldLabel(row.field_path),
      oldValue: formatValue(row.old_value),
      newValue: formatValue(row.new_value) ?? "",
      confidence: row.confidence,
      evidenceSummary: row.evidence_summary,
      capabilitySlug: row.playbook_slug,
      createdAt: row.created_at,
    }));
  },
);
