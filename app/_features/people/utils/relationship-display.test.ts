import { describe, expect, it } from "vitest";
import {
  personDisplayToProfileRelationship,
  profileRelationshipToPersonDisplay,
  relationshipDisplayLabel,
} from "./relationship-display";

describe("relationship display helpers", () => {
  it("formats snake_case relationship labels", () => {
    expect(relationshipDisplayLabel("past_client")).toBe("Past Client");
    expect(relationshipDisplayLabel(null)).toBe("Unknown");
  });

  it("round-trips profile relationship values through people detail labels", () => {
    const values = ["client", "prospect", "team", "partner", "vendor", "personal", "unknown"] as const;

    for (const value of values) {
      const display = profileRelationshipToPersonDisplay(value);
      expect(personDisplayToProfileRelationship(display)).toBe(value);
    }
  });

  it("does not coerce past-client status into a Keeper relationship type", () => {
    expect(personDisplayToProfileRelationship("Past client")).toBeNull();
  });
});
