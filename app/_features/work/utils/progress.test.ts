import { describe, expect, it } from "vitest";
import { deriveWorkProgress, deriveWorkStatusBadge } from "./progress";

const NOW = new Date("2026-06-15T12:00:00.000Z");

describe("deriveWorkProgress", () => {
  it("maps draft to 5%", () => {
    expect(deriveWorkProgress({ status: "draft", startDate: null, deadline: null, stageEnteredAt: null, now: NOW })).toEqual({
      progress: 5,
      overdue: false,
    });
  });

  it("maps signed to 15%", () => {
    expect(deriveWorkProgress({ status: "signed", startDate: null, deadline: null, stageEnteredAt: null, now: NOW })).toEqual({
      progress: 15,
      overdue: false,
    });
  });

  it("maps completed and archived to 100%", () => {
    expect(deriveWorkProgress({ status: "completed", startDate: null, deadline: null, stageEnteredAt: null, now: NOW }).progress).toBe(100);
    expect(deriveWorkProgress({ status: "archived", startDate: null, deadline: null, stageEnteredAt: null, now: NOW }).progress).toBe(100);
  });

  it("returns 20% when start date is in the future", () => {
    const result = deriveWorkProgress({
      status: "active",
      startDate: "2026-07-01",
      deadline: "2026-08-01",
      stageEnteredAt: null,
      now: NOW,
    });
    expect(result).toEqual({ progress: 20, overdue: false });
  });

  it("derives timeline progress within the 20-90 band", () => {
    const result = deriveWorkProgress({
      status: "active",
      startDate: "2026-06-01",
      deadline: "2026-06-29",
      stageEnteredAt: null,
      now: NOW,
    });
    expect(result.progress).toBeGreaterThanOrEqual(20);
    expect(result.progress).toBeLessThanOrEqual(90);
    expect(result.overdue).toBe(false);
  });

  it("marks overdue active work and caps progress at 90", () => {
    const result = deriveWorkProgress({
      status: "active",
      startDate: "2026-05-01",
      deadline: "2026-06-01",
      stageEnteredAt: null,
      now: NOW,
    });
    expect(result.overdue).toBe(true);
    expect(result.progress).toBeLessThanOrEqual(90);
  });

  it("falls back to 50% when timeline dates are missing or invalid", () => {
    expect(
      deriveWorkProgress({
        status: "active",
        startDate: null,
        deadline: null,
        stageEnteredAt: null,
        now: NOW,
      }).progress,
    ).toBe(50);

    expect(
      deriveWorkProgress({
        status: "active",
        startDate: "2026-06-01",
        deadline: "2026-05-01",
        stageEnteredAt: null,
        now: NOW,
      }).progress,
    ).toBe(50);
  });
});

describe("deriveWorkStatusBadge", () => {
  it("maps completed and archived to Wrapping", () => {
    expect(deriveWorkStatusBadge({ status: "completed", startDate: null, deadline: null, stageEnteredAt: null, now: NOW })).toBe("Wrapping");
    expect(deriveWorkStatusBadge({ status: "archived", startDate: null, deadline: null, stageEnteredAt: null, now: NOW })).toBe("Wrapping");
  });

  it("maps signed to Renewing", () => {
    expect(deriveWorkStatusBadge({ status: "signed", startDate: null, deadline: null, stageEnteredAt: null, now: NOW })).toBe("Renewing");
  });

  it("maps active overdue work to Stalled", () => {
    expect(
      deriveWorkStatusBadge({
        status: "active",
        startDate: "2026-05-01",
        deadline: "2026-06-01",
        stageEnteredAt: "2026-05-01T12:00:00.000Z",
        now: NOW,
      }),
    ).toBe("Stalled");
  });

  it("maps active work with old stage_entered_at to Stalled", () => {
    expect(
      deriveWorkStatusBadge({
        status: "active",
        startDate: null,
        deadline: null,
        stageEnteredAt: "2026-05-01T12:00:00.000Z",
        now: NOW,
      }),
    ).toBe("Stalled");
  });

  it("maps healthy active work to Active", () => {
    expect(
      deriveWorkStatusBadge({
        status: "active",
        startDate: null,
        deadline: null,
        stageEnteredAt: "2026-06-10T12:00:00.000Z",
        now: NOW,
      }),
    ).toBe("Active");
  });
});
