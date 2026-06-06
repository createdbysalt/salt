import { describe, expect, it } from "vitest";
import {
  acceptAllConsent,
  getConsentFromCookieHeader,
  hasFunctionalConsent,
  parseConsentCookie,
  rejectNonEssentialConsent,
  serializeConsentCookie,
} from "./cookie-consent";

describe("cookie-consent", () => {
  it("acceptAllConsent enables optional categories", () => {
    const record = acceptAllConsent();
    expect(record.necessary).toBe(true);
    expect(record.functional).toBe(true);
    expect(record.analytics).toBe(true);
    expect(record.marketing).toBe(true);
  });

  it("rejectNonEssentialConsent disables optional categories", () => {
    const record = rejectNonEssentialConsent();
    expect(record.functional).toBe(false);
    expect(record.analytics).toBe(false);
    expect(record.marketing).toBe(false);
  });

  it("round-trips consent through serialize and parse", () => {
    const record = acceptAllConsent();
    const parsed = parseConsentCookie(serializeConsentCookie(record));
    expect(parsed).toEqual(record);
  });

  it("returns null for invalid consent payloads", () => {
    expect(parseConsentCookie(undefined)).toBeNull();
    expect(parseConsentCookie("not-json")).toBeNull();
    expect(parseConsentCookie('{"version":2}')).toBeNull();
  });

  it("parses consent from a Cookie request header", () => {
    const record = acceptAllConsent();
    const header = `other=value; salt_consent=${encodeURIComponent(serializeConsentCookie(record))}`;
    expect(getConsentFromCookieHeader(header)).toEqual(record);
    expect(getConsentFromCookieHeader(null)).toBeNull();
  });

  it("hasFunctionalConsent reflects functional category", () => {
    expect(hasFunctionalConsent(acceptAllConsent())).toBe(true);
    expect(hasFunctionalConsent(rejectNonEssentialConsent())).toBe(false);
    expect(hasFunctionalConsent(null)).toBe(false);
  });
});
