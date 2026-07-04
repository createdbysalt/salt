import { describe, expect, it } from "vitest";
import { formatPhoneForDisplay, getPhoneDefaultCountry, normalizePhoneForStorage } from "./phone-format";

describe("phone-format", () => {
  it("normalizes US 10-digit numbers to E.164 with +1", () => {
    expect(normalizePhoneForStorage("9714421291")).toBe("+19714421291");
    expect(normalizePhoneForStorage("(971) 442-1291")).toBe("+19714421291");
  });

  it("formats US numbers for display with country code", () => {
    expect(formatPhoneForDisplay("9714421291")).toBe("+1 971 442 1291");
    expect(formatPhoneForDisplay("+19714421291")).toBe("+1 971 442 1291");
  });

  it("formats international numbers with their country code", () => {
    expect(formatPhoneForDisplay("+442071234567")).toBe("+44 20 7123 4567");
    expect(getPhoneDefaultCountry("+442071234567")).toBe("GB");
  });

  it("returns empty string for blank input", () => {
    expect(normalizePhoneForStorage("")).toBe("");
    expect(formatPhoneForDisplay("")).toBe("");
    expect(formatPhoneForDisplay(null)).toBe("");
  });
});
