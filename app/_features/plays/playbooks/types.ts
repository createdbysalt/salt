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

/**
 * Canonical trigger taxonomy (Phase 2.7).
 *
 * Every playbook declares HOW it fires. The dispatch engine consumes these
 * declarations — a trigger that no engine reads is forbidden.
 *
 * | Type | Fires when | Engine |
 * |------|------------|--------|
 * | signal | Capture emits a workspace signal | records-engine (keeper), proposal (acting) |
 * | schedule | Cron spec matches | daily-scan |
 * | pattern | Threshold predicate on Memory | pattern-scanner |
 * | chat | User invokes via Ask SALT | playbook-tools routing |
 * | manual | User clicks "Run" in Plays UI | direct create |
 */
export type PlaybookTriggerType = "signal" | "schedule" | "pattern" | "chat" | "manual";

export interface PlaybookTriggerSignal {
  type: "signal";
  /** Workspace signal key from the signal registry (e.g., "person_silent_14d"). */
  signal: string;
}

export interface PlaybookTriggerSchedule {
  type: "schedule";
  /** Cron expression (e.g., "0 9 * * 1" for Mondays at 9am). */
  cron: string;
  /** Optional timezone (default: workspace timezone). */
  timezone?: string;
}

export interface PlaybookTriggerPattern {
  type: "pattern";
  /** Pattern predicate spec (e.g., days_since_contact >= 14). */
  predicate: {
    field: string;
    op: "eq" | "ne" | "gt" | "gte" | "lt" | "lte";
    value: number | string | boolean;
  };
  /** Optional minimum confidence before firing. */
  minConfidence?: number;
}

export interface PlaybookTriggerChat {
  type: "chat";
}

export interface PlaybookTriggerManual {
  type: "manual";
}

export type PlaybookTrigger =
  | PlaybookTriggerSignal
  | PlaybookTriggerSchedule
  | PlaybookTriggerPattern
  | PlaybookTriggerChat
  | PlaybookTriggerManual
  | { type: string; [key: string]: unknown };

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
  /**
   * Composio toolkit slugs this playbook requires (e.g. ["gmail", "stripe"]).
   * Derived from required_actions if not explicitly declared.
   * Adoption checks these are connected; runs pause when a toolkit disconnects.
   */
  required_toolkits: string[];
}

export interface ParsedPlaybook {
  frontmatter: ParsedPlaybookFrontmatter;
  procedure_md: string;
  definition: PlayDefinition;
  required_actions: string[];
  fill_rules: ProfileFillRulesDocument | null;
}

export type PlaybookOrigin = "salt" | "user";

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
  /** Composio toolkit slugs required by this playbook. */
  required_toolkits: string[];
  value_model: PlayValueModel | null;
  version: number;
  status: PlaybookBlueprintStatus;
  created_at: string;
  updated_at: string;
  /** NULL = global Salt-authored, UUID = workspace-scoped user-created. */
  workspace_id: string | null;
  /** 'salt' = system, 'user' = user-created. */
  origin: PlaybookOrigin;
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
