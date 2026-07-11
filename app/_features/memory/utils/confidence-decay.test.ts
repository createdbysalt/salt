import { describe, it, expect } from "vitest";
import {
  calculateEffectiveConfidence,
  isNoteStale,
  getSourceConfidenceWeight,
  DECAY_RATE_PER_MONTH,
  MIN_EFFECTIVE_CONFIDENCE,
} from "./confidence-decay";

describe("calculateEffectiveConfidence", () => {
  const now = new Date("2026-07-08");

  it("returns base confidence for just-confirmed notes", () => {
    const result = calculateEffectiveConfidence({
      baseConfidence: 85,
      confirmedAt: now,
      now,
    });

    expect(result.effectiveConfidence).toBe(85);
    expect(result.monthsElapsed).toBe(0);
    expect(result.decayApplied).toBe(0);
    expect(result.isStale).toBe(false);
  });

  it("decays 2 points per month", () => {
    const sixMonthsAgo = new Date("2026-01-08");
    const result = calculateEffectiveConfidence({
      baseConfidence: 85,
      confirmedAt: sixMonthsAgo,
      now,
    });

    expect(result.monthsElapsed).toBe(6);
    expect(result.decayApplied).toBe(12);
    expect(result.effectiveConfidence).toBe(73);
    expect(result.isStale).toBe(false);
  });

  it("marks as stale when effective confidence drops below 60", () => {
    const oneYearAgo = new Date("2025-07-08");
    const result = calculateEffectiveConfidence({
      baseConfidence: 80,
      confirmedAt: oneYearAgo,
      now,
    });

    expect(result.monthsElapsed).toBe(12);
    expect(result.decayApplied).toBe(24);
    expect(result.effectiveConfidence).toBe(56);
    expect(result.isStale).toBe(true);
  });

  it("never decays below minimum confidence", () => {
    const fiveYearsAgo = new Date("2021-07-08");
    const result = calculateEffectiveConfidence({
      baseConfidence: 85,
      confirmedAt: fiveYearsAgo,
      now,
    });

    expect(result.effectiveConfidence).toBe(MIN_EFFECTIVE_CONFIDENCE);
    expect(result.isStale).toBe(true);
  });

  it("handles low base confidence", () => {
    const threeMonthsAgo = new Date("2026-04-08");
    const result = calculateEffectiveConfidence({
      baseConfidence: 60,
      confirmedAt: threeMonthsAgo,
      now,
    });

    expect(result.effectiveConfidence).toBe(54);
    expect(result.isStale).toBe(true);
  });
});

describe("isNoteStale", () => {
  const now = new Date("2026-07-08");

  it("marks superseded notes as stale", () => {
    const result = isNoteStale({
      baseConfidence: 100,
      confirmedAt: now,
      lastAccessedAt: now,
      supersededBy: "newer-note-id",
      now,
    });

    expect(result.stale).toBe(true);
    expect(result.reason).toContain("Superseded");
  });

  it("marks old unaccessed notes as stale", () => {
    const sevenMonthsAgo = new Date("2025-12-08");
    const result = isNoteStale({
      baseConfidence: null,
      confirmedAt: null,
      lastAccessedAt: sevenMonthsAgo,
      supersededBy: null,
      now,
    });

    expect(result.stale).toBe(true);
    expect(result.reason).toContain("Not accessed");
  });

  it("marks low-confidence notes as stale", () => {
    const twoYearsAgo = new Date("2024-07-08");
    const result = isNoteStale({
      baseConfidence: 70,
      confirmedAt: twoYearsAgo,
      lastAccessedAt: null,
      supersededBy: null,
      now,
    });

    expect(result.stale).toBe(true);
    expect(result.reason).toContain("Confidence decayed");
  });

  it("returns not stale for fresh notes", () => {
    const result = isNoteStale({
      baseConfidence: 85,
      confirmedAt: now,
      lastAccessedAt: now,
      supersededBy: null,
      now,
    });

    expect(result.stale).toBe(false);
    expect(result.reason).toBe(null);
  });
});

describe("getSourceConfidenceWeight", () => {
  it("gives highest weight to user-authored sources", () => {
    expect(getSourceConfidenceWeight("manual")).toBe(25);
    expect(getSourceConfidenceWeight("ask_salt")).toBe(25);
  });

  it("gives medium weight to captured sources", () => {
    expect(getSourceConfidenceWeight("ai_capture")).toBe(20);
  });

  it("gives lower weight to inferred sources", () => {
    expect(getSourceConfidenceWeight("ai_inference")).toBe(10);
  });

  it("gives medium weight to system sources", () => {
    expect(getSourceConfidenceWeight("system")).toBe(15);
  });
});
