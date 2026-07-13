/**
 * Evidence Accumulation Module
 *
 * Proactive record detection from captures using Fellegi-Sunter log-odds scoring.
 *
 * @example
 * ```typescript
 * import {
 *   classifyEmailCapture,
 *   addSignalToEvidence,
 *   getSuggestedRecords,
 * } from "@/app/_features/memory/evidence";
 *
 * // When an email arrives, classify it for signals
 * const signals = await classifyEmailCapture(workspaceId, emailData);
 *
 * // Add each signal to the evidence store
 * for (const signal of signals) {
 *   await addSignalToEvidence({
 *     workspaceId,
 *     entityType: signal.entityType,
 *     identifier: signal.identifier,
 *     signal: signal.signal,
 *     captureId,
 *     extractedData: signal.extractedData,
 *   });
 * }
 *
 * // Get records ready to create
 * const suggested = await getSuggestedRecords(workspaceId);
 * ```
 */

// Types
export type {
  EvidenceStatus,
  PendingEvidenceRow,
  PendingEvidenceSignalRow,
  ExtractedFieldValue,
  AddSignalInput,
  AddSignalResult,
  PendingEvidenceWithSignals,
} from "./types";

// Queries
export {
  getPendingEvidence,
  getSuggestedRecords,
  getPendingEvidenceById,
  findEvidenceByIdentifier,
  countPendingEvidence,
} from "./queries";

// Actions
export {
  addSignalToEvidence,
  dismissEvidence,
  markEvidenceCreated,
  restoreEvidence,
} from "./actions";

// Classifier
export type { DetectedSignal, EmailCaptureData, MeetingCaptureData } from "./classifier";
export { classifyEmailCapture, classifyMeetingCapture } from "./classifier";

// Capture Integration
export {
  processCaptureForEvidence,
  batchProcessCapturesForEvidence,
} from "./process-capture";
