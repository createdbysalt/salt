import { describe, expect, it } from "vitest";
import { recencySubScore, scoreToBand } from "./recency";
import { scoreRelationshipHealth } from "./relationship-health";
import type { HealthSignals } from "./types";

const NOW = new Date("2026-06-22T12:00:00.000Z").getTime();

function baseSignals(overrides: Partial<HealthSignals> = {}): HealthSignals {
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

describe("recencySubScore", () => {
  it("decays monotonically with age", () => {
    const fresh = recencySubScore(1, 14);
    const older = recencySubScore(20, 14);
    expect(fresh).toBeGreaterThan(older);
  });

  it("returns 0 when no contact date", () => {
    expect(recencySubScore(null, 14)).toBe(0);
  });
});

describe("scoreToBand", () => {
  it("maps score thresholds", () => {
    expect(scoreToBand(null)).toBe("insufficient");
    expect(scoreToBand(80)).toBe("healthy");
    expect(scoreToBand(60)).toBe("watch");
    expect(scoreToBand(30)).toBe("risk");
  });
});

describe("scoreRelationshipHealth", () => {
  it("returns insufficient when no signals exist", () => {
    const result = scoreRelationshipHealth({
      context: { relationshipType: "client", relationshipStatus: null },
      signals: baseSignals(),
      now: NOW,
    });

    expect(result.band).toBe("insufficient");
    expect(result.score).toBeNull();
    expect(result.factors).toEqual([]);
  });

  it("scores healthy revenue relationships with strong signals", () => {
    const result = scoreRelationshipHealth({
      context: { relationshipType: "client", relationshipStatus: "client" },
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
    expect(result.factors.length).toBeGreaterThan(0);
  });

  it("scores pipeline lower when reply momentum stalls", () => {
    const strong = scoreRelationshipHealth({
      context: { relationshipType: "prospect", relationshipStatus: "prospect" },
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

    const stalled = scoreRelationshipHealth({
      context: { relationshipType: "prospect", relationshipStatus: "prospect" },
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
  });

  it("scores network relationships from cadence and two-way engagement", () => {
    const result = scoreRelationshipHealth({
      context: { relationshipType: "partner", relationshipStatus: null },
      signals: baseSignals({
        hasCaptureActivity: true,
        lastActivityAt: "2026-06-10T12:00:00.000Z",
        hasBidirectionalContact: true,
      }),
      now: NOW,
    });

    expect(result.archetype).toBe("network");
    expect(result.label).toBe("Network strength");
    expect(result.score).not.toBeNull();
  });

  it("scores internal team members from collaboration recency", () => {
    const result = scoreRelationshipHealth({
      context: { relationshipType: "team", relationshipStatus: null },
      signals: baseSignals({
        hasCaptureActivity: true,
        lastActivityAt: "2026-06-18T12:00:00.000Z",
      }),
      now: NOW,
    });

    expect(result.archetype).toBe("internal");
    expect(result.label).toBe("Team strength");
    expect(result.band).not.toBe("insufficient");
  });

  it("allows neutral unknown contacts with capture activity", () => {
    const result = scoreRelationshipHealth({
      context: { relationshipType: "unknown", relationshipStatus: null },
      signals: baseSignals({
        hasCaptureActivity: true,
        lastActivityAt: "2026-06-15T12:00:00.000Z",
      }),
      now: NOW,
    });

    expect(result.archetype).toBe("neutral");
    expect(result.score).not.toBeNull();
  });
});
