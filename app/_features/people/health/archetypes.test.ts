import { describe, expect, it } from "vitest";
import {
  ARCHETYPE_CONFIG,
  ARCHETYPE_DISPLAY_LABEL,
  relationshipTypeToArchetype,
} from "./archetypes";

describe("relationshipTypeToArchetype", () => {
  it("maps revenue types", () => {
    expect(relationshipTypeToArchetype({ relationshipType: "client" })).toBe("revenue");
    expect(
      relationshipTypeToArchetype({ relationshipType: "unknown", relationshipStatus: "past_client" }),
    ).toBe("revenue");
  });

  it("maps pipeline, network, internal, and neutral", () => {
    expect(relationshipTypeToArchetype({ relationshipType: "prospect" })).toBe("pipeline");
    expect(relationshipTypeToArchetype({ relationshipType: "partner" })).toBe("network");
    expect(relationshipTypeToArchetype({ relationshipType: "vendor" })).toBe("network");
    expect(relationshipTypeToArchetype({ relationshipType: "personal" })).toBe("network");
    expect(relationshipTypeToArchetype({ relationshipType: "team" })).toBe("internal");
    expect(relationshipTypeToArchetype({ relationshipType: "unknown" })).toBe("neutral");
  });
});

describe("archetype weight tables", () => {
  it("sums weights to 1 for each archetype", () => {
    for (const config of Object.values(ARCHETYPE_CONFIG)) {
      const sum = config.weights.reduce((total, item) => total + item.weight, 0);
      expect(sum).toBeCloseTo(1, 5);
    }
  });

  it("keeps multi-signal archetypes under 50% per signal", () => {
    for (const config of Object.values(ARCHETYPE_CONFIG)) {
      if (config.weights.length <= 1) continue;
      for (const item of config.weights) {
        expect(item.weight).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it("exposes display labels for each archetype", () => {
    expect(ARCHETYPE_DISPLAY_LABEL.revenue).toBe("Client health");
    expect(ARCHETYPE_DISPLAY_LABEL.pipeline).toBe("Pipeline health");
    expect(ARCHETYPE_DISPLAY_LABEL.network).toBe("Network strength");
    expect(ARCHETYPE_DISPLAY_LABEL.internal).toBe("Team strength");
  });
});
