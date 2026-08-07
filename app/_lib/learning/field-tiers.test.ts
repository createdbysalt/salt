import { describe, it, expect } from "vitest";
import {
  classifyFieldTier,
  decideTierOutcome,
  isAlwaysAutoField,
  isNeverTouchField,
  tierBar,
  ELEVATED_TIER_FLOOR,
} from "./field-tiers";

describe("field-tiers", () => {
  describe("isNeverTouchField", () => {
    it("refuses billing money fields", () => {
      expect(isNeverTouchField("billing", "total")).toBe(true);
      expect(isNeverTouchField("billing", "amount_paid")).toBe(true);
    });

    it("allows ordinary fields", () => {
      expect(isNeverTouchField("person", "relationship_type")).toBe(false);
    });
  });

  describe("isAlwaysAutoField", () => {
    it("bypasses gating for observation fields", () => {
      expect(isAlwaysAutoField("person", "email")).toBe(true);
      expect(isAlwaysAutoField("person", "last_contacted_at")).toBe(true);
    });
  });

  describe("classifyFieldTier", () => {
    it("marks sensitive classifications", () => {
      expect(classifyFieldTier("person", "industry")).toBe("sensitive");
      expect(classifyFieldTier("person", "relationship_type")).toBe(
        "sensitive"
      );
    });

    it("marks first-time classifications as sensitive when empty", () => {
      expect(classifyFieldTier("person", "record_status", "active", null)).toBe(
        "sensitive"
      );
      expect(
        classifyFieldTier("person", "record_status", "active", "prospect")
      ).toBe("standard");
    });

    it("marks destructive transitions", () => {
      expect(
        classifyFieldTier("person", "record_status", "past_client", "active")
      ).toBe("destructive");
      expect(
        classifyFieldTier("work", "status", "cancelled", "active")
      ).toBe("destructive");
    });

    it("marks never-touch before other tiers", () => {
      expect(classifyFieldTier("billing", "total", 100)).toBe("never_touch");
    });
  });

  describe("tierBar", () => {
    it("uses workspace threshold for standard", () => {
      expect(tierBar("standard", 85)).toBe(85);
      expect(tierBar("standard", 70)).toBe(70);
    });

    it("raises sensitive and destructive to at least 95", () => {
      expect(tierBar("sensitive", 85)).toBe(ELEVATED_TIER_FLOOR);
      expect(tierBar("destructive", 85)).toBe(ELEVATED_TIER_FLOOR);
      expect(tierBar("sensitive", 98)).toBe(98);
    });

    it("refuses never_touch at any confidence", () => {
      expect(tierBar("never_touch", 85)).toBe(Number.POSITIVE_INFINITY);
    });
  });

  describe("decideTierOutcome", () => {
    it("applies when confidence clears the bar", () => {
      expect(decideTierOutcome("standard", 90, 85)).toEqual({
        decision: "apply",
        bar: 85,
      });
    });

    it("watches when below the bar", () => {
      expect(decideTierOutcome("standard", 70, 85)).toEqual({
        decision: "watch",
        bar: 85,
      });
    });

    it("holds sensitive to the elevated floor", () => {
      expect(decideTierOutcome("sensitive", 90, 85)).toEqual({
        decision: "watch",
        bar: 95,
      });
      expect(decideTierOutcome("sensitive", 96, 85)).toEqual({
        decision: "apply",
        bar: 95,
      });
    });

    it("refuses never_touch", () => {
      expect(decideTierOutcome("never_touch", 100, 85)).toEqual({
        decision: "refuse",
        bar: Number.POSITIVE_INFINITY,
      });
    });
  });
});
