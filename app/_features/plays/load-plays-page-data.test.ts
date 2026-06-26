import { describe, expect, it } from "vitest";
import {
  emptyPlaysPageData,
  parsePlaysActivityView,
  parsePlaysTab,
} from "./load-plays-page-data";

describe("loadPlaysPageData helpers", () => {
  it("defaults to queue tab", () => {
    expect(parsePlaysTab(null)).toBe("queue");
    expect(parsePlaysTab(undefined)).toBe("queue");
    expect(parsePlaysTab("queue")).toBe("queue");
  });

  it("parses customize and activity tabs", () => {
    expect(parsePlaysTab("customize")).toBe("customize");
    expect(parsePlaysTab("activity")).toBe("activity");
  });

  it("parses activity views", () => {
    expect(parsePlaysActivityView(null)).toBe("actions");
    expect(parsePlaysActivityView("captures")).toBe("captures");
    expect(parsePlaysActivityView("stream")).toBe("captures");
  });

  it("returns empty page data defaults", () => {
    const empty = emptyPlaysPageData();
    expect(empty.initialQueue).toEqual([]);
    expect(empty.findingCounts).toEqual({ needs_you: 0, auto_handled: 0 });
    expect(empty.connectors).toBeNull();
  });
});
