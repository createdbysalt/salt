import { describe, expect, it } from "vitest";
import {
  countWords,
  extractionConfidenceLabel,
  sampleHasMinimumContent,
  sampleReadiness,
  sampleReadinessProgress,
} from "./voice-sample-utils";

describe("voice-sample-utils", () => {
  it("counts words in trimmed text", () => {
    expect(countWords("one two three")).toBe(3);
    expect(countWords("  ")).toBe(0);
  });

  it("maps total words to readiness labels", () => {
    expect(sampleReadiness(0)).toBe("empty");
    expect(sampleReadiness(100)).toBe("building");
    expect(sampleReadiness(350)).toBe("ready");
    expect(sampleReadiness(600)).toBe("rich");
  });

  it("caps readiness progress at 1", () => {
    expect(sampleReadinessProgress(150)).toBe(0.5);
    expect(sampleReadinessProgress(600)).toBe(1);
  });

  it("checks per-sample minimum content", () => {
    const words = Array.from({ length: 50 }, (_, i) => `word${i}`).join(" ");
    expect(sampleHasMinimumContent(words)).toBe(true);
    expect(sampleHasMinimumContent("too short")).toBe(false);
  });

  it("maps confidence to qualitative labels", () => {
    expect(extractionConfidenceLabel(0.9)).toBe("Strong match");
    expect(extractionConfidenceLabel(0.7)).toBe("Good match");
    expect(extractionConfidenceLabel(0.4)).toBe("Review carefully");
  });
});
