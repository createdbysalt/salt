/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  acceptAllConsent,
  rejectNonEssentialConsent,
  serializeConsentCookie,
} from "./cookie-consent";
import {
  clearStoredThemePreference,
  readStoredThemePreference,
  THEME_STORAGE_KEY,
  writeStoredThemePreference,
} from "./theme-storage";

describe("theme-storage", () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = "";
  });

  afterEach(() => {
    localStorage.clear();
    document.cookie = "";
  });

  function setConsentCookie(record: ReturnType<typeof acceptAllConsent>) {
    document.cookie = `salt_consent=${encodeURIComponent(serializeConsentCookie(record))}`;
  }

  it("does not read stored theme without functional consent", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    setConsentCookie(rejectNonEssentialConsent());

    expect(readStoredThemePreference()).toBeNull();
  });

  it("reads stored theme when functional consent is granted", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    setConsentCookie(acceptAllConsent());

    expect(readStoredThemePreference()).toBe("dark");
  });

  it("does not write theme without functional consent", () => {
    setConsentCookie(rejectNonEssentialConsent());

    expect(writeStoredThemePreference("dark")).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("writes theme when functional consent is granted", () => {
    setConsentCookie(acceptAllConsent());

    expect(writeStoredThemePreference("dark")).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("clearStoredThemePreference removes the key", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    clearStoredThemePreference();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});
