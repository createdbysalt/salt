import { describe, expect, it } from "vitest";
import { buildSourcesPath, parseSourcesTab } from "./sources-tab-routing";

describe("sources tab routing helpers", () => {
  it("defaults to connectors tab", () => {
    expect(parseSourcesTab(null)).toBe("connectors");
    expect(parseSourcesTab(undefined)).toBe("connectors");
    expect(parseSourcesTab("connectors")).toBe("connectors");
    expect(parseSourcesTab("something-else")).toBe("connectors");
  });

  it("parses activity tab, with stream as legacy alias", () => {
    expect(parseSourcesTab("activity")).toBe("activity");
    expect(parseSourcesTab("stream")).toBe("activity");
  });

  it("builds shareable sources URLs", () => {
    expect(buildSourcesPath("connectors")).toBe("/sources");
    expect(buildSourcesPath("activity")).toBe("/sources?tab=activity");
    expect(buildSourcesPath("connectors", "gmail")).toBe("/sources?connector=gmail");
    expect(buildSourcesPath("connectors", null)).toBe("/sources");
    expect(buildSourcesPath("activity", "gmail")).toBe("/sources?tab=activity");
  });
});
