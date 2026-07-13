/**
 * Workspace Signal Registry
 *
 * @deprecated Import from `@/app/_lib/learning` instead.
 * This file re-exports for backward compatibility.
 */

export {
  // Types
  type SignalSurface,
  type SignalDefinition,
  // Constants
  SIGNAL_REGISTRY,
  ALL_SIGNAL_KEYS,
  // Functions
  isValidSignalKey,
  getSignalDefinition,
  getActingTriggerSignals,
  getSignalsForSurface,
} from "@/app/_lib/learning";
