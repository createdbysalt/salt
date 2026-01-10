import type { ThemeMode, AccentPresetId, UiTheme } from "./types";
import { getAccentPreset } from "./accent-presets";

/**
 * Resolved theme attributes to apply to <html>
 */
export interface ResolvedTheme {
  dataTheme: ThemeMode;
  dataAccent: AccentPresetId;
  dataReducedMotion?: boolean;
}

/**
 * Resolve final theme from user preferences + Bridge config
 * 
 * Priority:
 * 1. User profile theme mode (per-user dark/light toggle)
 * 2. Bridge portal accent preset (if viewing as client)
 * 3. Defaults (dark + ocean)
 */
export function resolveTheme(options: {
  userThemeMode?: string | null;
  bridgeAccentPreset?: string | null;
  userReducedMotion?: boolean | null;
}): ResolvedTheme {
  const { userThemeMode, bridgeAccentPreset, userReducedMotion } = options;

  // Resolve mode (default dark)
  const dataTheme: ThemeMode = 
    userThemeMode === "light" || userThemeMode === "dark" 
      ? userThemeMode 
      : "dark";

  // Resolve accent (default ocean)
  const preset = getAccentPreset(bridgeAccentPreset);
  const dataAccent = preset.id;

  return {
    dataTheme,
    dataAccent,
    dataReducedMotion: userReducedMotion ?? undefined,
  };
}

/**
 * Helper to build data-* attribute object for HTML element
 */
export function getThemeAttributes(resolved: ResolvedTheme): Record<string, string> {
  const attrs: Record<string, string> = {
    "data-theme": resolved.dataTheme,
    "data-accent": resolved.dataAccent,
  };
  
  if (resolved.dataReducedMotion) {
    attrs["data-reduced-motion"] = "true";
  }
  
  return attrs;
}






