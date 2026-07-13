/**
 * Memory Records Playbook - Execution Script
 *
 * This script runs when a signal triggers the Memory Records playbook.
 * It evaluates fill_rules and calls the protected memory tools.
 */

import {
  memoryUpdateField,
  memoryGetFacts,
  type UpdateFieldResult,
  type LearningEntityType,
  type EvidenceChainItem,
} from "@/app/_lib/memory-tools";

export interface RunInput {
  workspaceId: string;
  signal: string;
  entityType: LearningEntityType;
  entityId: string;
  entityLabel?: string;
}

export interface RunResult {
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

/**
 * Run the Memory Records playbook for a triggered signal.
 */
export async function run(input: RunInput): Promise<RunResult> {
  // 1. Get current facts and signals for the entity
  const { signals } = await memoryGetFacts({
    workspaceId: input.workspaceId,
    entityType: input.entityType,
    entityId: input.entityId,
  });

  // 2. Load fill_rules for this entity type
  const rules = getFillRulesForEntityType(input.entityType);

  // 3. Evaluate each rule
  const updates: RunResult["updates"] = [];
  let rulesMatched = 0;

  for (const rule of rules) {
    if (evaluateCondition(rule.when, signals)) {
      rulesMatched++;

      // Resolve template values if needed
      const resolvedValue = resolveTemplateValue(rule.set.value, signals);

      // Build evidence chain showing what led to this decision
      const evidenceChain: EvidenceChainItem[] = [
        // 1. The triggering signal
        {
          type: "signal",
          key: input.signal,
          value: true,
          confidence: 100,
          source: "trigger",
          label: `Signal: ${input.signal}`,
          timestamp: new Date().toISOString(),
        },
        // 2. The matched rule condition
        {
          type: "signal",
          key: rule.when.signal,
          value: signals[rule.when.signal],
          confidence: rule.confidence,
          source: "entity_signals",
          label: `${rule.when.signal} ${rule.when.op} ${rule.when.value ?? "exists"}`,
        },
        // 3. The matched rule
        {
          type: "rule",
          key: rule.id,
          value: { field: rule.field, setTo: resolvedValue },
          confidence: rule.confidence,
          source: "memory-records",
          label: rule.because,
        },
      ];

      // 4. Call protected tool with evidence chain
      const result = await memoryUpdateField({
        workspaceId: input.workspaceId,
        entityType: input.entityType,
        entityId: input.entityId,
        field: rule.field,
        value: resolvedValue,
        confidence: rule.confidence,
        because: rule.because,
        source: "playbook",
        sourceDetails: {
          playbookSlug: "memory-records",
          ruleId: rule.id,
        },
        evidenceChain,
      });

      updates.push({
        field: rule.field,
        value: resolvedValue,
        action: result.action,
        confidence: rule.confidence,
      });
    }
  }

  return {
    entityType: input.entityType,
    entityId: input.entityId,
    rulesEvaluated: rules.length,
    rulesMatched,
    updates,
  };
}

/**
 * Evaluate a rule condition against current signals.
 */
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

/**
 * Resolve template values like {{extracted_title}}.
 */
function resolveTemplateValue(
  template: string,
  signals: Record<string, boolean | number | string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const value = signals[key];
    return value != null ? String(value) : "";
  });
}

/**
 * Get fill_rules for a specific entity type.
 * These are imported from the definition.yaml at build time.
 */
function getFillRulesForEntityType(entityType: LearningEntityType): FillRule[] {
  // TODO: Load from definition.yaml
  // For now, return the critical rules inline
  switch (entityType) {
    case "person":
      return PERSON_FILL_RULES;
    case "organization":
      return ORG_FILL_RULES;
    case "work":
      return WORK_FILL_RULES;
    case "billing":
      return BILLING_FILL_RULES;
    case "meeting":
      return MEETING_FILL_RULES;
    case "file":
      return FILE_FILL_RULES;
    default:
      return [];
  }
}

// =============================================================================
// Fill Rules (extracted from definition.yaml)
// =============================================================================

const PERSON_FILL_RULES: FillRule[] = [
  {
    id: "people-rel-payment-client",
    field: "relationship_type",
    when: { signal: "has_payment_received", op: "eq", value: true },
    set: { value: "client" },
    confidence: 95,
    because: "They paid you — strong client signal",
  },
  {
    id: "people-rel-invoice-client",
    field: "relationship_type",
    when: { signal: "has_invoice_sent", op: "eq", value: true },
    set: { value: "client" },
    confidence: 90,
    because: "You invoiced them — likely a client",
  },
  {
    id: "people-rel-workspace-team",
    field: "relationship_type",
    when: { signal: "email_domain_matches_workspace", op: "eq", value: true },
    set: { value: "team" },
    confidence: 92,
    because: "Same email domain as your workspace",
  },
];

const ORG_FILL_RULES: FillRule[] = [
  {
    id: "org-rel-payment-client",
    field: "relationship_status",
    when: { signal: "org_has_payment_received", op: "eq", value: true },
    set: { value: "client" },
    confidence: 95,
    because: "This organization paid you",
  },
  {
    id: "org-rel-invoice-client",
    field: "relationship_status",
    when: { signal: "org_has_invoice_sent", op: "eq", value: true },
    set: { value: "client" },
    confidence: 90,
    because: "You invoiced this organization",
  },
];

const WORK_FILL_RULES: FillRule[] = [
  {
    id: "work-status-active-kickoff",
    field: "status",
    when: { signal: "work_has_kickoff", op: "eq", value: true },
    set: { value: "active" },
    confidence: 90,
    because: "Kickoff meeting occurred — work is active",
  },
  {
    id: "work-status-signed-contract",
    field: "status",
    when: { signal: "work_has_signed_contract", op: "eq", value: true },
    set: { value: "signed" },
    confidence: 95,
    because: "Contract was signed",
  },
];

const BILLING_FILL_RULES: FillRule[] = [
  {
    id: "billing-status-paid",
    field: "status",
    when: { signal: "billing_amount_paid_covers_total", op: "eq", value: true },
    set: { value: "paid" },
    confidence: 98,
    because: "Payment received covers the invoice amount",
  },
  {
    id: "billing-status-overdue",
    field: "status",
    when: { signal: "billing_due_date_passed", op: "eq", value: true },
    set: { value: "overdue" },
    confidence: 95,
    because: "Due date has passed without full payment",
  },
];

const MEETING_FILL_RULES: FillRule[] = [
  {
    id: "meeting-status-completed",
    field: "status",
    when: { signal: "meeting_has_attendance_evidence", op: "eq", value: true },
    set: { value: "completed" },
    confidence: 90,
    because: "Evidence shows the meeting happened",
  },
  {
    id: "meeting-status-cancelled",
    field: "status",
    when: { signal: "meeting_cancelled_by_calendar", op: "eq", value: true },
    set: { value: "cancelled" },
    confidence: 95,
    because: "Calendar event was cancelled",
  },
];

const FILE_FILL_RULES: FillRule[] = [
  {
    id: "file-lifecycle-signed",
    field: "lifecycle_status",
    when: { signal: "file_signature_event_signed", op: "eq", value: true },
    set: { value: "signed" },
    confidence: 98,
    because: "Document was signed",
  },
  {
    id: "file-lifecycle-expired",
    field: "lifecycle_status",
    when: { signal: "file_signature_event_expired", op: "eq", value: true },
    set: { value: "expired" },
    confidence: 95,
    because: "Signature request expired",
  },
];
