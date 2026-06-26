/**
 * Bridge Branding Configuration Types
 *
 * Defines the structure for white-label customization of Spaces workspaces.
 * Stored in workspaces.bridge_branding JSONB column.
 */

import {
  generateBrandColorScale,
  isValidHexColor,
  type BrandColorScale,
} from "./color-scale";

export interface BridgeLogo {
  /** URL to light mode logo (for dark backgrounds) */
  lightUrl?: string;
  /** URL to dark mode logo (for light backgrounds) */
  darkUrl?: string;
  /** Logo width in pixels (max 200) */
  width?: number;
  /** Logo height in pixels (max 60) */
  height?: number;
}

export interface BridgeFavicon {
  /** URL to favicon image (PNG, ICO, or SVG) */
  url?: string;
}

export interface BridgeColors {
  /** Primary accent color in hex format (e.g., "#4F46E5") */
  accent?: string;
  /** Text color for accent backgrounds (e.g., "#FFFFFF") */
  accentForeground?: string;
  /** Pre-generated color scale from accent color */
  scale?: BrandColorScale;
}

export interface BridgeFooter {
  /** Whether to show "Powered by Salt" badge (default: true) */
  showPoweredBy?: boolean;
  /** Custom footer text (optional) */
  customText?: string | null;
}

export interface BridgeBrandingConfig {
  logo?: BridgeLogo;
  favicon?: BridgeFavicon;
  colors?: BridgeColors;
  footer?: BridgeFooter;
}

/** Resolved branding config with all values filled in */
export interface ResolvedBrandingConfig {
  logo: BridgeLogo;
  favicon: BridgeFavicon;
  colors: {
    accent: string;
    accentForeground: string;
    scale: BrandColorScale;
  };
  footer: {
    showPoweredBy: boolean;
    customText: string | null;
  };
}

/** Default accent color (Salt blue) */
export const DEFAULT_ACCENT_COLOR = "#2a77e8";

/** Pre-generated default color scale */
const DEFAULT_COLOR_SCALE = generateBrandColorScale(DEFAULT_ACCENT_COLOR);

/**
 * Default branding configuration
 * Applied when studio hasn't customized their Bridge
 */
export const DEFAULT_BRIDGE_BRANDING: BridgeBrandingConfig = {
  logo: undefined,
  favicon: undefined,
  colors: {
    accent: DEFAULT_ACCENT_COLOR,
    accentForeground: "#FFFFFF",
    scale: DEFAULT_COLOR_SCALE,
  },
  footer: {
    showPoweredBy: true,
    customText: null,
  },
};

/**
 * Merge studio branding with defaults
 * Ensures all required fields have values
 */
export function resolveBrandingConfig(
  config: BridgeBrandingConfig | null | undefined
): ResolvedBrandingConfig {
  const accent = config?.colors?.accent ?? DEFAULT_ACCENT_COLOR;

  // Use stored scale if available, otherwise generate on the fly
  const scale =
    config?.colors?.scale ??
    (accent !== DEFAULT_ACCENT_COLOR
      ? generateBrandColorScale(accent)
      : DEFAULT_COLOR_SCALE);

  return {
    logo: config?.logo ?? DEFAULT_BRIDGE_BRANDING.logo ?? {},
    favicon: config?.favicon ?? DEFAULT_BRIDGE_BRANDING.favicon ?? {},
    colors: {
      accent,
      accentForeground:
        config?.colors?.accentForeground ??
        scale.foreground,
      scale,
    },
    footer: {
      showPoweredBy:
        config?.footer?.showPoweredBy ??
        DEFAULT_BRIDGE_BRANDING.footer?.showPoweredBy ??
        true,
      customText:
        config?.footer?.customText ??
        DEFAULT_BRIDGE_BRANDING.footer?.customText ??
        null,
    },
  };
}

/**
 * Generate CSS custom properties from branding config
 * Used to apply accent colors to Bridge
 */
export function generateBrandingCSSVariables(
  config: BridgeBrandingConfig
): Record<string, string> {
  const resolved = resolveBrandingConfig(config);
  const { scale } = resolved.colors;

  return {
    // Legacy variables (for backwards compatibility)
    "--bridge-accent": resolved.colors.accent,
    "--bridge-accent-foreground": resolved.colors.accentForeground,

    // Full color scale
    "--brand-50": scale[50],
    "--brand-100": scale[100],
    "--brand-200": scale[200],
    "--brand-300": scale[300],
    "--brand-400": scale[400],
    "--brand-500": scale[500],
    "--brand-600": scale[600],
    "--brand-700": scale[700],
    "--brand-800": scale[800],
    "--brand-900": scale[900],
    "--brand-foreground": scale.foreground,
  };
}

// Re-export isValidHexColor for convenience
export { isValidHexColor };

/**
 * Sanitize branding config input
 * Ensures colors are valid hex values
 */
export function sanitizeBrandingConfig(config: BridgeBrandingConfig): BridgeBrandingConfig {
  const sanitized: BridgeBrandingConfig = { ...config };
  
  if (sanitized.colors) {
    if (sanitized.colors.accent && !isValidHexColor(sanitized.colors.accent)) {
      delete sanitized.colors.accent;
    }
    if (sanitized.colors.accentForeground && !isValidHexColor(sanitized.colors.accentForeground)) {
      delete sanitized.colors.accentForeground;
    }
  }
  
  return sanitized;
}

/**
 * Get a contrasting color (black or white) for text on a given background
 * Uses relative luminance calculation
 */
export function getContrastingColor(hexColor: string): string {
  // Default to white text if color is invalid
  if (!isValidHexColor(hexColor)) {
    return "#FFFFFF";
  }

  // Remove # prefix
  const hex = hexColor.replace("#", "");

  // Parse RGB components
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance (per WCAG 2.0)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black for light backgrounds, white for dark backgrounds
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}
