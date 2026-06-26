import { describe, it, expect } from "vitest";
import { scoreOrgHealth } from "@/app/_features/orgs/health/org-health";
import type { OrgHealthSignals } from "@/app/_features/orgs/health/types";

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

describe("org relationship health scoring", () => {
  it("returns insufficient when there is no signal", () => {
    const health = scoreOrgHealth({
      context: { relationshipStatus: "prospect" },
      signals: baseSignals(),
      now: NOW,
    });
    expect(health.band).toBe("insufficient");
    expect(health.score).toBeNull();
  });

  it("returns a score when capture activity exists", () => {
    const health = scoreOrgHealth({
      context: { relationshipStatus: "prospect" },
      signals: baseSignals({
        hasCaptureActivity: true,
        lastActivityAt: "2026-06-20T12:00:00.000Z",
        orgContactCount: 1,
      }),
      now: NOW,
    });
    expect(health.band).not.toBe("insufficient");
    expect(health.score).not.toBeNull();
  });
});
