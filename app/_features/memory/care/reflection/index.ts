/**
 * Memory Reflection Pass Module
 *
 * P8 pattern-level learning: corrections cluster by signal source + field type,
 * enabling Salt to learn "be more careful about X for Y" without blocking
 * individual instances.
 *
 * @example
 * ```ts
 * import {
 *   getSignalSourceWeight,
 *   incrementReflectionTrigger,
 *   runPendingReflections,
 * } from "@/app/_features/memory/care/reflection";
 * ```
 */

// Types
export type {
  ReflectionCategory,
  ReflectionTrigger,
  ReflectionTriggerRow,
  SignalSourceWeight,
  SignalSourceWeightRow,
  IncrementTriggerInput,
  IncrementTriggerResult,
  CorrectionCluster,
  RunReflectionInput,
  RunReflectionResult,
} from "./types";

export {
  REFLECTION_CONFIG,
  buildCategory,
  parseCategory,
  calculateWeight,
  toReflectionTrigger,
  toSignalSourceWeight,
} from "./types";

// Triggers
export {
  incrementReflectionTrigger,
  getPendingReflectionTriggers,
  resetReflectionTrigger,
  getAllReflectionTriggers,
} from "./triggers";

// Weights
export {
  getSignalSourceWeight,
  getAllSignalSourceWeights,
  getWeightsForSource,
  getWeightsForField,
  resetSignalSourceWeight,
  resetAllSignalSourceWeights,
} from "./weights";

// Reflection Pass
export {
  runReflectionPass,
  runPendingReflections,
  runFullReflectionScan,
} from "./reflection-pass";
