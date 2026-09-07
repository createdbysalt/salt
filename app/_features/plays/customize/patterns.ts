import type { PlaybookAdjustment } from "./queries";

export interface PlaybookPattern {
  key: string;
  label: string;
  /** Emerging = seen a couple of times, not yet a suggestion. */
  emerging: boolean;
}

const EMERGING_COUNT = 2;
const CONFIRMED_COUNT = 4;

/**
 * Derive learned-pattern chips from draft-edit diffs (Customize tab).
 * Patterns come from what the user actually changed — never invented — and
 * stay "emerging" until the same correction repeats.
 */
export function derivePlaybookPatterns(
  adjustments: PlaybookAdjustment[]
): PlaybookPattern[] {
  const edits = adjustments.filter(
    (a) =>
      a.action === "edited" &&
      typeof a.previousLength === "number" &&
      typeof a.newLength === "number"
  );

  const shortened = edits.filter((a) => a.newLength! < a.previousLength!);
  const lengthened = edits.filter((a) => a.newLength! > a.previousLength!);
  const dismissed = adjustments.filter((a) => a.action === "dismissed");

  const patterns: PlaybookPattern[] = [];

  if (shortened.length >= EMERGING_COUNT) {
    patterns.push({
      key: "shorter-drafts",
      label: "You prefer shorter drafts",
      emerging: shortened.length < CONFIRMED_COUNT,
    });
  }
  if (lengthened.length >= EMERGING_COUNT) {
    patterns.push({
      key: "longer-drafts",
      label: "You add more detail to drafts",
      emerging: lengthened.length < CONFIRMED_COUNT,
    });
  }
  if (dismissed.length >= CONFIRMED_COUNT) {
    patterns.push({
      key: "often-dismissed",
      label: "This play's drafts often miss the mark",
      emerging: false,
    });
  }

  return patterns;
}
