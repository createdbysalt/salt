import { describe, expect, it } from "vitest";
import {
  buildMemoryPath,
  parseCustomizeType,
  parseMemoryTab,
} from "./memory-tab-routing";

describe("memory tab routing helpers", () => {
  it("defaults to map tab", () => {
    expect(parseMemoryTab(null)).toBe("map");
    expect(parseMemoryTab(undefined)).toBe("map");
    expect(parseMemoryTab("map")).toBe("map");
    expect(parseMemoryTab("something-else")).toBe("map");
  });

  it("parses activity and customize tabs", () => {
    expect(parseMemoryTab("activity")).toBe("activity");
    expect(parseMemoryTab("customize")).toBe("customize");
  });

  it("treats filter as a legacy alias for activity", () => {
    expect(parseMemoryTab("filter")).toBe("activity");
  });

  it("treats rules as a legacy alias for customize", () => {
    expect(parseMemoryTab("rules")).toBe("customize");
  });

  it("builds shareable memory URLs", () => {
    expect(buildMemoryPath("map")).toBe("/memory");
    expect(buildMemoryPath("activity")).toBe("/memory?tab=activity");
    expect(buildMemoryPath("customize")).toBe("/memory?tab=customize");
  });
});

describe("customize type param", () => {
  it("defaults to person", () => {
    expect(parseCustomizeType(null)).toBe("person");
    expect(parseCustomizeType(undefined)).toBe("person");
    expect(parseCustomizeType("nonsense")).toBe("person");
  });

  it("parses each v1 record type", () => {
    expect(parseCustomizeType("person")).toBe("person");
    expect(parseCustomizeType("org")).toBe("org");
    expect(parseCustomizeType("work")).toBe("work");
    expect(parseCustomizeType("resource")).toBe("resource");
    expect(parseCustomizeType("meeting")).toBe("meeting");
    expect(parseCustomizeType("billing")).toBe("billing");
    expect(parseCustomizeType("me")).toBe("me");
  });

  it("parses the general scope", () => {
    expect(parseCustomizeType("general")).toBe("general");
  });

  it("round-trips through buildMemoryPath", () => {
    expect(buildMemoryPath("customize", "org")).toBe(
      "/memory?tab=customize&type=org",
    );
    expect(buildMemoryPath("customize", "meeting")).toBe(
      "/memory?tab=customize&type=meeting",
    );
    expect(buildMemoryPath("customize", "general")).toBe(
      "/memory?tab=customize&type=general",
    );
    // The default type is omitted from the URL.
    expect(buildMemoryPath("customize", "person")).toBe(
      "/memory?tab=customize",
    );
    // The type param only applies to the customize tab.
    expect(buildMemoryPath("activity", "org")).toBe("/memory?tab=activity");
    expect(buildMemoryPath("map", "org")).toBe("/memory");
  });
});
