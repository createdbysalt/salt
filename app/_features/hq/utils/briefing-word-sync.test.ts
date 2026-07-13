import { describe, expect, it } from "vitest";
import { getActiveWordIndex, tokenizeScript } from "./briefing-word-sync";

describe("briefing-word-sync", () => {
  it("tokenizes script into weighted words", () => {
    expect(tokenizeScript("Good morning, Gabriella.")).toEqual([
      { text: "Good", weight: 4 },
      { text: "morning,", weight: 7 },
      { text: "Gabriella.", weight: 9 },
    ]);
  });

  it("returns first word at start of playback", () => {
    const words = tokenizeScript("One two three");
    expect(getActiveWordIndex(words, 0)).toBe(0);
  });

  it("returns last word at end of playback", () => {
    const words = tokenizeScript("One two three");
    expect(getActiveWordIndex(words, 1)).toBe(2);
  });
});
