import { describe, expect, it } from "vitest";
import { timezoneToCountry } from "./timezone-country";

describe("timezoneToCountry", () => {
  it("maps common IANA zones to ISO 3166-1 alpha-2 codes", () => {
    expect(timezoneToCountry("America/Chicago")).toBe("US");
    expect(timezoneToCountry("America/New_York")).toBe("US");
    expect(timezoneToCountry("America/Toronto")).toBe("CA");
    expect(timezoneToCountry("Europe/London")).toBe("GB");
    expect(timezoneToCountry("Europe/Berlin")).toBe("DE");
    expect(timezoneToCountry("Australia/Sydney")).toBe("AU");
    expect(timezoneToCountry("Asia/Tokyo")).toBe("JP");
    expect(timezoneToCountry("America/Sao_Paulo")).toBe("BR");
  });

  it("returns null for unknown or ambiguous zones", () => {
    expect(timezoneToCountry("Antarctica/McMurdo")).toBeNull();
    expect(timezoneToCountry("UTC")).toBeNull();
    expect(timezoneToCountry("Etc/UTC")).toBeNull();
    expect(timezoneToCountry("Not/AZone")).toBeNull();
    expect(timezoneToCountry("")).toBeNull();
  });

  it("never returns a non-ISO-code value", () => {
    // The whole point: the country field must never receive a zone string.
    for (const zone of [
      "America/Chicago",
      "Europe/Paris",
      "Asia/Dubai",
      "Pacific/Auckland",
    ]) {
      const country = timezoneToCountry(zone);
      expect(country).toMatch(/^[A-Z]{2}$/);
    }
  });
});
