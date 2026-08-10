import { describe, it, expect } from "vitest";
import { queueBucket, sortQueueCards } from "./queue-sort";
import type { PlayCardViewModel } from "../play-card/types";

function card(partial: Partial<PlayCardViewModel> & { id: string }): PlayCardViewModel {
  return {
    kind: "risk",
    playbookName: null,
    subject: partial.id,
    targetLabel: null,
    targetPrefix: "For",
    preview: null,
    confidence: null,
    stakes: null,
    ageMinutes: 60,
    triggerLabel: null,
    channel: null,
    risk: { signal: "signal", recommendation: "" },
    primaryAction: null,
    canFlag: false,
    canSchedule: false,
    provenance: { source: "play_run", playRunId: partial.id },
    askSalt: { type: "play", id: partial.id, title: partial.id, recipientLabel: "x", sourceLabel: "Salt", href: "/plays" },
    ...partial,
  } as PlayCardViewModel;
}

describe("queueBucket", () => {
  it("puts billing-section cards in the money bucket", () => {
    expect(queueBucket(card({ id: "a", section: "billing" }))).toBe("money");
  });

  it("puts invoice/dollar language in the money bucket", () => {
    expect(queueBucket(card({ id: "a", subject: "Invoice #1042 is 9 days overdue" }))).toBe("money");
    expect(queueBucket(card({ id: "b", subject: "$4K proposal follow-up" }))).toBe("money");
  });

  it("puts today/tomorrow language in the time bucket", () => {
    expect(queueBucket(card({ id: "a", subject: "Kickoff with Meridian Studio today 2:00 PM" }))).toBe("time");
    expect(queueBucket(card({ id: "b", targetLabel: "Call tomorrow" }))).toBe("time");
  });

  it("everything else is rest", () => {
    expect(queueBucket(card({ id: "a", subject: "Weekly review ready" }))).toBe("rest");
  });
});

describe("sortQueueCards", () => {
  it("orders money → time → rest, newest first within a bucket", () => {
    const sorted = sortQueueCards([
      card({ id: "rest-old", subject: "Weekly review", ageMinutes: 300 }),
      card({ id: "time", subject: "Kickoff today 2pm" }),
      card({ id: "money", subject: "Invoice overdue" }),
      card({ id: "rest-new", subject: "Memory update", ageMinutes: 5 }),
    ]);
    expect(sorted.map((c) => c.id)).toEqual(["money", "time", "rest-new", "rest-old"]);
  });

  it("does not mutate the input array", () => {
    const input = [
      card({ id: "b", subject: "Weekly review" }),
      card({ id: "a", subject: "Invoice overdue" }),
    ];
    const snapshot = input.map((c) => c.id);
    sortQueueCards(input);
    expect(input.map((c) => c.id)).toEqual(snapshot);
  });
});
