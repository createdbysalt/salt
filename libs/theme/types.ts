// Theme mode types
export type ThemeMode = "light" | "dark";

// Curated accent preset IDs (white-label v1)
export type AccentPresetId = "ocean" | "violet" | "emerald" | "rose" | "amber" | "slate";

// Complete UI theme configuration
export interface UiTheme {
  mode: ThemeMode;
  accentPreset: AccentPresetId;
  reducedMotion?: boolean;
}

// Accent preset definition with metadata
export interface AccentPreset {
  id: AccentPresetId;
  displayName: string;
  description: string;
  // Preview colors for UI display (500-level hues)
  preview: {
    light: string;
    dark: string;
  };
}



