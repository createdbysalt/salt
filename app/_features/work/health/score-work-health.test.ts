import { describe, expect, it } from "vitest";
import { scoreWorkHealth } from "./score-work-health";
import type { WorkHealthSignals } from "./types";

const NOW = new Date("2026-06-15T12:00:00.000Z");

const healthySignals: WorkHealthSignals = {
  status: "active",
  stageEnteredAt: "2026-06-10T12:00:00.000Z",
  deadline: "2026-08-01",
  updatedAt: "2026-06-14T12:00:00.000Z",
  linkedPeopleCount: 2,
  overdueInvoiceCount: 0,
};

describe("scoreWorkHealth", () => {
  it("returns a healthy score for active work with good signals", () => {
    const result = scoreWorkHealth(healthySignals, NOW);
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.band).toBe("Healthy");
    expect(result.version).toBe(1);
  });

  it("treats completed work as healthy", () => {
    const result = scoreWorkHealth(
      { ...healthySignals, status: "completed" },
      NOW,
    );
    expect(result.score).toBe(85);
    expect(result.band).toBe("Healthy");
  });

  it("penalizes overdue deadlines", () => {
    const result = scoreWorkHealth(
      {
        ...healthySignals,
        deadline: "2026-06-01",
      },
      NOW,
    );
    expect(result.factors.some((factor) => factor.factor === "Deadline")).toBe(true);
    expect(result.score).toBeLessThan(75);
  });

  it("penalizes long stage age", () => {
    const result = scoreWorkHealth(
      {
        ...healthySignals,
        stageEnteredAt: "2026-05-01T12:00:00.000Z",
      },
      NOW,
    );
    expect(result.factors.some((factor) => factor.factor === "Stage age")).toBe(true);
    expect(result.score).toBeLessThan(75);
  });

  it("penalizes missing linked people", () => {
    const result = scoreWorkHealth(
      {
        ...healthySignals,
        linkedPeopleCount: 0,
      },
      NOW,
    );
    expect(result.factors.some((factor) => factor.factor === "Team coverage")).toBe(true);
    expect(result.score).toBeLessThan(75);
  });

  it("penalizes overdue invoices", () => {
    const result = scoreWorkHealth(
      {
        ...healthySignals,
        overdueInvoiceCount: 2,
      },
      NOW,
    );
    expect(result.factors.some((factor) => factor.factor === "Open balance")).toBe(true);
    expect(result.score).toBeLessThan(60);
  });

  it("clamps score between 0 and 100", () => {
    const result = scoreWorkHealth(
      {
        status: "active",
        stageEnteredAt: "2026-01-01T12:00:00.000Z",
        deadline: "2026-05-01",
        updatedAt: "2026-01-01T12:00:00.000Z",
        linkedPeopleCount: 0,
        overdueInvoiceCount: 3,
      },
      NOW,
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
