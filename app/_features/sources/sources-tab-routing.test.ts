import { describe, expect, it } from "vitest";
import {
  buildSourcesPath,
  parseCustomizeCategory,
  parseSourcesTab,
} from "./sources-tab-routing";

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

  it("parses the customize tab", () => {
    expect(parseSourcesTab("customize")).toBe("customize");
    expect(parseSourcesTab("Customize")).toBe("connectors");
  });

  it("builds shareable sources URLs", () => {
    expect(buildSourcesPath("connectors")).toBe("/sources");
    expect(buildSourcesPath("activity")).toBe("/sources?tab=activity");
    expect(buildSourcesPath("connectors", "gmail")).toBe("/sources?connector=gmail");
    expect(buildSourcesPath("connectors", null)).toBe("/sources");
    expect(buildSourcesPath("activity", "gmail")).toBe("/sources?tab=activity");
  });

  it("builds customize URLs with an optional category param", () => {
    expect(buildSourcesPath("customize")).toBe("/sources?tab=customize");
    expect(buildSourcesPath("customize", null, "email")).toBe(
      "/sources?tab=customize&category=email",
    );
    expect(buildSourcesPath("customize", null, null)).toBe(
      "/sources?tab=customize",
    );
    // A connector id is meaningless off the connectors tab.
    expect(buildSourcesPath("customize", "gmail", "email")).toBe(
      "/sources?tab=customize&category=email",
    );
  });

  it("parses a customize category param", () => {
    expect(parseCustomizeCategory("email")).toBe("email");
    expect(parseCustomizeCategory("all")).toBe("all");
    expect(parseCustomizeCategory(null)).toBeNull();
    expect(parseCustomizeCategory("")).toBeNull();
  });

  it("normalizes legacy ConnectorCategory keys to their area", () => {
    // Deep links predate the area re-key (2026-08-10) — old bookmarks and
    // pane links carrying engineering category keys still land right.
    expect(parseCustomizeCategory("communication")).toBe("messaging");
    expect(parseCustomizeCategory("project_management")).toBe("projects");
    expect(parseCustomizeCategory("documents")).toBe("storage");
    expect(parseCustomizeCategory("EMAIL")).toBe("email");
  });
});
