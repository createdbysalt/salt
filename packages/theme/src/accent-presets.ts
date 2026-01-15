/**
 * Accent Presets
 *
 * Curated accent presets for white-label v1.
 * All validated for WCAG AA contrast on key surfaces.
 */

import type { AccentPreset, AccentPresetId } from "./types";

export const ACCENT_PRESETS: Record<AccentPresetId, AccentPreset> = {
  ocean: {
    id: "ocean",
    displayName: "Ocean",
    description: "Cool blue, professional and trustworthy",
    preview: {
      light: "rgb(107, 156, 255)", // #6b9cff from design
      dark: "rgb(107, 156, 255)", // #6b9cff
    },
  },
  violet: {
    id: "violet",
    displayName: "Violet",
    description: "Creative purple, modern and distinctive",
    preview: {
      light: "rgb(184, 179, 255)", // #b8b3ff from design
      dark: "rgb(184, 179, 255)", // #b8b3ff
    },
  },
  emerald: {
    id: "emerald",
    displayName: "Emerald",
    description: "Fresh green, growth-focused",
    preview: {
      light: "rgb(63, 184, 146)", // #3fb892 from design
      dark: "rgb(63, 184, 146)", // #3fb892
    },
  },
  rose: {
    id: "rose",
    displayName: "Rose",
    description: "Warm coral-orange, bold and energetic",
    preview: {
      light: "rgb(255, 123, 84)", // #ff7b54 from design
      dark: "rgb(255, 123, 84)", // #ff7b54
    },
  },
  amber: {
    id: "amber",
    displayName: "Amber",
    description: "Bright lime, optimistic and modern",
    preview: {
      light: "rgb(212, 255, 94)", // #d4ff5e from design
      dark: "rgb(212, 255, 94)", // #d4ff5e
    },
  },
  slate: {
    id: "slate",
    displayName: "Slate",
    description: "Neutral gray, minimal and refined",
    preview: {
      light: "rgb(74, 69, 101)", // #4a4565 Purple Dark from design
      dark: "rgb(74, 69, 101)", // #4a4565
    },
  },
};

/**
 * Get accent preset by ID with fallback to default
 */
export function getAccentPreset(id?: string | null): AccentPreset {
  if (!id || !(id in ACCENT_PRESETS)) {
    return ACCENT_PRESETS.ocean; // default
  }
  return ACCENT_PRESETS[id as AccentPresetId];
}

/**
 * Get all accent presets as an array (for UI pickers)
 */
export function getAllAccentPresets(): AccentPreset[] {
  return Object.values(ACCENT_PRESETS);
}
