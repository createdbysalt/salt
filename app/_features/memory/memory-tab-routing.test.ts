import { describe, expect, it } from "vitest";
import { buildMemoryPath, parseMemoryTab } from "./memory-tab-routing";

describe("memory tab routing helpers", () => {
  it("defaults to map tab", () => {
    expect(parseMemoryTab(null)).toBe("map");
    expect(parseMemoryTab(undefined)).toBe("map");
    expect(parseMemoryTab("map")).toBe("map");
    expect(parseMemoryTab("something-else")).toBe("map");
  });

  it("parses activity and rules tabs", () => {
    expect(parseMemoryTab("activity")).toBe("activity");
    expect(parseMemoryTab("rules")).toBe("rules");
  });

  it("treats filter as a legacy alias for activity", () => {
    expect(parseMemoryTab("filter")).toBe("activity");
  });

  it("builds shareable memory URLs", () => {
    expect(buildMemoryPath("map")).toBe("/memory");
    expect(buildMemoryPath("activity")).toBe("/memory?tab=activity");
    expect(buildMemoryPath("rules")).toBe("/memory?tab=rules");
  });
});
