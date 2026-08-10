/**
 * Capture Enrichment Module
 *
 * Transforms captures from "something was captured" to rich business records
 * with signals, linked Memory records, play-fit scores, and suggested actions.
 */

export * from "./types";
export { extractCaptureSignals } from "./signal-extractor";
export { findMatchingRecords } from "./record-matcher";
export { enrichCapture, enrichAndPersist, reenrichCapture } from "./enrichment-pipeline";
export {
  evaluateRecordCapture,
  buildRecordCaptureInput,
  type RecordCaptureInput,
  type RecordCaptureDecision,
  type CreateDecision,
  type WatchDecision,
  type NothingDecision,
} from "./record-capture-criteria";
