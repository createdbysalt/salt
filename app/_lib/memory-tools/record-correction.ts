/**
 * memoryRecordCorrection - Learn from user corrections
 *
 * When a user overrides an auto-applied value, this records the correction
 * and feeds it back into the calibration system. If a rule keeps getting
 * corrected, we surface a recommendation to adjust the threshold.
 *
 * @example
 * ```ts
 * await memoryRecordCorrection({
 *   workspaceId: "...",
 *   entityType: "person",
 *   entityId: "...",
 *   field: "relationship_type",
 *   originalValue: "client",
 *   correctedValue: "prospect",
 *   originalProvenanceId: "...",
 *   correctionReason: "They only inquired, no payment yet",
 * });
 * ```
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { LearningEntityType } from "./types";

export interface RecordCorrectionInput {
  workspaceId: string;
  entityType: LearningEntityType;
  entityId: string;
  field: string;
  originalValue: unknown;
  correctedValue: unknown;
  originalProvenanceId: string;
  correctionReason?: string;
  correctedBy?: string;
}

export interface CorrectionPattern {
  ruleId: string;
  correctionCount: number;
  lastCorrectedAt: string;
  recommendation: "raise_threshold" | "review_rule" | "add_condition" | null;
}

export interface RecordCorrectionResult {
  correctionId: string;
  pattern: CorrectionPattern | null;
  message: string;
}

const CORRECTION_THRESHOLD = 3;
const CORRECTION_WINDOW_DAYS = 30;

/**
 * Record a user correction and check for patterns.
 */
export async function memoryRecordCorrection(
  input: RecordCorrectionInput
): Promise<RecordCorrectionResult> {
  const admin = createAdminClient();

  // 1. Get the original provenance to find the rule
  const { data: originalProvenance } = await admin
    .from("profile_field_provenance")
    .select("id, rule_id, source, confidence")
    .eq("id", input.originalProvenanceId)
    .maybeSingle();

  const ruleId = originalProvenance?.rule_id ?? null;

  // 2. Record the correction
  const { data: correction, error: insertError } = await admin
    .from("field_corrections")
    .insert({
      workspace_id: input.workspaceId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      field: input.field,
      original_value: input.originalValue,
      corrected_value: input.correctedValue,
      original_provenance_id: input.originalProvenanceId,
      reason: input.correctionReason,
      corrected_by: input.correctedBy,
      corrected_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Failed to record correction: ${insertError.message}`);
  }

  // 3. Check for patterns if this was a rule-based change
  let pattern: CorrectionPattern | null = null;

  if (ruleId) {
    pattern = await checkForPattern(admin, input.workspaceId, ruleId);
  }

  return {
    correctionId: correction.id,
    pattern,
    message: pattern?.recommendation
      ? `Correction recorded. ${getPatternMessage(pattern)}`
      : "Correction recorded.",
  };
}

/**
 * Check if a rule has been corrected frequently, indicating it may need adjustment.
 */
async function checkForPattern(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  ruleId: string
): Promise<CorrectionPattern | null> {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - CORRECTION_WINDOW_DAYS);

  // Count corrections for this rule in the window
  const { data: provenanceIds } = await admin
    .from("profile_field_provenance")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("rule_id", ruleId);

  if (!provenanceIds?.length) {
    return null;
  }

  const { count, data: recentCorrections } = await admin
    .from("field_corrections")
    .select("id, corrected_at", { count: "exact" })
    .eq("workspace_id", workspaceId)
    .in(
      "original_provenance_id",
      provenanceIds.map((p) => p.id)
    )
    .gte("corrected_at", windowStart.toISOString())
    .order("corrected_at", { ascending: false })
    .limit(10);

  const correctionCount = count ?? 0;

  if (correctionCount < CORRECTION_THRESHOLD) {
    return null;
  }

  // Determine recommendation based on correction count
  let recommendation: CorrectionPattern["recommendation"] = null;
  if (correctionCount >= CORRECTION_THRESHOLD * 2) {
    recommendation = "review_rule";
  } else if (correctionCount >= CORRECTION_THRESHOLD) {
    recommendation = "raise_threshold";
  }

  return {
    ruleId,
    correctionCount,
    lastCorrectedAt: recentCorrections?.[0]?.corrected_at ?? new Date().toISOString(),
    recommendation,
  };
}

function getPatternMessage(pattern: CorrectionPattern): string {
  switch (pattern.recommendation) {
    case "raise_threshold":
      return `Rule "${pattern.ruleId}" has been corrected ${pattern.correctionCount} times. Consider raising its threshold.`;
    case "review_rule":
      return `Rule "${pattern.ruleId}" has been corrected ${pattern.correctionCount} times. This rule may need to be reviewed or disabled.`;
    case "add_condition":
      return `Rule "${pattern.ruleId}" may need additional conditions to improve accuracy.`;
    default:
      return "";
  }
}

/**
 * Get correction analytics for a workspace.
 */
export async function getCorrectionAnalytics(
  workspaceId: string
): Promise<{
  totalCorrections: number;
  correctionsByField: Record<string, number>;
  correctionsByRule: Record<string, number>;
  recentCorrections: Array<{
    id: string;
    entityType: string;
    field: string;
    originalValue: unknown;
    correctedValue: unknown;
    correctedAt: string;
  }>;
  patternsDetected: CorrectionPattern[];
}> {
  const admin = createAdminClient();

  // Get all corrections in the last 30 days
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - CORRECTION_WINDOW_DAYS);

  const { data: corrections, count } = await admin
    .from("field_corrections")
    .select(
      `
      id,
      entity_type,
      field,
      original_value,
      corrected_value,
      original_provenance_id,
      corrected_at
    `,
      { count: "exact" }
    )
    .eq("workspace_id", workspaceId)
    .gte("corrected_at", windowStart.toISOString())
    .order("corrected_at", { ascending: false })
    .limit(100);

  if (!corrections?.length) {
    return {
      totalCorrections: 0,
      correctionsByField: {},
      correctionsByRule: {},
      recentCorrections: [],
      patternsDetected: [],
    };
  }

  // Get provenance for rule IDs
  const provenanceIds = corrections
    .map((c) => c.original_provenance_id)
    .filter(Boolean) as string[];

  const { data: provenances } = await admin
    .from("profile_field_provenance")
    .select("id, rule_id")
    .in("id", provenanceIds);

  const provenanceToRule = new Map(
    provenances?.map((p) => [p.id, p.rule_id]) ?? []
  );

  // Aggregate by field
  const correctionsByField: Record<string, number> = {};
  const correctionsByRule: Record<string, number> = {};

  for (const correction of corrections) {
    const field = correction.field;
    correctionsByField[field] = (correctionsByField[field] ?? 0) + 1;

    const ruleId = provenanceToRule.get(correction.original_provenance_id);
    if (ruleId) {
      correctionsByRule[ruleId] = (correctionsByRule[ruleId] ?? 0) + 1;
    }
  }

  // Find patterns
  const patternsDetected: CorrectionPattern[] = [];
  for (const [ruleId, correctionCount] of Object.entries(correctionsByRule)) {
    if (correctionCount >= CORRECTION_THRESHOLD) {
      const pattern: CorrectionPattern = {
        ruleId,
        correctionCount,
        lastCorrectedAt: corrections.find(
          (c) => provenanceToRule.get(c.original_provenance_id) === ruleId
        )?.corrected_at ?? new Date().toISOString(),
        recommendation:
          correctionCount >= CORRECTION_THRESHOLD * 2
            ? "review_rule"
            : "raise_threshold",
      };
      patternsDetected.push(pattern);
    }
  }

  return {
    totalCorrections: count ?? corrections.length,
    correctionsByField,
    correctionsByRule,
    recentCorrections: corrections.slice(0, 10).map((c) => ({
      id: c.id,
      entityType: c.entity_type,
      field: c.field,
      originalValue: c.original_value,
      correctedValue: c.corrected_value,
      correctedAt: c.corrected_at,
    })),
    patternsDetected,
  };
}
