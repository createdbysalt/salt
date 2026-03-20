"use client";

import * as React from "react";

type Theme = "light" | "dark";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isBridge: boolean;
};

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
  isBridge: false,
};

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState);

/**
 * Check if current path is a Bridge route.
 * Bridge routes always use light mode and don't allow theme changes.
 */
function getIsBridge() {
  if (typeof window === "undefined") return false;
  return window.location.pathname.startsWith("/bridge");
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "salt-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [isBridge, setIsBridge] = React.useState(false);

  const [theme, setTheme] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;

    // Bridge routes always use light mode
    if (getIsBridge()) return "light";

    return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
  });

  // Check if we're on a Bridge route (client-side only)
  React.useEffect(() => {
    setIsBridge(getIsBridge());
  }, []);

  React.useEffect(() => {
    // Bridge routes: force light mode, don't touch classes (handled by blocking script)
    if (isBridge) return;

    // Non-bridge routes: apply stored theme
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;
  }, [theme, isBridge]);

  const value = React.useMemo(() => ({
    theme: isBridge ? "light" : theme,
    isBridge,
    setTheme: (newTheme: Theme) => {
      // Don't allow changing theme on Bridge routes
      if (isBridge) return;

      localStorage.setItem(storageKey, newTheme);
      setTheme(newTheme);
    },
  }), [theme, isBridge, storageKey]);

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
