import { describe, it, expect, beforeEach } from "vitest";
import {
  logExtractionOutcome,
  logBatchOutcomes,
  getCalibrationReport,
  formatCalibrationReport,
  clearCalibrationData,
  getOutcomeCount,
  isWellCalibrated,
  getUnderperformingBuckets,
  type ExtractionOutcome,
} from "./calibration";

describe("calibration tracking", () => {
  beforeEach(() => {
    clearCalibrationData();
  });

  const createOutcome = (
    overrides: Partial<ExtractionOutcome> = {}
  ): ExtractionOutcome => ({
    field: "email",
    confidence: 0.9,
    tier: "deterministic",
    correct: true,
    workspaceId: "ws-1",
    entityType: "person",
    source: "stripe",
    ...overrides,
  });

  describe("logExtractionOutcome", () => {
    it("logs outcomes and tracks count", () => {
      expect(getOutcomeCount()).toBe(0);

      logExtractionOutcome(createOutcome());
      expect(getOutcomeCount()).toBe(1);

      logExtractionOutcome(createOutcome());
      expect(getOutcomeCount()).toBe(2);
    });
  });

  describe("logBatchOutcomes", () => {
    it("logs multiple outcomes at once", () => {
      logBatchOutcomes([
        createOutcome({ confidence: 0.8 }),
        createOutcome({ confidence: 0.9 }),
        createOutcome({ confidence: 0.95 }),
      ]);

      expect(getOutcomeCount()).toBe(3);
    });
  });

  describe("getCalibrationReport", () => {
    it("generates report with buckets", () => {
      logBatchOutcomes([
        createOutcome({ confidence: 0.92, correct: true }),
        createOutcome({ confidence: 0.93, correct: true }),
        createOutcome({ confidence: 0.91, correct: false }),
        createOutcome({ confidence: 0.85, correct: true }),
        createOutcome({ confidence: 0.75, correct: true }),
        createOutcome({ confidence: 0.65, correct: false }),
      ]);

      const report = getCalibrationReport();

      expect(report.totalExtractions).toBe(6);
      expect(report.buckets.length).toBe(7);

      const bucket90_95 = report.buckets.find((b) => b.label === "90-95%");
      expect(bucket90_95?.total).toBe(3);
      expect(bucket90_95?.correct).toBe(2);
      expect(bucket90_95?.accuracy).toBeCloseTo(0.67, 1);
    });

    it("calculates overall accuracy", () => {
      logBatchOutcomes([
        createOutcome({ correct: true }),
        createOutcome({ correct: true }),
        createOutcome({ correct: false }),
        createOutcome({ correct: true }),
      ]);

      const report = getCalibrationReport();
      expect(report.overallAccuracy).toBe(0.75);
    });

    it("groups by tier", () => {
      logBatchOutcomes([
        createOutcome({ tier: "deterministic", correct: true }),
        createOutcome({ tier: "deterministic", correct: true }),
        createOutcome({ tier: "fuzzy", correct: true }),
        createOutcome({ tier: "fuzzy", correct: false }),
        createOutcome({ tier: "llm", correct: false }),
      ]);

      const report = getCalibrationReport();

      const deterministicTier = report.tiers.find((t) => t.tier === "deterministic");
      expect(deterministicTier?.total).toBe(2);
      expect(deterministicTier?.accuracy).toBe(1);

      const fuzzyTier = report.tiers.find((t) => t.tier === "fuzzy");
      expect(fuzzyTier?.total).toBe(2);
      expect(fuzzyTier?.accuracy).toBe(0.5);
    });

    it("filters by workspace", () => {
      logBatchOutcomes([
        createOutcome({ workspaceId: "ws-1" }),
        createOutcome({ workspaceId: "ws-1" }),
        createOutcome({ workspaceId: "ws-2" }),
      ]);

      const report = getCalibrationReport({ workspaceId: "ws-1" });
      expect(report.totalExtractions).toBe(2);
    });

    it("filters by entity type", () => {
      logBatchOutcomes([
        createOutcome({ entityType: "person" }),
        createOutcome({ entityType: "org" }),
        createOutcome({ entityType: "person" }),
      ]);

      const report = getCalibrationReport({ entityType: "person" });
      expect(report.totalExtractions).toBe(2);
    });
  });

  describe("formatCalibrationReport", () => {
    it("formats report as readable string", () => {
      logBatchOutcomes([
        createOutcome({ confidence: 0.92, correct: true }),
        createOutcome({ confidence: 0.85, correct: true }),
      ]);

      const report = getCalibrationReport();
      const formatted = formatCalibrationReport(report);

      expect(formatted).toContain("CALIBRATION REPORT");
      expect(formatted).toContain("Total Extractions: 2");
      expect(formatted).toContain("CONFIDENCE BUCKETS");
      expect(formatted).toContain("TIER BREAKDOWN");
    });
  });

  describe("isWellCalibrated", () => {
    it("returns true when calibration error is low", () => {
      for (let i = 0; i < 100; i++) {
        logExtractionOutcome(
          createOutcome({
            confidence: 0.92,
            correct: Math.random() < 0.92,
          })
        );
      }

      const report = getCalibrationReport();
      expect(isWellCalibrated(report, 0.15)).toBe(true);
    });
  });

  describe("getUnderperformingBuckets", () => {
    it("identifies buckets with accuracy below expected", () => {
      for (let i = 0; i < 20; i++) {
        logExtractionOutcome(
          createOutcome({
            confidence: 0.92,
            correct: i < 10,
          })
        );
      }

      const report = getCalibrationReport();
      const underperforming = getUnderperformingBuckets(report, 30);

      expect(underperforming.length).toBeGreaterThanOrEqual(1);
      expect(underperforming[0].label).toBe("90-95%");
    });

    it("excludes buckets with too few samples", () => {
      logExtractionOutcome(createOutcome({ confidence: 0.92, correct: false }));

      const report = getCalibrationReport();
      const underperforming = getUnderperformingBuckets(report, 5);

      expect(underperforming.length).toBe(0);
    });
  });

  describe("clearCalibrationData", () => {
    it("clears all logged outcomes", () => {
      logBatchOutcomes([
        createOutcome(),
        createOutcome(),
      ]);

      expect(getOutcomeCount()).toBe(2);

      clearCalibrationData();

      expect(getOutcomeCount()).toBe(0);
    });
  });
});
