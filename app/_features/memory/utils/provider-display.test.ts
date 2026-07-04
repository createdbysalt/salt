import { describe, expect, it } from "vitest";
import { getOriginLabel } from "./provider-display";

describe("getOriginLabel", () => {
  it("attributes connector-sourced records to Salt", () => {
    expect(getOriginLabel("found", "Stripe")).toBe("Found by Salt in Stripe");
  });

  it("keeps extraction and manual copy distinct", () => {
    expect(getOriginLabel("extracted", "Salt")).toBe(
      "Extracted by Salt from email or document",
    );
    expect(getOriginLabel("created", "Added manually")).toBe("Added manually");
  });
});
