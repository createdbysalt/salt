import "server-only";

/**
 * Correction blocklist — feature-level entry point.
 *
 * Implementation lives in `app/_lib/learning/correction-blocklist.ts` so the
 * protected memory tools (`memoryUpdateField`) can enforce it without a
 * _lib → _features dependency. Import from here in feature code.
 */

export {
  CORRECTION_BLOCK_TTL_MONTHS,
  findBlockingCorrection,
  getCorrectionBlocklist,
  type CorrectionBlockEntry,
} from "@/app/_lib/learning/correction-blocklist";
