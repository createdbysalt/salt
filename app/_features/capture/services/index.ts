/**
 * Capture Services Index
 *
 * Export all capture-related services for easy importing.
 */

// Confidence scoring
export {
  calculateSurfaceConfidence,
  calculateOverallConfidence,
  scoreContactSignal,
  filterHighSignalContacts,
} from "./confidence";

// Routing
export {
  routeCapture,
  routePendingCaptures,
  approveRoutingDecision,
  dismissRoutingDecision,
  correctRoutingDecision,
} from "./routing";

// Play triggers
export {
  evaluateTriggers,
  processCaptureTriggers,
  processRecentCaptureTriggers,
  type TriggerPatternId,
  type TriggerPattern,
  type CaptureForTrigger,
  type PlayTriggerData,
} from "./play-triggers";

// Pattern scanning
export {
  runPatternScans,
  getPatternScanStatus,
  scheduleNextScan,
  type ScanPatternId,
  type ScanPattern,
  type PatternMatch,
} from "./pattern-scanner";

// Connector ingestion
export { backfillGmailCaptures, runGmailBootstrap } from "./gmail-backfill";
export type { GmailBackfillOptions, GmailBackfillResult } from "./gmail-backfill";
export {
  backfillCalendarCaptures,
  backfillDriveCaptures,
  backfillStripeCaptures,
  runCalendarBootstrap,
  runDriveBootstrap,
  runStripeBootstrap,
} from "./connector-backfills";
export type { ConnectorBackfillResult } from "./connector-backfills";
