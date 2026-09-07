/**
 * Evidence Accumulation Module
 *
 * Proactive record detection from captures using Fellegi-Sunter log-odds
 * scoring. Memory is fully autonomous: evidence that crosses the entity's
 * auto bar creates the record directly — there is no approval lane.
 *
 * @example
 * ```typescript
 * import {
 *   classifyEmailCapture,
 *   addSignalToEvidence,
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
  getPendingEvidenceById,
  findEvidenceByIdentifier,
  countPendingEvidence,
} from "./queries";

// Actions (system lane lives in add-signal.ts — admin client, no request scope)
export { addSignalToEvidence } from "./add-signal";

// Classifier
export type { DetectedSignal, EmailCaptureData, MeetingCaptureData } from "./classifier";
export { classifyEmailCapture, classifyMeetingCapture } from "./classifier";

// Capture Integration
export {
  processCaptureForEvidence,
  batchProcessCapturesForEvidence,
} from "./process-capture";
