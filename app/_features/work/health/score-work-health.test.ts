import { describe, expect, it } from "vitest";
import { scoreWorkHealth } from "./score-work-health";
import type { WorkHealthSignals } from "./types";
import { WORK_HEALTH_VERSION } from "./types";

const NOW = new Date("2026-06-15T12:00:00.000Z");

function makeSignals(overrides: Partial<WorkHealthSignals> = {}): WorkHealthSignals {
  return {
    status: "active",
    workType: "project",
    paymentType: null,
    stageEnteredAt: "2026-06-10T12:00:00.000Z",
    deadline: "2026-08-01",
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
    ...overrides,
  };
}

describe("scoreWorkHealth v2", () => {
  it("returns version 2", () => {
    const result = scoreWorkHealth(makeSignals(), NOW);
    expect(result.version).toBe(WORK_HEALTH_VERSION);
  });

  describe("archetype mapping", () => {
    it("maps project to delivery archetype", () => {
      const result = scoreWorkHealth(makeSignals({ workType: "project" }), NOW);
      expect(result.archetype).toBe("delivery");
      expect(result.label).toBe("Project health");
    });

    it("maps retainer to recurring archetype", () => {
      const result = scoreWorkHealth(makeSignals({ workType: "retainer" }), NOW);
      expect(result.archetype).toBe("recurring");
      expect(result.label).toBe("Retainer health");
    });

    it("maps hourly to utilization archetype", () => {
      const result = scoreWorkHealth(makeSignals({ workType: "hourly" }), NOW);
      expect(result.archetype).toBe("utilization");
      expect(result.label).toBe("Utilization health");
    });

    it("maps proposal to pipeline archetype", () => {
      const result = scoreWorkHealth(makeSignals({ workType: "proposal" }), NOW);
      expect(result.archetype).toBe("pipeline");
      expect(result.label).toBe("Pipeline health");
    });

    it("maps quick to transactional archetype", () => {
      const result = scoreWorkHealth(makeSignals({ workType: "quick" }), NOW);
      expect(result.archetype).toBe("transactional");
      expect(result.label).toBe("Quick work health");
    });

    it("maps event to delivery archetype", () => {
      const result = scoreWorkHealth(makeSignals({ workType: "event" }), NOW);
      expect(result.archetype).toBe("delivery");
    });

    it("defaults null work type to delivery", () => {
      const result = scoreWorkHealth(makeSignals({ workType: null }), NOW);
      expect(result.archetype).toBe("delivery");
    });
  });

  describe("completed/archived work", () => {
    it("treats completed work as healthy", () => {
      const result = scoreWorkHealth(makeSignals({ status: "completed" }), NOW);
      expect(result.score).toBe(85);
      expect(result.band).toBe("Healthy");
    });

    it("treats archived work as healthy", () => {
      const result = scoreWorkHealth(makeSignals({ status: "archived" }), NOW);
      expect(result.score).toBe(85);
      expect(result.band).toBe("Healthy");
    });
  });

  describe("insufficient signals", () => {
    it("returns insufficient when no usable signals", () => {
      const result = scoreWorkHealth(
        makeSignals({
          lastContactAt: null,
          linkedPeopleCount: 0,
          stageEnteredAt: null,
          updatedAt: null,
        }),
        NOW,
      );
      expect(result.band).toBe("Insufficient");
      expect(result.score).toBeNull();
    });
  });

  describe("delivery archetype scoring", () => {
    it("penalizes overdue deadline", () => {
      const result = scoreWorkHealth(
        makeSignals({ workType: "project", deadline: "2026-06-01" }),
        NOW,
      );
      expect(result.factors.some((f) => f.key === "deadline_health")).toBe(true);
      expect(result.score).toBeLessThan(75);
    });

    it("rewards upcoming deadline with buffer", () => {
      const result = scoreWorkHealth(
        makeSignals({ workType: "project", deadline: "2026-07-15" }),
        NOW,
      );
      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it("considers milestone progress", () => {
      const result = scoreWorkHealth(
        makeSignals({
          workType: "project",
          paymentType: "milestone",
          milestoneCount: 4,
          completedMilestoneCount: 4,
        }),
        NOW,
      );
      expect(result.factors.some((f) => f.key === "milestone_progress")).toBe(true);
    });
  });

  describe("pipeline archetype scoring", () => {
    it("penalizes stale stage", () => {
      const result = scoreWorkHealth(
        makeSignals({
          workType: "proposal",
          stageEnteredAt: "2026-05-15T12:00:00.000Z",
        }),
        NOW,
      );
      expect(result.factors.some((f) => f.key === "stage_velocity")).toBe(true);
      expect(result.score).toBeLessThan(75);
    });

    it("rewards scheduled meetings", () => {
      const result = scoreWorkHealth(
        makeSignals({ workType: "proposal", upcomingMeetingCount: 2 }),
        NOW,
      );
      expect(result.factors.some((f) => f.key === "meeting_scheduled")).toBe(true);
    });
  });

  describe("recurring archetype scoring", () => {
    it("penalizes imminent renewal", () => {
      const result = scoreWorkHealth(
        makeSignals({
          workType: "retainer",
          renewalDate: "2026-06-18",
        }),
        NOW,
      );
      expect(result.factors.some((f) => f.key === "renewal_proximity")).toBe(true);
      expect(result.score).toBeLessThan(80);
    });

    it("rewards payment health", () => {
      const result = scoreWorkHealth(
        makeSignals({
          workType: "retainer",
          overdueInvoiceCount: 0,
        }),
        NOW,
      );
      expect(result.factors.some((f) => f.key === "payment_health")).toBe(true);
    });
  });

  describe("transactional archetype scoring", () => {
    it("rewards fast completion", () => {
      const resultFast = scoreWorkHealth(
        makeSignals({
          workType: "quick",
          stageEnteredAt: "2026-06-14T12:00:00.000Z",
        }),
        NOW,
      );
      const resultSlow = scoreWorkHealth(
        makeSignals({
          workType: "quick",
          stageEnteredAt: "2026-05-15T12:00:00.000Z",
        }),
        NOW,
      );
      expect(resultFast.score).toBeGreaterThan(resultSlow.score!);
    });

    it("penalizes unpaid status", () => {
      const resultPaid = scoreWorkHealth(
        makeSignals({ workType: "quick", isPaid: true }),
        NOW,
      );
      const resultUnpaid = scoreWorkHealth(
        makeSignals({ workType: "quick", isPaid: false }),
        NOW,
      );
      expect(resultPaid.score).toBeGreaterThan(resultUnpaid.score!);
    });
  });

  describe("utilization archetype scoring", () => {
    it("considers hours momentum", () => {
      const resultGrowing = scoreWorkHealth(
        makeSignals({
          workType: "hourly",
          hoursLoggedLast14d: 20,
          hoursLoggedPrior14d: 10,
        }),
        NOW,
      );
      const resultShrinking = scoreWorkHealth(
        makeSignals({
          workType: "hourly",
          hoursLoggedLast14d: 5,
          hoursLoggedPrior14d: 20,
        }),
        NOW,
      );
      expect(resultGrowing.score).toBeGreaterThan(resultShrinking.score!);
    });

    it("considers estimate alignment", () => {
      const result = scoreWorkHealth(
        makeSignals({
          workType: "hourly",
          hoursEstimate: 40,
          hoursLoggedTotal: 20,
        }),
        NOW,
      );
      expect(result.factors.some((f) => f.key === "estimate_alignment")).toBe(true);
    });
  });

  describe("score bounds", () => {
    it("clamps score between 0 and 100", () => {
      const result = scoreWorkHealth(
        makeSignals({
          workType: "project",
          deadline: "2026-01-01",
          linkedPeopleCount: 0,
          milestoneCount: 0,
          blockerCount: 5,
          lastContactAt: "2026-01-01T12:00:00.000Z",
        }),
        NOW,
      );
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe("factors structure", () => {
    it("returns factors with key, label, subScore, weight, direction", () => {
      const result = scoreWorkHealth(makeSignals(), NOW);
      expect(result.factors.length).toBeGreaterThan(0);
      for (const factor of result.factors) {
        expect(factor).toHaveProperty("key");
        expect(factor).toHaveProperty("label");
        expect(factor).toHaveProperty("subScore");
        expect(factor).toHaveProperty("weight");
        expect(factor).toHaveProperty("direction");
        expect(["positive", "negative", "neutral"]).toContain(factor.direction);
      }
    });
  });
});
