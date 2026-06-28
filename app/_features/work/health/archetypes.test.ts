import { describe, expect, it } from "vitest";
import {
  WORK_ARCHETYPE_CONFIG,
  WORK_ARCHETYPE_DISPLAY_LABEL,
  workTypeToArchetype,
} from "./archetypes";

describe("work archetypes", () => {
  describe("workTypeToArchetype", () => {
    it("maps retainer to recurring", () => {
      expect(workTypeToArchetype("retainer")).toBe("recurring");
    });

    it("maps project to delivery", () => {
      expect(workTypeToArchetype("project")).toBe("delivery");
    });

    it("maps event to delivery", () => {
      expect(workTypeToArchetype("event")).toBe("delivery");
    });

    it("maps hourly to utilization", () => {
      expect(workTypeToArchetype("hourly")).toBe("utilization");
    });

    it("maps proposal to pipeline", () => {
      expect(workTypeToArchetype("proposal")).toBe("pipeline");
    });

    it("maps quick to transactional", () => {
      expect(workTypeToArchetype("quick")).toBe("transactional");
    });

    it("defaults null to delivery", () => {
      expect(workTypeToArchetype(null)).toBe("delivery");
    });

    it("defaults unknown to delivery", () => {
      expect(workTypeToArchetype("unknown")).toBe("delivery");
    });
  });

  describe("archetype config validation", () => {
    it("all archetypes have weights summing to 1", () => {
      for (const [archetype, config] of Object.entries(WORK_ARCHETYPE_CONFIG)) {
        const sum = config.weights.reduce((total, item) => total + item.weight, 0);
        expect(sum).toBeCloseTo(1, 3);
      }
    });

    it("all archetypes have positive half-life days", () => {
      for (const config of Object.values(WORK_ARCHETYPE_CONFIG)) {
        expect(config.halfLifeDays).toBeGreaterThan(0);
      }
    });

    it("no single weight exceeds 50%", () => {
      for (const config of Object.values(WORK_ARCHETYPE_CONFIG)) {
        if (config.weights.length > 1) {
          for (const item of config.weights) {
            expect(item.weight).toBeLessThanOrEqual(0.5);
          }
        }
      }
    });
  });

  describe("display labels", () => {
    it("has labels for all archetypes", () => {
      expect(WORK_ARCHETYPE_DISPLAY_LABEL.recurring).toBe("Retainer health");
      expect(WORK_ARCHETYPE_DISPLAY_LABEL.delivery).toBe("Project health");
      expect(WORK_ARCHETYPE_DISPLAY_LABEL.utilization).toBe("Utilization health");
      expect(WORK_ARCHETYPE_DISPLAY_LABEL.pipeline).toBe("Pipeline health");
      expect(WORK_ARCHETYPE_DISPLAY_LABEL.transactional).toBe("Quick work health");
    });
  });
});
