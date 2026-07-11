import { describe, expect, it } from "vitest";
import {
  buildCreatePlaySuggestions,
  buildRunPlaySuggestions,
  buildSearchMemorySuggestions,
} from "./composer-suggestion-builders";

describe("buildSearchMemorySuggestions", () => {
  it("uses real people and work instead of generic brands", () => {
    const suggestions = buildSearchMemorySuggestions({
      quietPeople: [{ name: "Simon Mould", daysSinceContact: 32 }],
      recentWork: [
        {
          title: "AI Chat Enterprise Solution",
          personName: "Simon Mould",
          orgName: null,
        },
      ],
      recentOrgs: [{ name: "Portland Bible College" }],
      recentPeople: [{ name: "Simon Mould" }],
    });

    expect(suggestions[0]).toMatch(/Simon Mould|Simon/);
    expect(suggestions.some((s) => s.includes("AI Chat Enterprise Solution"))).toBe(
      true,
    );
    expect(suggestions.some((s) => s.includes("Portland Bible College"))).toBe(true);
    expect(suggestions.some((s) => s.includes("Acme"))).toBe(false);
  });

  it("falls back when memory is empty", () => {
    const suggestions = buildSearchMemorySuggestions({
      quietPeople: [],
      recentWork: [],
      recentOrgs: [],
      recentPeople: [],
    });

    expect(suggestions.length).toBe(3);
    expect(suggestions[0]).toMatch(/Search everything in Memory/i);
  });
});

describe("buildRunPlaySuggestions", () => {
  it("prefers queued plays and active templates", () => {
    const suggestions = buildRunPlaySuggestions({
      playNames: ["Weekly check-in"],
      queuedTitles: ["Follow up with Simon"],
    });

    expect(suggestions[0]).toBe('Run "Follow up with Simon"');
    expect(suggestions).toContain('Run "Weekly check-in"');
  });
});

describe("buildCreatePlaySuggestions", () => {
  it("suggests refining an existing play when templates exist", () => {
    const suggestions = buildCreatePlaySuggestions({
      playNames: ["Quiet client nudge"],
      quietPersonName: "Simon Mould",
    });

    expect(suggestions[0]).toMatch(/Simon/);
    expect(suggestions).toContain('Refine my "Quiet client nudge" play');
  });
});
