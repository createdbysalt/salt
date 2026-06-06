export const CONSENT_COOKIE_NAME = "salt_consent";
export const CONSENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type CookieConsentCategories = {
  /** Always true — auth, security, consent record */
  necessary: true;
  /** UI preferences such as theme */
  functional: boolean;
  /** Usage measurement (funnel events, product analytics) */
  analytics: boolean;
  /** Third-party chat, ads, retargeting */
  marketing: boolean;
};

export type CookieConsentRecord = CookieConsentCategories & {
  version: 1;
  updatedAt: string;
};

export type CookieConsentChoice =
  | CookieConsentRecord
  | null;

const CONSENT_VERSION = 1 as const;

export function createConsentRecord(
  categories: Omit<CookieConsentCategories, "necessary"> & {
    necessary?: true;
  }
): CookieConsentRecord {
  return {
    version: CONSENT_VERSION,
    necessary: true,
    functional: categories.functional,
    analytics: categories.analytics,
    marketing: categories.marketing,
    updatedAt: new Date().toISOString(),
  };
}

export function acceptAllConsent(): CookieConsentRecord {
  return createConsentRecord({
    functional: true,
    analytics: true,
    marketing: true,
  });
}

export function rejectNonEssentialConsent(): CookieConsentRecord {
  return createConsentRecord({
    functional: false,
    analytics: false,
    marketing: false,
  });
}

export function parseConsentCookie(value: string | undefined): CookieConsentChoice {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<CookieConsentRecord>;
    if (parsed.version !== CONSENT_VERSION) return null;
    if (parsed.necessary !== true) return null;
    if (
      typeof parsed.functional !== "boolean" ||
      typeof parsed.analytics !== "boolean" ||
      typeof parsed.marketing !== "boolean" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null;
    }

    return {
      version: CONSENT_VERSION,
      necessary: true,
      functional: parsed.functional,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function serializeConsentCookie(record: CookieConsentRecord): string {
  return JSON.stringify(record);
}

export function readConsentCookieFromDocument(): CookieConsentChoice {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${CONSENT_COOKIE_NAME}=`));

  if (!match) return null;

  const value = decodeURIComponent(match.slice(CONSENT_COOKIE_NAME.length + 1));
  return parseConsentCookie(value);
}

export function writeConsentCookie(record: CookieConsentRecord): void {
  if (typeof document === "undefined") return;

  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";

  document.cookie = [
    `${CONSENT_COOKIE_NAME}=${encodeURIComponent(serializeConsentCookie(record))}`,
    `Max-Age=${CONSENT_COOKIE_MAX_AGE_SECONDS}`,
    "Path=/",
    "SameSite=Lax",
    secure,
  ].join("; ");

  window.dispatchEvent(
    new CustomEvent(CONSENT_UPDATED_EVENT, { detail: record })
  );
}

export function hasAnalyticsConsent(consent: CookieConsentChoice): boolean {
  return consent?.analytics === true;
}

export function hasMarketingConsent(consent: CookieConsentChoice): boolean {
  return consent?.marketing === true;
}

export function hasFunctionalConsent(consent: CookieConsentChoice): boolean {
  return consent?.functional === true;
}

/** Dispatched on `window` after consent is persisted (client only). */
export const CONSENT_UPDATED_EVENT = "salt:consent-updated";

/** Parse `salt_consent` from a raw Cookie request header (API routes). */
export function getConsentFromCookieHeader(
  cookieHeader: string | null | undefined
): CookieConsentChoice {
  if (!cookieHeader) return null;

  for (const entry of cookieHeader.split(";")) {
    const trimmed = entry.trim();
    if (!trimmed.startsWith(`${CONSENT_COOKIE_NAME}=`)) continue;

    const value = decodeURIComponent(
      trimmed.slice(CONSENT_COOKIE_NAME.length + 1)
    );
    return parseConsentCookie(value);
  }

  return null;
}
