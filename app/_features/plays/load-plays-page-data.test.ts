import { describe, expect, it } from "vitest";
import { emptyPlaysPageData, parsePlaysTab } from "./load-plays-page-data";

describe("loadPlaysPageData helpers", () => {
  it("defaults to queue tab", () => {
    expect(parsePlaysTab(null)).toBe("queue");
    expect(parsePlaysTab(undefined)).toBe("queue");
    expect(parsePlaysTab("queue")).toBe("queue");
  });

  it("parses playbooks and activity tabs", () => {
    expect(parsePlaysTab("playbooks")).toBe("playbooks");
    expect(parsePlaysTab("activity")).toBe("activity");
  });

  it("falls back to queue for unknown or legacy tab values", () => {
    expect(parsePlaysTab("customize")).toBe("queue");
    expect(parsePlaysTab("something-else")).toBe("queue");
  });

  it("returns empty page data defaults", () => {
    const empty = emptyPlaysPageData();
    expect(empty.initialQueue).toEqual([]);
    expect(empty.findingCounts).toEqual({ needs_you: 0, auto_handled: 0 });
    expect(empty.playbooksV2).toBeNull();
  });
});
