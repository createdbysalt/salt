import { describe, expect, it } from "vitest";
import {
  ORG_ARCHETYPE_CONFIG,
  ORG_ARCHETYPE_DISPLAY_LABEL,
  orgStatusToArchetype,
} from "./archetypes";

describe("orgStatusToArchetype", () => {
  it("maps revenue statuses", () => {
    expect(orgStatusToArchetype("client")).toBe("revenue");
    expect(orgStatusToArchetype("past_client")).toBe("revenue");
  });

  it("maps pipeline, network, and neutral", () => {
    expect(orgStatusToArchetype("prospect")).toBe("pipeline");
    expect(orgStatusToArchetype("partner")).toBe("network");
    expect(orgStatusToArchetype("vendor")).toBe("network");
    expect(orgStatusToArchetype("other")).toBe("neutral");
    expect(orgStatusToArchetype(null)).toBe("neutral");
  });
});

describe("org archetype weight tables", () => {
  it("sums weights to 1 for each archetype", () => {
    for (const config of Object.values(ORG_ARCHETYPE_CONFIG)) {
      const sum = config.weights.reduce((total, item) => total + item.weight, 0);
      expect(sum).toBeCloseTo(1, 5);
    }
  });

  it("keeps multi-signal archetypes under 50% per signal", () => {
    for (const config of Object.values(ORG_ARCHETYPE_CONFIG)) {
      if (config.weights.length <= 1) continue;
      for (const item of config.weights) {
        expect(item.weight).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it("exposes display labels for each archetype", () => {
    expect(ORG_ARCHETYPE_DISPLAY_LABEL.revenue).toBe("Account health");
    expect(ORG_ARCHETYPE_DISPLAY_LABEL.pipeline).toBe("Pipeline health");
    expect(ORG_ARCHETYPE_DISPLAY_LABEL.network).toBe("Partner strength");
    expect(ORG_ARCHETYPE_DISPLAY_LABEL.neutral).toBe("Account health");
  });
});
