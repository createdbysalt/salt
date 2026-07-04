import { describe, expect, it } from "vitest";
import {
  formatTimezoneLabel,
  normalizeTimezoneValue,
} from "./timezone-format";

describe("timezone-format", () => {
  it("formats canonical IANA timezone", () => {
    expect(formatTimezoneLabel("America/Los_Angeles")).toBe("Pacific Time (US)");
  });

  it("formats legacy uppercase underscore form", () => {
    expect(formatTimezoneLabel("AMERICA/LOS_ANGELES")).toBe("Pacific Time (US)");
  });

  it("normalizes to canonical slug", () => {
    expect(normalizeTimezoneValue("AMERICA/LOS_ANGELES")).toBe(
      "America/Los_Angeles",
    );
  });

  it("returns null for empty values", () => {
    expect(formatTimezoneLabel(null)).toBeNull();
    expect(formatTimezoneLabel("  ")).toBeNull();
  });
});
