"use client";

import * as React from "react";
import {
  CONSENT_UPDATED_EVENT,
  type CookieConsentRecord,
} from "@/app/_lib/consent/cookie-consent";
import {
  readStoredThemePreference,
  writeStoredThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/app/_lib/consent/theme-storage";

type Theme = ThemePreference;

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isTable: boolean;
};

const initialState: ThemeProviderState = {
  theme: "light",
  setTheme: () => null,
  isTable: false,
};

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState);

/**
 * Check if current path is a Bridge route.
 * Bridge routes always use light mode and don't allow theme changes.
 */
function getIsBridge() {
  if (typeof window === "undefined") return false;
  return window.location.pathname.startsWith("/table");
}

function resolveTheme(defaultTheme: Theme, storageKey: string): Theme {
  if (getIsBridge()) return "light";
  return readStoredThemePreference(storageKey) ?? defaultTheme;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = THEME_STORAGE_KEY,
  ...props
}: ThemeProviderProps) {
  const [isTable, setIsBridge] = React.useState(false);

  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    return resolveTheme(defaultTheme, storageKey);
  });

  const applyThemeToDocument = React.useCallback((nextTheme: Theme) => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(nextTheme);
    root.setAttribute("data-theme", nextTheme);
    root.style.colorScheme = nextTheme;
  }, []);

  // Check if we're on a Bridge route (client-side only)
  React.useEffect(() => {
    setIsBridge(getIsBridge());
  }, []);

  React.useEffect(() => {
    if (isTable) return;
    applyThemeToDocument(theme);
  }, [applyThemeToDocument, isTable, theme]);

  React.useEffect(() => {
    if (isTable) return;

    const handleConsentUpdated = (event: Event) => {
      const record = (event as CustomEvent<CookieConsentRecord>).detail;
      if (record.functional) {
        setThemeState(resolveTheme(defaultTheme, storageKey));
      } else {
        setThemeState(defaultTheme);
      }
    };

    window.addEventListener(CONSENT_UPDATED_EVENT, handleConsentUpdated);
    return () => {
      window.removeEventListener(CONSENT_UPDATED_EVENT, handleConsentUpdated);
    };
  }, [defaultTheme, isTable, storageKey]);

  const value = React.useMemo(
    () => ({
      theme: isTable ? "light" : theme,
      isTable,
      setTheme: (newTheme: Theme) => {
        if (isTable) return;

        setThemeState(newTheme);
        writeStoredThemePreference(newTheme, storageKey);
      },
    }),
    [isTable, storageKey, theme]
  );

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
