export { analyzeEmail, ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt } from "./email-analyzer";
export type { EmailToAnalyze, EmailAnalysis, AnalyzeEmailOptions } from "./email-analyzer";

export {
  classifyCaptureNoise,
  emailToNoiseInput,
  buildNoiseInputFromCaptureRow,
} from "./capture-noise";
export type {
  CaptureNoiseInput,
  CaptureNoiseResult,
  CaptureNoiseCategory,
  EmailNoiseFields,
} from "./capture-noise";

export { classifyCapture } from "./capture-classifier";
export type { CaptureClassification, ClassifierContext } from "./capture-classifier";

export {
  runDailyScan,
  MIN_FINDING_CONFIDENCE,
  NEEDS_ROUTING_MIN_CONFIDENCE,
} from "./daily-scan";
export type { DailyScanResult, DailyScanOptions, GmailSyncSummary } from "./daily-scan";

export {
  extractNotes,
  parseExtractedNotes,
  NOTE_EXTRACTION_SYSTEM_PROMPT,
} from "./note-extractor";
export type {
  NoteExtractionInput,
  NoteExtractionResult,
  ExtractedNote,
} from "./note-extractor";

export {
  persistExtractedNotes,
  extractAndPersistNotes,
} from "./persist-extracted-notes";
