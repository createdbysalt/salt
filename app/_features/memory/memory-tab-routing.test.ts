import { describe, expect, it } from "vitest";
import { buildMemoryPath, parseMemoryTab } from "./memory-tab-routing";

describe("memory tab routing helpers", () => {
  it("defaults to map tab", () => {
    expect(parseMemoryTab(null)).toBe("map");
    expect(parseMemoryTab(undefined)).toBe("map");
    expect(parseMemoryTab("map")).toBe("map");
    expect(parseMemoryTab("something-else")).toBe("map");
  });

  it("parses filter and rules tabs", () => {
    expect(parseMemoryTab("filter")).toBe("filter");
    expect(parseMemoryTab("rules")).toBe("rules");
  });

  it("builds shareable memory URLs", () => {
    expect(buildMemoryPath("map")).toBe("/memory");
    expect(buildMemoryPath("filter")).toBe("/memory?tab=filter");
    expect(buildMemoryPath("rules")).toBe("/memory?tab=rules");
  });
});
