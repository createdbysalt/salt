import { describe, expect, it, vi, beforeEach } from "vitest";
import type { BriefingInputs } from "./types";

vi.mock("server-only", () => ({}));

const sendLlmMock = vi.fn();
vi.mock("@/app/_lib/ai/gpt", () => ({
  sendLlm: (...args: unknown[]) => sendLlmMock(...args),
  committedSpend: (workspaceId: string, userId?: string) => ({
    kind: "workspace",
    workspaceId,
    userId,
    origin: "committed",
  }),
}));

vi.mock("@/app/_lib/ai/models", () => ({
  resolveModel: () => "test-model",
}));

const persistMock = vi.fn();
const gatherMock = vi.fn();
const findExistingMock = vi.fn();

import {
  briefingDateInTimezone,
  buildBriefingPrompt,
  decideBriefingAction,
  generateDailyBriefing,
  isDailyBriefingDue,
  parseBriefingDraft,
} from "./generate-daily-briefing";

function getMockBriefingInputs(
  overrides?: Partial<BriefingInputs>,
): BriefingInputs {
  return {
    overdueBilling: [],
    blockedWork: [],
    todayMeetings: [],
    silentRelationships: [],
    opportunityGap: null,
    ...overrides,
  };
}

describe("briefingDateInTimezone", () => {
  it("returns the America/Toronto calendar date as YYYY-MM-DD", () => {
    // 2026-08-07 02:00 UTC is still 2026-08-06 22:00 in Toronto.
    expect(briefingDateInTimezone(new Date("2026-08-07T02:00:00Z"))).toBe(
      "2026-08-06",
    );
  });

  it("rolls to the next Toronto date after midnight", () => {
    expect(briefingDateInTimezone(new Date("2026-08-07T04:00:00Z"))).toBe(
      "2026-08-07",
    );
  });
});

describe("isDailyBriefingDue", () => {
  it("is due at 9am America/Toronto on a weekday", () => {
    expect(isDailyBriefingDue(new Date("2026-08-06T13:00:00Z"))).toBe(true);
  });

  it("is not due at 9am UTC when that is 5am Toronto", () => {
    expect(isDailyBriefingDue(new Date("2026-08-06T09:00:00Z"))).toBe(false);
  });

  it("is not due on Saturday in Toronto", () => {
    expect(isDailyBriefingDue(new Date("2026-08-08T13:00:00Z"))).toBe(false);
  });
});

describe("decideBriefingAction", () => {
  it("skips when a row already exists", () => {
    expect(
      decideBriefingAction(
        true,
        getMockBriefingInputs({
          todayMeetings: [
            {
              id: "m1",
              title: "Standup",
              startTime: "2026-08-27T14:00:00Z",
              who: "Core Team",
            },
          ],
        }),
      ),
    ).toBe("already_exists");
  });

  it("skips when every input is empty", () => {
    expect(decideBriefingAction(false, getMockBriefingInputs())).toBe(
      "skipped_empty",
    );
  });

  it("generates when there is at least one input", () => {
    expect(
      decideBriefingAction(
        false,
        getMockBriefingInputs({
          opportunityGap: {
            claim: "Two retainers are unsigned",
            summary: null,
            amountLabel: "$4,000",
          },
        }),
      ),
    ).toBe("generate");
  });
});

describe("buildBriefingPrompt", () => {
  it("interpolates overdue billing, meetings, silent relationships, and the opportunity gap", () => {
    const prompt = buildBriefingPrompt(
      getMockBriefingInputs({
        overdueBilling: [
          {
            id: "inv-1",
            label: "Acme",
            amountCents: 250000,
            daysOverdue: 10,
            number: "1234",
          },
        ],
        todayMeetings: [
          {
            id: "m1",
            title: "Proposal review",
            startTime: "2026-08-27T18:00:00Z",
            who: "Marcus",
          },
        ],
        silentRelationships: [
          {
            id: "p1",
            name: "Alex Chen",
            relationshipType: "former client",
            daysSinceContact: 35,
          },
        ],
        opportunityGap: {
          claim: "Horizon Fitness has no signed SOW",
          summary: "Scope is agreed verbally",
          amountLabel: "$8,000–$12,000",
        },
      }),
    );

    expect(prompt).toContain("Invoice #1234 to Acme ($2,500) is 10 days overdue");
    expect(prompt).toContain("Proposal review");
    expect(prompt).toContain("Marcus");
    expect(prompt).toContain("Alex Chen");
    expect(prompt).toContain("35 days");
    expect(prompt).toContain("Horizon Fitness has no signed SOW");
    expect(prompt).toContain("$8,000–$12,000");
  });

  it("omits empty groups from the prompt", () => {
    const prompt = buildBriefingPrompt(
      getMockBriefingInputs({
        todayMeetings: [
          {
            id: "m1",
            title: "Standup",
            startTime: "2026-08-27T14:00:00Z",
            who: null,
          },
        ],
      }),
    );

    expect(prompt).toContain("Today");
    expect(prompt).not.toContain("Overdue invoices");
    expect(prompt).not.toContain("Silent relationships");
    expect(prompt).not.toContain("Opportunity");
  });
});

describe("parseBriefingDraft", () => {
  it("parses a JSON draft", () => {
    const draft = parseBriefingDraft(
      JSON.stringify({
        content: "Three things need you this morning.",
        sections: {
          urgent: ["Invoice #1234 is overdue"],
          today: ["Standup at 10am"],
          relationships: [],
        },
      }),
    );

    expect(draft.content).toBe("Three things need you this morning.");
    expect(draft.sections.urgent).toEqual(["Invoice #1234 is overdue"]);
    expect(draft.sections.today).toEqual(["Standup at 10am"]);
    expect(draft.sections.relationships).toEqual([]);
  });

  it("strips markdown fences before parsing", () => {
    const draft = parseBriefingDraft(
      '```json\n{"content":"Hello.","sections":{"urgent":[],"today":["Call"],"relationships":[]}}\n```',
    );

    expect(draft.content).toBe("Hello.");
    expect(draft.sections.today).toEqual(["Call"]);
  });

  it("falls back to the raw text when the model does not return JSON", () => {
    const draft = parseBriefingDraft("Good morning. Invoice #9 is overdue.");
    expect(draft.content).toBe("Good morning. Invoice #9 is overdue.");
    expect(draft.sections).toEqual({
      urgent: [],
      today: [],
      relationships: [],
    });
  });
});

describe("generateDailyBriefing", () => {
  beforeEach(() => {
    sendLlmMock.mockReset();
    persistMock.mockReset();
    gatherMock.mockReset();
    findExistingMock.mockReset();
    persistMock.mockResolvedValue("briefing-1");
  });

  it("does not call the LLM when inputs are empty", async () => {
    findExistingMock.mockResolvedValue(null);
    gatherMock.mockResolvedValue(getMockBriefingInputs());

    const result = await generateDailyBriefing("ws-1", "user-1", new Date(), {
      findExisting: findExistingMock,
      gather: gatherMock,
      persist: persistMock,
    });

    expect(result).toEqual({ status: "skipped_empty" });
    expect(sendLlmMock).not.toHaveBeenCalled();
    expect(persistMock).not.toHaveBeenCalled();
  });

  it("does not call the LLM when today's row already exists", async () => {
    findExistingMock.mockResolvedValue({
      id: "existing",
      workspaceId: "ws-1",
      briefingDate: "2026-08-27",
      content: "Already drafted",
      sections: { urgent: [], today: [], relationships: [] },
      model: "test-model",
      createdAt: "2026-08-27T13:00:00Z",
    });

    const result = await generateDailyBriefing("ws-1", "user-1", new Date(), {
      findExisting: findExistingMock,
      gather: gatherMock,
      persist: persistMock,
    });

    expect(result).toEqual({ status: "already_exists" });
    expect(gatherMock).not.toHaveBeenCalled();
    expect(sendLlmMock).not.toHaveBeenCalled();
    expect(persistMock).not.toHaveBeenCalled();
  });

  it("persists the parsed draft after a successful LLM call", async () => {
    findExistingMock.mockResolvedValue(null);
    gatherMock.mockResolvedValue(
      getMockBriefingInputs({
        overdueBilling: [
          {
            id: "inv-1",
            label: "Acme",
            amountCents: 250000,
            daysOverdue: 10,
            number: "1234",
          },
        ],
      }),
    );
    sendLlmMock.mockResolvedValue(
      JSON.stringify({
        content: "Acme is waiting on payment.",
        sections: {
          urgent: ["Invoice #1234 to Acme ($2,500) is 10 days overdue"],
          today: [],
          relationships: [],
        },
      }),
    );

    const result = await generateDailyBriefing(
      "ws-1",
      "user-1",
      new Date("2026-08-27T13:00:00Z"),
      {
        findExisting: findExistingMock,
        gather: gatherMock,
        persist: persistMock,
      },
    );

    expect(result).toEqual({ status: "created", briefingId: "briefing-1" });
    expect(sendLlmMock).toHaveBeenCalledTimes(1);
    const [, spend] = sendLlmMock.mock.calls[0];
    expect(spend).toEqual({
      kind: "workspace",
      workspaceId: "ws-1",
      userId: "user-1",
      origin: "committed",
    });
    expect(persistMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        briefingDate: "2026-08-27",
        content: "Acme is waiting on payment.",
        sections: {
          urgent: ["Invoice #1234 to Acme ($2,500) is 10 days overdue"],
          today: [],
          relationships: [],
        },
        model: "test-model",
      }),
    );
  });
});
