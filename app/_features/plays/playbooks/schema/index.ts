/**
 * Playbook Schema Module
 *
 * Declarative playbook definitions with:
 * - Type-safe schema (Zod validation)
 * - YAML parsing
 * - Category-based execution
 * - Graceful degradation
 *
 * v2 introduces section-based organization:
 * - Section: Where the playbook lives (relationships, work, billing, etc.)
 * - Layer: What it does (learn = Memory Care, act = action)
 * - Voice: How it sounds (references voice profiles in /me)
 */

export type {
  PlaybookDefinition,
  PlaybookRequirements,
  PlaybookTrigger,
  PlaybookSignalTrigger,
  PlaybookScheduleTrigger,
  PlaybookFetchSpec,
  PlaybookClassifySpec,
  PlaybookClassifyRule,
  PlaybookOutputSpec,
  PlaybookOutputType,
  PlaybookApprovalMode,
  PlaybookExecutionContext,
  PlaybookExecutionResult,
  PlaybookValidationResult,
  PlaybookValidationError,
} from "./types";

export {
  parsePlaybookYaml,
  validatePlaybook,
  generatePlaybookTypes,
} from "./parser";

export {
  executePlaybook,
  buildExecutionContext,
  canPlaybookRun,
} from "./executor";

export * as v2 from "./v2";
