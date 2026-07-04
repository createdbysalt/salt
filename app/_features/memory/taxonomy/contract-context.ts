/**
 * Field Contract Context
 *
 * Single source of AI-facing field contracts, generated from the registry.
 * Everything that tells an LLM what a field means — Keeper playbook prompts,
 * records-engine validation messages, the capture email analyzer — reads the
 * same contract via this module, so prompts can never drift from the
 * dropdowns or the DB constraints.
 *
 * The output is data, not instructions: callers embed it in prompts inside
 * their own fencing (see buildMemoryContextBlock in
 * capture/services/intelligence/scoped-memory-context.ts for the pattern).
 */

import {
  ALL_CONTRACT_FIELDS,
  getFieldsForEntity,
  getWritePolicy,
  type ContractEntityType,
  type FieldDescriptor,
  type WritePolicy,
} from "./field-registry";
import { VOCABULARY_REGISTRY } from "./registry";

const POLICY_LABEL: Record<WritePolicy, string> = {
  keeper_auto: "auto-apply above confidence threshold",
  keeper_ask: "propose and wait for approval",
  user_only: "never write (user only)",
  system_derived: "derived value (write the inputs, never this field)",
};

function vocabularySlugs(vocabularyKey: string): string[] {
  return (VOCABULARY_REGISTRY[vocabularyKey]?.values ?? []).map((v) => v.slug);
}

function describeField(field: FieldDescriptor): string {
  const parts: string[] = [`${field.key}: ${field.aiDescription}`];
  if (field.vocabulary) {
    const slugs = vocabularySlugs(field.vocabulary);
    if (slugs.length > 0) parts.push(`allowed values: ${slugs.join(", ")}`);
  }
  if (field.formatRule) parts.push(`format: ${field.formatRule}`);
  if (field.emptyMeaning) parts.push(`empty means: ${field.emptyMeaning}`);
  parts.push(`policy: ${POLICY_LABEL[getWritePolicy(field)]}`);
  return `- ${parts.join(" | ")}`;
}

/**
 * The field contract for one memory type as a compact prompt fragment.
 * One line per field: definition, allowed values, format, write policy.
 */
export function buildFieldContractContext(entityType: ContractEntityType): string {
  const fields = getFieldsForEntity(entityType);
  if (fields.length === 0) return "";
  const lines = fields.map(describeField);
  return [`Field contract for ${entityType} records:`, ...lines].join("\n");
}

/**
 * Only the fields Keeper is allowed to touch (auto or ask) — the working set
 * for playbook rule authoring and proposal generation.
 */
export function buildKeeperWritableContext(entityType: ContractEntityType): string {
  const fields = getFieldsForEntity(entityType).filter((f) => {
    const policy = getWritePolicy(f);
    return policy === "keeper_auto" || policy === "keeper_ask";
  });
  if (fields.length === 0) return "";
  const lines = fields.map(describeField);
  return [`Fields Keeper may maintain on ${entityType} records:`, ...lines].join("\n");
}

/**
 * Registry integrity facts used by tests: every vocabulary a field references
 * must exist in VOCABULARY_REGISTRY.
 */
export function findUnknownVocabularyReferences(): Array<{
  entityType: string;
  key: string;
  vocabulary: string;
}> {
  return ALL_CONTRACT_FIELDS.filter(
    (f) => f.vocabulary && !VOCABULARY_REGISTRY[f.vocabulary]
  ).map((f) => ({
    entityType: f.entityType,
    key: f.key,
    vocabulary: f.vocabulary!,
  }));
}
