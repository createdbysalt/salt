import {
  hasFunctionalConsent,
  readConsentCookieFromDocument,
  type CookieConsentChoice,
} from "./cookie-consent";

export const THEME_STORAGE_KEY = "salt-ui-theme-v2";

export type ThemePreference = "light" | "dark";

export function readStoredThemePreference(
  storageKey: string = THEME_STORAGE_KEY,
  consent: CookieConsentChoice = readConsentCookieFromDocument()
): ThemePreference | null {
  if (typeof window === "undefined") return null;
  if (!hasFunctionalConsent(consent)) return null;

  const stored = localStorage.getItem(storageKey);
  if (stored === "light" || stored === "dark") return stored;
  return null;
}

export function writeStoredThemePreference(
  theme: ThemePreference,
  storageKey: string = THEME_STORAGE_KEY,
  consent: CookieConsentChoice = readConsentCookieFromDocument()
): boolean {
  if (typeof window === "undefined") return false;
  if (!hasFunctionalConsent(consent)) return false;

  localStorage.setItem(storageKey, theme);
  return true;
}

export function clearStoredThemePreference(
  storageKey: string = THEME_STORAGE_KEY
): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey);
}
