import { describe, expect, it } from "vitest";
import { isMemoryCareActivityMetadata } from "./plays-activity-filter";

describe("isMemoryCareActivityMetadata", () => {
  it("excludes Memory Care source rows", () => {
    expect(isMemoryCareActivityMetadata({ source: "memory-care" })).toBe(true);
  });

  it("excludes retired keeper / memory-care player slugs", () => {
    expect(isMemoryCareActivityMetadata({ player_slug: "keeper" })).toBe(true);
    expect(isMemoryCareActivityMetadata({ player_slug: "memory-care" })).toBe(
      true,
    );
    expect(isMemoryCareActivityMetadata({ playerSlug: "memory-care" })).toBe(
      true,
    );
  });

  it("keeps act-layer play activity", () => {
    expect(
      isMemoryCareActivityMetadata({
        source: "playbook",
        player_slug: "billing",
      }),
    ).toBe(false);
    expect(isMemoryCareActivityMetadata(null)).toBe(false);
    expect(isMemoryCareActivityMetadata({})).toBe(false);
  });
});
