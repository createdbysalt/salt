import type { FindingState, FindingType } from "@/app/_features/capture/types/intelligence-findings";
import { getRelationshipLabel } from "@/app/_features/memory/taxonomy/registry";
import {
  buildKeeperProfileFindingCopy,
  isActionableKeeperProfileResult,
  keeperPlaybookDisplayName,
} from "./keeper-profile-display";
import type {
  ProfileEntityType,
  ProfileFieldKey,
  ProfileFieldResult,
} from "./types";

export interface KeeperProfileFindingPayload {
  workspace_id: string;
  person_id: string | null;
  org_id: string | null;
  finding_type: FindingType;
  title: string;
  content: string;
  evidence: {
    source_type: "email";
    quotes?: string[];
    metadata: Record<string, unknown>;
  };
  confidence: number;
  state: FindingState;
}

export interface BuildKeeperProfileFindingInput {
  workspaceId: string;
  entityType: ProfileEntityType;
  entityId: string;
  field: ProfileFieldKey;
  result: ProfileFieldResult;
  blueprintSlug: string;
  blueprintVersion: number;
  provenanceId: string | null;
  targetLabel?: string | null;
}

/** Relationship choices Salt asks about when it can't confidently guess. */
export const RELATIONSHIP_QUESTION_OPTIONS = [
  "client",
  "prospect",
  "partner",
  "vendor",
] as const;

export interface BuildRelationshipQuestionInput {
  workspaceId: string;
  personId: string;
  targetLabel: string | null;
  blueprintSlug: string;
  blueprintVersion: number;
}

/**
 * A one-tap question play asking how the user knows a contact, used when Salt
 * has a real person but can't confidently classify the relationship. Never
 * gates saving — the field stays empty until answered.
 */
export function buildRelationshipQuestionFindingPayload(
  input: BuildRelationshipQuestionInput,
): KeeperProfileFindingPayload {
  const target = input.targetLabel?.trim() || "this contact";
  return {
    workspace_id: input.workspaceId,
    person_id: input.personId,
    org_id: null,
    finding_type: "needs_routing",
    title: `How do you know ${target}?`,
    content:
      "Salt couldn't tell client, prospect, partner, or vendor from the signals so far. One tap sets it.",
    evidence: {
      source_type: "email",
      metadata: {
        keeper_profile: true,
        keeper_question: true,
        question_field: "relationship_type",
        question_options: RELATIONSHIP_QUESTION_OPTIONS.map((value) => ({
          value,
          label: getRelationshipLabel(value),
        })),
        profile_entity_type: "person",
        profile_entity_id: input.personId,
        profile_field: "relationship_type",
        blueprint_slug: input.blueprintSlug,
        blueprint_version: input.blueprintVersion,
        blueprint_name: keeperPlaybookDisplayName(input.blueprintSlug),
      },
    },
    confidence: 0,
    state: "needs_you",
  };
}

function targetForEntity(entityType: ProfileEntityType, entityId: string): {
  person_id: string | null;
  org_id: string | null;
} | null {
  if (entityType === "person") {
    return { person_id: entityId, org_id: null };
  }
  if (entityType === "organization") {
    return { person_id: null, org_id: entityId };
  }
  return null;
}

export function buildKeeperProfileFindingPayload(
  input: BuildKeeperProfileFindingInput,
): KeeperProfileFindingPayload | null {
  const target = targetForEntity(input.entityType, input.entityId);
  if (!target) return null;
  if (!isActionableKeeperProfileResult(input.result)) return null;

  const state: FindingState =
    input.result.status === "applied" ? "auto_handled" : "needs_you";
  const copy = buildKeeperProfileFindingCopy({
    field: input.field,
    result: input.result,
    targetLabel: input.targetLabel ?? null,
    blueprintSlug: input.blueprintSlug,
  });

  return {
    workspace_id: input.workspaceId,
    ...target,
    finding_type: "needs_routing",
    title: copy.title,
    content: copy.content,
    evidence: {
      source_type: "email",
      quotes: input.result.because ? [input.result.because] : undefined,
      metadata: {
        keeper_profile: true,
        profile_entity_type: input.entityType,
        profile_entity_id: input.entityId,
        profile_field: input.field,
        profile_value: input.result.value,
        profile_status: input.result.status,
        profile_source: input.result.source,
        profile_rule_id: input.result.ruleId,
        profile_provenance_id: input.provenanceId,
        blueprint_slug: input.blueprintSlug,
        blueprint_version: input.blueprintVersion,
        blueprint_name: keeperPlaybookDisplayName(input.blueprintSlug),
        primary_action: copy.primaryAction,
        because: input.result.because,
        evidence: input.result.evidence,
      },
    },
    confidence: input.result.confidence,
    state,
  };
}
