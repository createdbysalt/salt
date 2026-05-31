/**
 * Brand Color Scale Generator
 *
 * Generates a full color scale from a single brand color input using OKLCH
 * for perceptually uniform color variations.
 *
 * Usage:
 *   const scale = generateBrandColorScale("#2563eb")
 *   // Returns: { 50: "#eff6ff", 100: "#dbeafe", ..., 900: "#1e3a8a" }
 */

export interface BrandColorScale {
  /** Very light wash - page backgrounds, subtle fills */
  50: string;
  /** Light - hover states, muted areas, badges */
  100: string;
  /** Soft - borders, dividers, focus rings */
  200: string;
  /** Medium light */
  300: string;
  /** Medium */
  400: string;
  /** Core - secondary buttons, links */
  500: string;
  /** Primary - main buttons, CTAs (usually the input color) */
  600: string;
  /** Hover - button hover states */
  700: string;
  /** Pressed - button active states */
  800: string;
  /** Dark - accent text on light backgrounds */
  900: string;
  /** Auto-calculated contrast color for text on primary */
  foreground: string;
}

interface OKLCH {
  l: number; // Lightness 0-1
  c: number; // Chroma 0-0.4 (roughly)
  h: number; // Hue 0-360
}

/**
 * Convert hex color to OKLCH
 */
function hexToOklch(hex: string): OKLCH {
  // Remove # if present
  const h = hex.replace("#", "");

  // Parse RGB
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;

  // Convert to linear RGB
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  // Convert to XYZ (D65)
  const x = 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb;
  const y = 0.2126729 * lr + 0.7151522 * lg + 0.072175 * lb;
  const z = 0.0193339 * lr + 0.119192 * lg + 0.9503041 * lb;

  // Convert to OKLab
  const l_ = Math.cbrt(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z);
  const m_ = Math.cbrt(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z);
  const s_ = Math.cbrt(0.0482003018 * x + 0.2643662691 * y + 0.633851707 * z);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bOk = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  // Convert to OKLCH
  const c = Math.sqrt(a * a + bOk * bOk);
  let hue = (Math.atan2(bOk, a) * 180) / Math.PI;
  if (hue < 0) hue += 360;

  return { l: L, c, h: hue };
}

/**
 * Convert OKLCH to hex color
 */
function oklchToHex(oklch: OKLCH): string {
  const { l: L, c, h } = oklch;

  // Convert to OKLab
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const bOk = c * Math.sin(hRad);

  // Convert to LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * bOk;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * bOk;
  const s_ = L - 0.0894841775 * a - 1.291485548 * bOk;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // Convert to XYZ
  const x = 1.2270138511 * l - 0.5577999807 * m + 0.2812561489 * s;
  const y = -0.0405801784 * l + 1.1122568696 * m - 0.0716766787 * s;
  const z = -0.0763812845 * l - 0.4214819784 * m + 1.5861632204 * s;

  // Convert to linear RGB
  let r = 3.2404541621 * x - 1.5371385941 * y - 0.4985314096 * z;
  let g = -0.969266034 * x + 1.8760108454 * y + 0.0415560175 * z;
  let b = 0.0556434309 * x - 0.2040259135 * y + 1.0572251882 * z;

  // Convert to sRGB
  const toSrgb = (c: number) => {
    const clamped = Math.max(0, Math.min(1, c));
    return clamped <= 0.0031308
      ? clamped * 12.92
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  r = toSrgb(r);
  g = toSrgb(g);
  b = toSrgb(b);

  // Convert to hex
  const toHex = (c: number) => {
    const hex = Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
    return hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Get a contrasting foreground color (black or white)
 */
function getContrastingForeground(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);

  // Calculate relative luminance (WCAG formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#000000" : "#ffffff";
}

/**
 * Generate a full brand color scale from a single hex color.
 *
 * The input color becomes the 600 value (primary buttons).
 * Lighter values (50-500) are generated for backgrounds/accents.
 * Darker values (700-900) are generated for hover/pressed states.
 */
export function generateBrandColorScale(hex: string): BrandColorScale {
  // Validate hex format
  const cleanHex = hex.replace("#", "");
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    // Return a default blue scale if invalid
    return generateBrandColorScale("#2563eb");
  }

  const oklch = hexToOklch(hex);

  // Generate scale with perceptually uniform steps
  // Lighter colors: increase lightness, decrease chroma
  // Darker colors: decrease lightness, slightly adjust chroma
  return {
    50: oklchToHex({
      l: 0.97,
      c: oklch.c * 0.08,
      h: oklch.h,
    }),
    100: oklchToHex({
      l: 0.93,
      c: oklch.c * 0.15,
      h: oklch.h,
    }),
    200: oklchToHex({
      l: 0.87,
      c: oklch.c * 0.3,
      h: oklch.h,
    }),
    300: oklchToHex({
      l: 0.78,
      c: oklch.c * 0.5,
      h: oklch.h,
    }),
    400: oklchToHex({
      l: 0.68,
      c: oklch.c * 0.7,
      h: oklch.h,
    }),
    500: oklchToHex({
      l: 0.58,
      c: oklch.c * 0.9,
      h: oklch.h,
    }),
    600: hex, // Input color
    700: oklchToHex({
      l: oklch.l * 0.85,
      c: oklch.c,
      h: oklch.h,
    }),
    800: oklchToHex({
      l: oklch.l * 0.7,
      c: oklch.c * 0.95,
      h: oklch.h,
    }),
    900: oklchToHex({
      l: oklch.l * 0.5,
      c: oklch.c * 0.85,
      h: oklch.h,
    }),
    foreground: getContrastingForeground(hex),
  };
}

/**
 * Generate CSS custom properties from a color scale
 */
export function colorScaleToCssVariables(
  scale: BrandColorScale,
  prefix: string = "brand"
): Record<string, string> {
  return {
    [`--${prefix}-50`]: scale[50],
    [`--${prefix}-100`]: scale[100],
    [`--${prefix}-200`]: scale[200],
    [`--${prefix}-300`]: scale[300],
    [`--${prefix}-400`]: scale[400],
    [`--${prefix}-500`]: scale[500],
    [`--${prefix}-600`]: scale[600],
    [`--${prefix}-700`]: scale[700],
    [`--${prefix}-800`]: scale[800],
    [`--${prefix}-900`]: scale[900],
    [`--${prefix}-foreground`]: scale.foreground,
  };
}

/**
 * Validate if a string is a valid hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}
