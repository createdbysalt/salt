/**
 * Learning Infrastructure
 *
 * Shared infrastructure for evidence accumulation and signal registry.
 * Used across Keeper playbooks, enrichment layer, Ask Salt, and the
 * upcoming LEARN → ACT → GROW loop.
 *
 * @example
 * ```ts
 * import {
 *   accumulateEvidence,
 *   getAggregatedConfidence,
 *   SIGNAL_REGISTRY,
 * } from "@/app/_lib/learning";
 * ```
 */

// Types
export type {
  LearningEntityType,
  EvidenceType,
  EvidenceResolution,
  SignalSurface,
  SignalDefinition,
  EntityEvidenceRow,
  AccumulateEvidenceInput,
  AggregatedEvidence,
} from "./types";

// Evidence accumulation
export {
  FIELD_TTL_DAYS,
  EVIDENCE_TYPE_WEIGHTS,
  getFieldTtl,
  computeCorroboratedConfidence,
  valuesContradict,
  accumulateEvidence,
  getAggregatedConfidence,
  resolveEvidence,
  getPendingEvidenceForEntity,
  expireOldEvidence,
} from "./evidence";

// Signal registry
export {
  SIGNAL_REGISTRY,
  ALL_SIGNAL_KEYS,
  isValidSignalKey,
  getSignalDefinition,
  getActingTriggerSignals,
  getSignalsForSurface,
} from "./signals";

// Outcome tracking
export type {
  OutcomeType,
  OutcomeExpected,
  RecordOutcomeInput,
  SetExpectedOutcomeInput,
  PendingOutcomePlay,
  OutcomeSignal,
  CalibrationData,
} from "./outcomes";

export {
  setExpectedOutcome,
  recordOutcome,
  findPlaysAwaitingOutcome,
  checkAndTimeoutExpiredPlays,
  processOutcomeSignal,
  getCalibrationData,
} from "./outcomes";

// Calibration & GROW
export type {
  CalibrationReport,
  CalibrationRecommendation,
  PlaybookFeedbackPattern,
  AutoHandledMetrics,
} from "./calibration";

export {
  generateCalibrationReport,
  detectPlaybookFeedbackPatterns,
  getAutoHandledMetrics,
} from "./calibration";

// Queue budget & flood prevention
export type {
  QueueBudgetSettings,
  QueueBudgetStatus,
  QueueDecision,
  OvernightSummary,
} from "./queue-budget";

export {
  DEFAULT_QUEUE_BUDGET,
  getQueueBudgetSettings,
  updateQueueBudgetSettings,
  getQueueBudgetStatus,
  shouldRouteToNeedsYou,
  generateOvernightSummary,
} from "./queue-budget";

// Inline signal emission
export type {
  EmitEntitySignalInput,
  EmitEntitySignalResult,
} from "./emit-signal";

export {
  emitEntitySignal,
  emitEntitySignalAsync,
  emitEntitySignals,
} from "./emit-signal";

// Entity watch system
export type {
  EntityWatch,
  RegisterWatchInput,
  RegisterWatchResult,
} from "./watches";

export {
  registerEntityWatch,
  removeWatch,
  removeWatchesForEntity,
  getActiveWatches,
  processCaptureAgainstWatches,
  expireOldWatches,
  expireOverTriggeredWatches,
} from "./watches";
