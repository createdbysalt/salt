"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  acceptAllConsent,
  createConsentRecord,
  readConsentCookieFromDocument,
  rejectNonEssentialConsent,
  writeConsentCookie,
  type CookieConsentRecord,
} from "@/app/_lib/consent/cookie-consent";
import { clearStoredThemePreference } from "@/app/_lib/consent/theme-storage";
import { CookieConsentBanner } from "./CookieConsentBanner";

type CookieConsentContextValue = {
  consent: CookieConsentRecord | null;
  hasChosen: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (prefs: {
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
  }) => void;
  openPreferences: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(
  null
);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsentRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    setConsent(readConsentCookieFromDocument());
    setHydrated(true);
  }, []);

  const persist = useCallback((record: CookieConsentRecord) => {
    if (!record.functional) {
      clearStoredThemePreference();
    }
    writeConsentCookie(record);
    setConsent(record);
    setPreferencesOpen(false);
  }, []);

  const acceptAll = useCallback(() => {
    persist(acceptAllConsent());
  }, [persist]);

  const rejectNonEssential = useCallback(() => {
    persist(rejectNonEssentialConsent());
  }, [persist]);

  const savePreferences = useCallback(
    (prefs: { functional: boolean; analytics: boolean; marketing: boolean }) => {
      persist(createConsentRecord(prefs));
    },
    [persist]
  );

  const openPreferences = useCallback(() => {
    setPreferencesOpen(true);
  }, []);

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      hasChosen: consent !== null,
      analytics: consent?.analytics === true,
      marketing: consent?.marketing === true,
      functional: consent?.functional === true,
      acceptAll,
      rejectNonEssential,
      savePreferences,
      openPreferences,
    }),
    [
      acceptAll,
      consent,
      openPreferences,
      rejectNonEssential,
      savePreferences,
    ]
  );

  const showBanner = hydrated && consent === null;

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      {showBanner || preferencesOpen ? (
        <CookieConsentBanner
          mode={showBanner ? "initial" : "preferences"}
          initialPreferences={{
            functional: consent?.functional ?? false,
            analytics: consent?.analytics ?? false,
            marketing: consent?.marketing ?? false,
          }}
          onAcceptAll={acceptAll}
          onRejectNonEssential={rejectNonEssential}
          onSavePreferences={savePreferences}
          onClose={() => setPreferencesOpen(false)}
        />
      ) : null}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextValue {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return context;
}
