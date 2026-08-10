/**
 * Memory Care — Records capability
 *
 * Keeps people, org, work, and billing records complete. Evaluates fill
 * rules against entity signals and routes every write through the protected
 * `memoryUpdateField` tool with tiered bars (`minThreshold`) from the care
 * decision pipeline.
 *
 * Ported from the retired memory-records system playbook.
 */

import "server-only";

import {
  memoryGetFacts,
  memoryUpdateField,
  type EvidenceChainItem,
  type LearningEntityType,
  type UpdateFieldResult,
} from "@/app/_lib/memory-tools";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  getFieldsForEntity,
  getWritePolicy,
  type ContractEntityType,
  type FillRule as RegistryFillRule,
} from "@/app/_features/memory/taxonomy/field-registry";
import { getCareFieldBar } from "../decision-pipeline";
import { CARE_SETTINGS_SLUGS } from "../types";

export interface RecordsRunInput {
  workspaceId: string;
  signal: string;
  entityType: LearningEntityType;
  entityId: string;
  entityLabel?: string;
}

export interface RecordsRunResult {
  entityType: LearningEntityType;
  entityId: string;
  rulesEvaluated: number;
  rulesMatched: number;
  updates: {
    field: string;
    value: string;
    action: UpdateFieldResult["action"];
    confidence: number;
  }[];
}

interface FillRule {
  id: string;
  field: string;
  when: {
    signal: string;
    op: "eq" | "neq" | "exists" | "not_exists" | "gte";
    value?: string | number | boolean;
  };
  set: {
    value: string;
  };
  confidence: number;
  because: string;
}

/** Map LearningEntityType → ContractEntityType used by the field registry. */
function toContractEntityType(
  entityType: LearningEntityType
): ContractEntityType | null {
  switch (entityType) {
    case "person":
      return "person";
    case "organization":
      return "org";
    case "work":
      return "work";
    case "billing":
      return "billing";
    case "meeting":
      return "meeting";
    case "file":
      return "file";
    case "me":
      return "me";
    default:
      return null;
  }
}

/**
 * Load fill rules from the field registry (canonical SoT). Skips user_only
 * and system_derived fields — Care never writes those.
 */
function getFillRulesForEntityType(entityType: LearningEntityType): FillRule[] {
  const contractType = toContractEntityType(entityType);
  if (!contractType) return [];

  const rules: FillRule[] = [];
  for (const field of getFieldsForEntity(contractType)) {
    const policy = getWritePolicy(field);
    if (policy === "user_only" || policy === "system_derived") continue;
    if (!field.fillRules?.length || !field.dbColumn) continue;

    field.fillRules.forEach((rule: RegistryFillRule, index: number) => {
      const op = rule.op ?? "eq";
      const opValue =
        rule.opValue !== undefined
          ? rule.opValue
          : op === "eq"
            ? true
            : undefined;
      rules.push({
        id: `${field.entityType}-${field.key}-${rule.signal}-${index}`,
        field: field.dbColumn as string,
        when: {
          signal: rule.signal,
          op: op === "exists" ? "exists" : op === "gte" ? "gte" : "eq",
          value: opValue,
        },
        set: { value: String(rule.value) },
        confidence: rule.confidence,
        because: rule.because,
      });
    });
  }
  return rules;
}

/**
 * Evaluate fill rules for a single entity after a signal.
 */
export async function runRecordsCapability(
  input: RecordsRunInput
): Promise<RecordsRunResult> {
  // 1. Get current facts and signals for the entity
  const { signals } = await memoryGetFacts({
    workspaceId: input.workspaceId,
    entityType: input.entityType,
    entityId: input.entityId,
  });

  // 2. Load fill rules for this entity type
  const rules = getFillRulesForEntityType(input.entityType);

  // 3. Evaluate each rule
  const updates: RecordsRunResult["updates"] = [];
  let rulesMatched = 0;

  for (const rule of rules) {
    if (!evaluateCondition(rule.when, signals)) continue;

    const resolvedValue = resolveTemplateValue(
      rule.set.value,
      signals,
      rule.when.signal
    );

    // Empty resolution = the rule matched but there is no concrete value to
    // propose (extraction template against a boolean/absent signal). The
    // Watching contract bans value-less proposals — skip, don't emit.
    if (!resolvedValue.trim()) continue;
    rulesMatched++;

    // Tiered bar: sensitive/destructive fields raise the floor; never-touch
    // fields are refused outright (the tool enforces this too).
    const { bar } = await getCareFieldBar(
      input.workspaceId,
      input.entityType,
      rule.field,
      resolvedValue
    );
    if (bar === Number.POSITIVE_INFINITY) {
      updates.push({
        field: rule.field,
        value: resolvedValue,
        action: "rejected",
        confidence: rule.confidence,
      });
      continue;
    }

    const evidenceChain: EvidenceChainItem[] = [
      {
        type: "signal",
        key: input.signal,
        value: true,
        confidence: 100,
        source: "trigger",
        label: `Signal: ${input.signal}`,
        timestamp: new Date().toISOString(),
      },
      {
        type: "signal",
        key: rule.when.signal,
        value: signals[rule.when.signal],
        confidence: rule.confidence,
        source: "entity_signals",
        label: `${rule.when.signal} ${rule.when.op} ${rule.when.value ?? "exists"}`,
      },
      {
        type: "rule",
        key: rule.id,
        value: { field: rule.field, setTo: resolvedValue },
        confidence: rule.confidence,
        source: "memory-care",
        label: rule.because,
      },
    ];

    const result = await memoryUpdateField({
      workspaceId: input.workspaceId,
      entityType: input.entityType,
      entityId: input.entityId,
      field: rule.field,
      value: resolvedValue,
      confidence: rule.confidence,
      because: rule.because,
      source: "care",
      sourceDetails: {
        playbookSlug: CARE_SETTINGS_SLUGS.records,
        ruleId: rule.id,
      },
      evidenceChain,
      minThreshold: bar > 0 ? bar : undefined,
    });

    updates.push({
      field: rule.field,
      value: resolvedValue,
      action: result.action,
      confidence: rule.confidence,
    });
  }

  return {
    entityType: input.entityType,
    entityId: input.entityId,
    rulesEvaluated: rules.length,
    rulesMatched,
    updates,
  };
}

export interface RecordsWorkspaceRunResult {
  entitiesEvaluated: number;
  rulesMatched: number;
  updates: RecordsRunResult["updates"];
}

/**
 * Run fill rules across recently active people, organizations, work,
 * billing, and non-terminal meetings in a workspace. Used by scheduled and
 * on-demand (Sync & Scan) runs where no single triggering entity exists.
 */
export async function runRecordsForWorkspace(input: {
  workspaceId: string;
  signal?: string;
  entityLimit?: number;
}): Promise<RecordsWorkspaceRunResult> {
  const admin = createAdminClient();
  const limit = input.entityLimit ?? 50;
  const signal = input.signal ?? "scheduled_scan";

  const [peopleResult, orgsResult, workResult, billingResult, meetingsResult] =
    await Promise.all([
      admin
        .from("people")
        .select("id, name")
        .eq("workspace_id", input.workspaceId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(limit),
      admin
        .from("organizations")
        .select("id, name")
        .eq("workspace_id", input.workspaceId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(limit),
      admin
        .from("work")
        .select("id, name")
        .eq("workspace_id", input.workspaceId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(limit),
      admin
        .from("billing_records")
        .select("id, number")
        .eq("workspace_id", input.workspaceId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(limit),
      // Meetings: the scan flips lifecycle status from DB-derivable signals
      // (end time passed → completed, calendar-cancelled → cancelled).
      // Skip already-terminal meetings — nothing left to derive.
      admin
        .from("meetings")
        .select("id, title")
        .eq("workspace_id", input.workspaceId)
        .is("deleted_at", null)
        .not("status", "in", "(completed,cancelled)")
        .order("updated_at", { ascending: false })
        .limit(limit),
    ]);
    // Files are intentionally NOT scanned: every file fill-rule signal is
    // extraction- or webhook-driven (classifier on ingest, signature events),
    // so a scheduled scan has nothing DB-derivable to evaluate.

  const targets: Array<{
    entityType: LearningEntityType;
    entityId: string;
    entityLabel: string;
  }> = [
    ...(peopleResult.data ?? []).map((p) => ({
      entityType: "person" as const,
      entityId: p.id,
      entityLabel: p.name ?? p.id,
    })),
    ...(orgsResult.data ?? []).map((o) => ({
      entityType: "organization" as const,
      entityId: o.id,
      entityLabel: o.name ?? o.id,
    })),
    ...(workResult.data ?? []).map((w) => ({
      entityType: "work" as const,
      entityId: w.id,
      entityLabel: w.name ?? w.id,
    })),
    ...(billingResult.data ?? []).map((b) => ({
      entityType: "billing" as const,
      entityId: b.id,
      entityLabel: b.number ?? b.id,
    })),
    ...(meetingsResult.data ?? []).map((m) => ({
      entityType: "meeting" as const,
      entityId: m.id,
      entityLabel: m.title ?? m.id,
    })),
  ];

  const result: RecordsWorkspaceRunResult = {
    entitiesEvaluated: 0,
    rulesMatched: 0,
    updates: [],
  };

  for (const target of targets) {
    try {
      const runResult = await runRecordsCapability({
        workspaceId: input.workspaceId,
        signal,
        entityType: target.entityType,
        entityId: target.entityId,
        entityLabel: target.entityLabel,
      });
      result.entitiesEvaluated++;
      result.rulesMatched += runResult.rulesMatched;
      result.updates.push(...runResult.updates);
    } catch (error) {
      console.error(
        `[memory-care:records] Workspace run failed for ${target.entityType} ${target.entityId}:`,
        error
      );
    }
  }

  return result;
}

function evaluateCondition(
  condition: FillRule["when"],
  signals: Record<string, boolean | number | string>
): boolean {
  const signalValue = signals[condition.signal];

  switch (condition.op) {
    case "eq":
      return signalValue === condition.value;
    case "neq":
      return signalValue !== condition.value;
    case "exists":
      return signalValue != null;
    case "not_exists":
      return signalValue == null;
    case "gte":
      return (
        typeof signalValue === "number" &&
        typeof condition.value === "number" &&
        signalValue >= condition.value
      );
    default:
      return false;
  }
}

function resolveTemplateValue(
  template: string,
  signals: Record<string, boolean | number | string>,
  triggerSignal: string
): string {
  // "{{extracted}}" means use the triggering signal's own value. A boolean
  // signal carries no extractable content — presence is not a value. Without
  // this guard a scan-computed boolean (e.g. meeting_synced_from_calendar)
  // would write the literal string "true" into start_time / meeting_url / …
  if (template === "{{extracted}}") {
    const extracted = signals[triggerSignal];
    if (extracted == null || typeof extracted === "boolean") return "";
    return String(extracted);
  }
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const value = signals[key];
    if (value == null || typeof value === "boolean") return "";
    return String(value);
  });
}
