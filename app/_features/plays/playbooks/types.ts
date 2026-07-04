import type { PlayDefinition, PlayValueModel } from "../utils/play-definition";
import type { PlaybookKind, PlayerSlug } from "../types";
import type { ProfileFillRulesDocument } from "./records-engine/types";
import type { PlayCardKind } from "../play-card/types";

export type PlaybookBlueprintStatus = "active" | "deprecated";

export type PlaybookLearningSignalType =
  | "edited"
  | "dismissed"
  | "failed"
  | "guard_skipped";

export type PlaybookImprovementStatus = "pending" | "approved" | "rejected";

export type PlaybookEvalOrigin = "authored" | "from_edge_case";

export interface PlaybookTrigger {
  type: string;
  signal?: string;
  min_days_since_contact?: number;
  min_days_overdue?: number;
  [key: string]: unknown;
}

export interface PlaybookConsentMeta {
  approval_required?: boolean;
}

export interface ParsedPlaybookFrontmatter {
  slug: string;
  name: string;
  kind: PlaybookKind;
  /** Which card body layout this playbook uses. Required for Phase 4+ validation. */
  play_card_kind: PlayCardKind | null;
  player_slug: PlayerSlug;
  description: string;
  when_to_use: string;
  trigger: PlaybookTrigger;
  consent: PlaybookConsentMeta;
  value: PlayValueModel | null;
}

export interface ParsedPlaybook {
  frontmatter: ParsedPlaybookFrontmatter;
  procedure_md: string;
  definition: PlayDefinition;
  required_actions: string[];
  fill_rules: ProfileFillRulesDocument | null;
}

export interface PlaybookBlueprintRow {
  slug: string;
  name: string;
  kind: PlaybookKind;
  player_slug: string;
  description: string | null;
  when_to_use: string | null;
  trigger: PlaybookTrigger;
  procedure_md: string;
  definition: PlayDefinition;
  fill_rules: ProfileFillRulesDocument | null;
  required_actions: string[];
  value_model: PlayValueModel | null;
  version: number;
  status: PlaybookBlueprintStatus;
  created_at: string;
  updated_at: string;
}

export interface PlaybookEvalAssertion {
  type:
    | "bound_contains"
    | "bound_exists"
    | "context_path_eq"
    | "context_path_gte"
    | "act_executed"
    | "guard_skipped"
    | "no_act_executed"
    | "field_value_eq"
    | "field_status_eq"
    | "field_source_eq"
    | "entity_classification_eq"
    | "admission_decision_eq";
  bind?: string;
  path?: string;
  field?: string;
  expected?: string;
  substring?: string;
  value?: string | number | boolean;
  tool?: string;
}

export interface PlaybookEvalCase {
  id: string;
  name: string;
  input: Record<string, unknown>;
  mocks?: Record<string, unknown>;
  llmOutputs?: Record<string, string>;
  assertions: PlaybookEvalAssertion[];
}

export interface PlaybookEvalFile {
  playbook_slug: string;
  evals: PlaybookEvalCase[];
}

export interface PlaybookEvalResult {
  eval_id: string;
  eval_name: string;
  passed: boolean;
  evidence: string[];
}

export interface PlaybookBenchmarkResult {
  playbook_slug: string;
  version: number;
  passed: number;
  total: number;
  results: PlaybookEvalResult[];
}

export interface PlaybookImprovementProposalInput {
  blueprint_slug: string;
  from_version: number;
  proposed_procedure_md: string;
  proposed_definition: PlayDefinition;
  proposed_required_actions: string[];
  rationale: string;
  evidence: Record<string, unknown>[];
  benchmark_delta?: Record<string, unknown>;
}

export interface PlaybookLearningSignalInput {
  workspaceId: string;
  blueprintSlug: string | null;
  templateId: string | null;
  playRunId: string | null;
  signalType: PlaybookLearningSignalType;
  delta: Record<string, unknown>;
}
