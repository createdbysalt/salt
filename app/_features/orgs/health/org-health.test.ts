import { describe, expect, it } from "vitest";
import { scoreToBand } from "@/app/_lib/health/core";
import { scoreOrgHealth } from "./org-health";
import type { OrgHealthSignals } from "./types";

const NOW = new Date("2026-06-22T12:00:00.000Z").getTime();

function baseSignals(overrides: Partial<OrgHealthSignals> = {}): OrgHealthSignals {
  return {
    hasCaptureActivity: false,
    hasRevenueSignals: false,
    lastActivityAt: null,
    captureCountLast30d: 0,
    captureCountPrior30d: 0,
    hasBidirectionalContact: false,
    youInitiatedWithoutReplyDays: null,
    hasUpcomingMeeting: false,
    overdueInvoiceCount: 0,
    hasActiveRetainer: false,
    overdueMilestoneCount: 0,
    cancelledMeetingsLast30d: 0,
    orgContactCount: 0,
    keyContactQuiet: false,
    intelligenceFindingCount: 0,
    ...overrides,
  };
}

describe("scoreToBand", () => {
  it("maps score thresholds", () => {
    expect(scoreToBand(null)).toBe("insufficient");
    expect(scoreToBand(80)).toBe("healthy");
    expect(scoreToBand(60)).toBe("watch");
    expect(scoreToBand(30)).toBe("risk");
  });
});

describe("scoreOrgHealth", () => {
  it("returns insufficient when no signals exist", () => {
    const result = scoreOrgHealth({
      context: { relationshipStatus: "client" },
      signals: baseSignals(),
      now: NOW,
    });

    expect(result.band).toBe("insufficient");
    expect(result.score).toBeNull();
    expect(result.factors).toEqual([]);
  });

  it("scores healthy revenue orgs with strong signals", () => {
    const result = scoreOrgHealth({
      context: { relationshipStatus: "client" },
      signals: baseSignals({
        hasCaptureActivity: true,
        hasRevenueSignals: true,
        lastActivityAt: "2026-06-20T12:00:00.000Z",
        hasActiveRetainer: true,
        hasUpcomingMeeting: true,
        orgContactCount: 3,
      }),
      now: NOW,
    });

    expect(result.archetype).toBe("revenue");
    expect(result.score).not.toBeNull();
    expect(result.score!).toBeGreaterThanOrEqual(75);
    expect(result.band).toBe("healthy");
    expect(result.label).toBe("Account health");
    expect(result.factors.length).toBeGreaterThan(0);
  });

  it("scores pipeline lower when reply momentum stalls", () => {
    const strong = scoreOrgHealth({
      context: { relationshipStatus: "prospect" },
      signals: baseSignals({
        hasCaptureActivity: true,
        lastActivityAt: "2026-06-21T12:00:00.000Z",
        hasUpcomingMeeting: true,
        hasBidirectionalContact: true,
        captureCountLast30d: 6,
        captureCountPrior30d: 2,
        orgContactCount: 2,
      }),
      now: NOW,
    });

    const stalled = scoreOrgHealth({
      context: { relationshipStatus: "prospect" },
      signals: baseSignals({
        hasCaptureActivity: true,
        lastActivityAt: "2026-05-20T12:00:00.000Z",
        youInitiatedWithoutReplyDays: 20,
        captureCountLast30d: 1,
        captureCountPrior30d: 4,
        orgContactCount: 1,
        keyContactQuiet: true,
      }),
      now: NOW,
    });

    expect(strong.score!).toBeGreaterThan(stalled.score!);
    expect(stalled.archetype).toBe("pipeline");
    expect(stalled.label).toBe("Pipeline health");
  });

  it("scores network orgs from cadence and two-way engagement", () => {
    const result = scoreOrgHealth({
      context: { relationshipStatus: "partner" },
      signals: baseSignals({
        hasCaptureActivity: true,
        lastActivityAt: "2026-06-10T12:00:00.000Z",
        hasBidirectionalContact: true,
      }),
      now: NOW,
    });

    expect(result.archetype).toBe("network");
    expect(result.label).toBe("Partner strength");
    expect(result.score).not.toBeNull();
  });

  it("allows neutral orgs with capture activity", () => {
    const result = scoreOrgHealth({
      context: { relationshipStatus: "other" },
      signals: baseSignals({
        hasCaptureActivity: true,
        lastActivityAt: "2026-06-15T12:00:00.000Z",
      }),
      now: NOW,
    });

    expect(result.archetype).toBe("neutral");
    expect(result.score).not.toBeNull();
  });

  it("scores from revenue signals without capture activity", () => {
    const result = scoreOrgHealth({
      context: { relationshipStatus: "client" },
      signals: baseSignals({
        hasRevenueSignals: true,
        hasActiveRetainer: true,
        hasUpcomingMeeting: true,
        orgContactCount: 2,
      }),
      now: NOW,
    });

    expect(result.band).not.toBe("insufficient");
    expect(result.score).not.toBeNull();
  });
});
