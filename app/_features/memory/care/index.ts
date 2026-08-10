/**
 * Memory Care — public API.
 *
 * Memory Care keeps Memory complete, clean, connected, and noted. It is not
 * a playbook: no approval queues, no play_runs, no Playbooks-tab presence.
 * Configuration lives in Memory → Rules; transparency lives in Memory →
 * Filter (Watching / Handled / Kept out).
 */

export {
  CARE_CAPABILITIES,
  CARE_CAPABILITY_META,
  CARE_SETTINGS_SLUGS,
  DEFAULT_CARE_THRESHOLD,
  type CareCapability,
  type CareDecision,
  type CareProposal,
  type CareRunContext,
  type CareRunResult,
} from "./types";
export {
  getCareThreshold,
  getCareCapabilityStates,
  isCareCapabilityEnabled,
} from "./settings";
export { processCareProposal, getCareFieldBar } from "./decision-pipeline";
export {
  runCareCapability,
  runCareForSignal,
  runDueCareCapabilities,
  findDueCareCapabilities,
  getCareSignalKeys,
  signalHasCareCapability,
  recordCareRun,
} from "./scheduler";
