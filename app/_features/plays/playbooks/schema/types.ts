/**
 * Playbook Definition Schema (v2)
 *
 * Declarative playbook definitions that specify:
 * - What categories/capabilities the playbook needs (connector-agnostic)
 * - When the playbook triggers (signals or schedules)
 * - What data to fetch (category-based)
 * - How to classify/process entities
 * - What output to generate
 *
 * Based on patterns from Anthropic's knowledge-work-plugins.
 */

import type { ConnectorCategory } from "@/app/_lib/composio/enrichment/types";

export interface PlaybookRequirements {
  categories: {
    required: ConnectorCategory[];
    optional?: ConnectorCategory[];
  };
  capabilities: {
    required: string[];
    optional?: string[];
  };
}

export type PlaybookTriggerType = "signal" | "schedule";

export interface PlaybookSignalTrigger {
  type: "signal";
  signal: string;
  surface?: string;
}

export interface PlaybookScheduleTrigger {
  type: "schedule";
  cron: string;
  timezone?: string;
}

export type PlaybookTrigger = PlaybookSignalTrigger | PlaybookScheduleTrigger;

export interface PlaybookFetchSpec {
  id: string;
  category: ConnectorCategory;
  capability: string;
  filter?: Record<string, unknown>;
  optional?: boolean;
}

export interface PlaybookClassifyRule {
  condition: string;
  tag: string;
  [key: string]: unknown;
}

export interface PlaybookClassifySpec {
  forEach: string;
  rules: PlaybookClassifyRule[];
  defaultTag?: string;
}

export type PlaybookOutputType =
  | "batch_drafts"
  | "single_draft"
  | "notification"
  | "memory_update"
  | "finding";

export type PlaybookApprovalMode =
  | "none"
  | "per_entity"
  | "batch_review"
  | "batch_confirm";

export interface PlaybookOutputSpec {
  type: PlaybookOutputType;
  approvalMode?: PlaybookApprovalMode;
  template?: string;
}

export interface PlaybookDefinition {
  name: string;
  slug: string;
  description: string;
  version: string;
  kind: "acting" | "profile";
  player?: string;

  requirements: PlaybookRequirements;
  triggers: PlaybookTrigger[];
  fetch?: PlaybookFetchSpec[];
  classify?: PlaybookClassifySpec;
  output: PlaybookOutputSpec;
}

export interface PlaybookExecutionContext {
  workspaceId: string;
  userId: string;
  triggeredBy: {
    type: "signal" | "schedule" | "manual";
    signalKey?: string;
    entityId?: string;
    entitySurface?: string;
  };
  connectedCategories: Set<ConnectorCategory>;
  connectedCapabilities: Set<string>;
}

export interface PlaybookExecutionResult {
  status: "success" | "skipped" | "error";
  playbookSlug: string;
  reason?: string;
  outputCount?: number;
  playRunIds?: string[];
  fetchResults?: Record<string, unknown>;
  classifyResults?: unknown[];
  durationMs: number;
}

export interface PlaybookValidationError {
  path: string;
  message: string;
}

export interface PlaybookValidationResult {
  valid: boolean;
  errors: PlaybookValidationError[];
}
