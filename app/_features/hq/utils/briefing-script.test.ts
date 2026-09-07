import { describe, expect, it } from "vitest";

import type { HqBriefingData } from "@/app/_features/plays/types";
import type { HqSideRailData } from "../types";
import type { DailyBriefing } from "../briefing/types";
import {
  generateBriefingScript,
  generateBriefingScriptFromDaily,
} from "./briefing-script";

function makeDailyBriefing(overrides: Partial<DailyBriefing> = {}): DailyBriefing {
  return {
    id: "briefing-1",
    workspaceId: "workspace-1",
    briefingDate: "2026-09-07",
    content: "Salt handled 14 plays for you today. 8 plays are waiting on your approval.",
    sections: {
      urgent: ["Artisan Coffee's INV-2026-048 ($4,750) is 35 days overdue."],
      today: ["2:00 PM: Meridian Tech weekly sync.", "4:00 PM: Catalyst Ventures follow-up."],
      relationships: [],
    },
    model: "demo-seed",
    createdAt: "2026-09-07T08:00:00.000Z",
    ...overrides,
  };
}

describe("generateBriefingScriptFromDaily", () => {
  it("reads the displayed briefing text so audio matches the page", () => {
    const briefing = makeDailyBriefing();
    const script = generateBriefingScriptFromDaily("Demo", briefing);

    expect(script).toContain("Demo");
    expect(script).toContain(briefing.content);
    expect(script).toContain("Artisan Coffee's INV-2026-048 ($4,750) is 35 days overdue.");
    expect(script).toContain("2:00 PM: Meridian Tech weekly sync.");
    expect(script).toContain("You're all set. Have a great day.");
  });

  it("skips empty sections", () => {
    const script = generateBriefingScriptFromDaily("Demo", makeDailyBriefing());

    // relationships is empty, so its spoken intro never appears
    expect(script).not.toContain("Worth a look");
    expect(script).toContain("Heads up");
    expect(script).toContain("On your calendar");
  });

  it("handles an empty lede", () => {
    const script = generateBriefingScriptFromDaily(
      "Demo",
      makeDailyBriefing({ content: "" })
    );

    expect(script).toContain("Demo");
    expect(script).toContain("Heads up");
  });
});

describe("generateBriefingScript (template fallback)", () => {
  it("contains no em-dashes", () => {
    const briefing: HqBriefingData = {
      primaryOpportunity: {
        claim: "$50K deal going cold: follow up today",
        summary: null,
        amountLabel: "$50,000",
        confidence: 88,
      },
      playsRanToday: 14,
      playsAwaitingApproval: 8,
      clearedAmountLabel: "$12,400",
      autoSentCount: 3,
    };
    const sideRail = {
      timeSaved: { minutesThisWeek: 95 },
      schedule: [{ time: "4:00 PM", title: "Catalyst Ventures - Follow-up", who: "David Liu" }],
      headsUp: [{ title: "Artisan invoice is 35 days overdue" }],
    } as unknown as HqSideRailData;

    const script = generateBriefingScript("Demo", briefing, sideRail);

    expect(script).not.toContain("—");
    expect(script).not.toContain("–");
    expect(script).toContain("8 plays waiting for your quick approval, about 240 seconds total.");
  });
});
