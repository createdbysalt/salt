import { describe, expect, it } from "vitest";
import { scoreWorkHealth } from "./score-work-health";
import { WORK_HEALTH_VERSION } from "./types";
import type { WorkHealthSignals } from "./types";

describe("work health v2 data flow", () => {
  const signals: WorkHealthSignals = {
    status: "active",
    workType: "project",
    paymentType: null,
    stageEnteredAt: "2026-06-10T12:00:00.000Z",
    deadline: "2026-07-01",
    startDate: null,
    updatedAt: "2026-06-14T12:00:00.000Z",
    linkedPeopleCount: 2,
    overdueInvoiceCount: 0,
    renewalDate: null,
    upcomingMeetingCount: 1,
    hoursEstimate: null,
    hoursLoggedTotal: null,
    hoursLoggedLast14d: null,
    hoursLoggedPrior14d: null,
    lastInvoiceAt: null,
    lastContactAt: "2026-06-12T12:00:00.000Z",
    milestoneCount: 3,
    completedMilestoneCount: 1,
    overdueMilestoneCount: 0,
    budgetCents: null,
    spentCents: null,
    blockerCount: 0,
    hasDecisionMakerEngaged: true,
    competingProposalCount: 0,
    clientConfirmed: false,
    isPaid: false,
    hourlyRateCents: null,
    retainerMrrCents: null,
  };

  it("returns v2 factors with consistent structure", () => {
    const result = scoreWorkHealth(signals, new Date("2026-06-15T12:00:00.000Z"));

    expect(result.version).toBe(WORK_HEALTH_VERSION);
    expect(result.archetype).toBe("delivery");
    expect(result.label).toBe("Project health");
    expect(result.factors.length).toBeGreaterThan(0);

    for (const factor of result.factors) {
      expect(factor).toHaveProperty("key");
      expect(factor).toHaveProperty("label");
      expect(factor).toHaveProperty("subScore");
      expect(factor).toHaveProperty("weight");
      expect(factor).toHaveProperty("direction");
      expect(typeof factor.label).toBe("string");
      expect(factor.label.length).toBeGreaterThan(0);
      expect(["positive", "negative", "neutral"]).toContain(factor.direction);
    }
  });

  it("all delivery factors have non-empty detail strings", () => {
    const result = scoreWorkHealth(signals, new Date("2026-06-15T12:00:00.000Z"));

    for (const factor of result.factors) {
      expect(factor.detail).toBeDefined();
      expect(typeof factor.detail).toBe("string");
      expect(factor.detail!.length).toBeGreaterThan(0);
    }
  });

  it("factors are JSON-serializable (database compatible)", () => {
    const result = scoreWorkHealth(signals, new Date("2026-06-15T12:00:00.000Z"));

    const serialized = JSON.stringify(result.factors);
    const deserialized = JSON.parse(serialized);

    expect(deserialized).toEqual(result.factors);
  });

  it("parseHealthFactors can read v2 format", () => {
    const result = scoreWorkHealth(signals, new Date("2026-06-15T12:00:00.000Z"));

    const serialized = JSON.stringify(result.factors);
    const fromDb = JSON.parse(serialized);

    expect(Array.isArray(fromDb)).toBe(true);
    expect(fromDb.length).toBeGreaterThan(0);

    const first = fromDb[0];
    expect(first.key).toBeDefined();
    expect(first.label).toBeDefined();
    expect(first.direction).toBeDefined();
    expect(first.detail).toBeDefined();
  });
});
