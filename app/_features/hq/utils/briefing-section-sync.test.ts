import { describe, expect, it } from "vitest";
import { getActiveSectionIndex, splitScriptSections } from "./briefing-section-sync";

describe("briefing-section-sync", () => {
  it("splits script into sentence sections", () => {
    expect(splitScriptSections("Good morning, Gabriella. It's Saturday.")).toEqual([
      { text: "Good morning, Gabriella.", weight: 24 },
      { text: "It's Saturday.", weight: 14 },
    ]);
  });

  it("highlights first section at start", () => {
    const sections = splitScriptSections("One. Two. Three.");
    expect(getActiveSectionIndex(sections, 0)).toBe(0);
  });

  it("highlights last section at end", () => {
    const sections = splitScriptSections("One. Two. Three.");
    expect(getActiveSectionIndex(sections, 1)).toBe(2);
  });
});
