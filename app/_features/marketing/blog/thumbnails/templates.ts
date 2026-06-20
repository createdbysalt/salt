import type { BlogThumbPalette, BlogThumbPaletteName } from "./palettes";
import { blogThumbPalettes } from "./palettes";
import { renderMotif, type BlogThumbMotifId } from "./motifs";

const W = 1600;
const H = 1000;

function grainOverlay(opacity = 0.35): string {
  return `
    <filter id="grain" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="saturate" values="0" result="mono"/>
      <feComponentTransfer in="mono" result="soft">
        <feFuncA type="linear" slope="${opacity}"/>
      </feComponentTransfer>
    </filter>
    <rect width="${W}" height="${H}" filter="url(#grain)" opacity="1"/>
  `;
}

function shell(palette: BlogThumbPalette, body: string, grain = true): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${palette.bg}"/>
    ${body}
    ${grain ? grainOverlay() : ""}
  </svg>`;
}

function dotGridPattern(palette: BlogThumbPalette): string {
  return Array.from({ length: 12 }, (_, row) =>
    Array.from({ length: 18 }, (_, col) => {
      const cx = 80 + col * 88;
      const cy = 80 + row * 78;
      return `<circle cx="${cx}" cy="${cy}" r="5" fill="${palette.accent}" opacity="0.85"/>`;
    }).join("")
  ).join("");
}

function lineGridPattern(palette: BlogThumbPalette): string {
  const vlines = Array.from({ length: 17 }, (_, i) => {
    const x = 80 + i * 90;
    return `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${palette.fg}" stroke-width="1" opacity="0.08"/>`;
  }).join("");
  const hlines = Array.from({ length: 11 }, (_, i) => {
    const y = 80 + i * 90;
    return `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${palette.fg}" stroke-width="1" opacity="0.08"/>`;
  }).join("");
  return vlines + hlines;
}

function circleFieldPattern(palette: BlogThumbPalette): string {
  return Array.from({ length: 8 }, (_, row) =>
    Array.from({ length: 14 }, (_, col) => {
      const cx = 100 + col * 105;
      const cy = 120 + row * 105;
      return `<circle cx="${cx}" cy="${cy}" r="34" fill="${palette.accent}" opacity="0.9"/>`;
    }).join("")
  ).join("");
}

export function dotGridThumb(palette: BlogThumbPalette, motifSvg: string): string {
  return shell(palette, `${dotGridPattern(palette)}${motifSvg}`);
}

export function symbolCollageThumb(palette: BlogThumbPalette, motifSvg: string): string {
  return shell(
    palette,
    `
    <rect x="120" y="120" width="1360" height="760" rx="32" fill="${palette.fg}" opacity="0.06"/>
    ${motifSvg}
  `
  );
}

export function codeWindowThumb(palette: BlogThumbPalette, motifSvg: string): string {
  return shell(
    palette,
    `
    <rect x="180" y="120" width="1240" height="760" rx="28" fill="${palette.muted}"/>
    <rect x="180" y="120" width="1240" height="72" rx="28" fill="${palette.fg}" opacity="0.08"/>
    <circle cx="240" cy="156" r="12" fill="#FF5F57"/>
    <circle cx="280" cy="156" r="12" fill="#FFBD2E"/>
    <circle cx="320" cy="156" r="12" fill="#28CA41"/>
    ${motifSvg}
  `
  );
}

export function diagonalBlocksThumb(palette: BlogThumbPalette, motifSvg: string): string {
  return shell(
    palette,
    `
    <path d="M-120 820 L980 -80 L1600 420 L520 1180 Z" fill="${palette.accent}" opacity="0.55"/>
    <path d="M200 1000 L1600 180 L1600 1000 Z" fill="${palette.fg}" opacity="0.12"/>
    ${motifSvg}
  `
  );
}

export function circleFieldThumb(palette: BlogThumbPalette, motifSvg: string): string {
  return shell(palette, `${circleFieldPattern(palette)}${motifSvg}`);
}

export function uiCollageThumb(palette: BlogThumbPalette, motifSvg: string): string {
  return shell(
    palette,
    `
    <rect x="120" y="100" width="1360" height="800" rx="32" fill="${palette.muted}" opacity="0.5"/>
    ${motifSvg}
  `
  );
}

export function neonStreakThumb(palette: BlogThumbPalette, motifSvg: string): string {
  return shell(
    palette,
    `
    <defs>
      <linearGradient id="streak" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0"/>
        <stop offset="45%" stop-color="${palette.accent}" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="${palette.muted}" stop-opacity="0.8"/>
      </linearGradient>
    </defs>
    <path d="M-200 900 L700 -100 L1100 300 L200 1100 Z" fill="url(#streak)" opacity="0.9"/>
    ${motifSvg}
  `
  );
}

export function splitCompareThumb(
  left: BlogThumbPalette,
  right: BlogThumbPalette,
  leftMotifSvg: string,
  rightMotifSvg: string
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W / 2}" height="${H}" fill="${left.bg}"/>
    <rect x="${W / 2}" width="${W / 2}" height="${H}" fill="${right.bg}"/>
    ${leftMotifSvg}
    ${rightMotifSvg}
    ${grainOverlay(0.28)}
  </svg>`;
}

export function lineGridThumb(palette: BlogThumbPalette, motifSvg: string): string {
  return shell(palette, `${lineGridPattern(palette)}${motifSvg}`);
}

export function pricingCardThumb(palette: BlogThumbPalette, motifSvg: string): string {
  return shell(
    palette,
    `
    <rect x="520" y="180" width="560" height="640" rx="32" fill="${palette.fg}" opacity="0.95"/>
    ${motifSvg}
    <circle cx="320" cy="760" r="90" fill="${palette.accent}" opacity="0.35"/>
    <circle cx="1280" cy="240" r="70" fill="${palette.accent}" opacity="0.25"/>
  `
  );
}

export type BlogThumbTemplateId =
  | "dotGrid"
  | "symbolCollage"
  | "codeWindow"
  | "diagonalBlocks"
  | "circleField"
  | "uiCollage"
  | "neonStreak"
  | "splitCompare"
  | "lineGrid"
  | "pricingCard";

export type BlogThumbSpec =
  | {
      template: Exclude<BlogThumbTemplateId, "splitCompare">;
      palette: BlogThumbPaletteName;
      motif: BlogThumbMotifId;
    }
  | {
      template: "splitCompare";
      left: BlogThumbPaletteName;
      right: BlogThumbPaletteName;
      leftMotif: BlogThumbMotifId;
      rightMotif: BlogThumbMotifId;
    };

export function renderBlogThumbSvg(spec: BlogThumbSpec): string {
  if (spec.template === "splitCompare") {
    const left = blogThumbPalettes[spec.left];
    const right = blogThumbPalettes[spec.right];
    return splitCompareThumb(
      left,
      right,
      renderMotif(spec.leftMotif, left),
      renderMotif(spec.rightMotif, right)
    );
  }

  const palette = blogThumbPalettes[spec.palette];
  const motifSvg = renderMotif(spec.motif, palette);

  switch (spec.template) {
    case "dotGrid":
      return dotGridThumb(palette, motifSvg);
    case "symbolCollage":
      return symbolCollageThumb(palette, motifSvg);
    case "codeWindow":
      return codeWindowThumb(palette, motifSvg);
    case "diagonalBlocks":
      return diagonalBlocksThumb(palette, motifSvg);
    case "circleField":
      return circleFieldThumb(palette, motifSvg);
    case "uiCollage":
      return uiCollageThumb(palette, motifSvg);
    case "neonStreak":
      return neonStreakThumb(palette, motifSvg);
    case "lineGrid":
      return lineGridThumb(palette, motifSvg);
    case "pricingCard":
      return pricingCardThumb(palette, motifSvg);
    default:
      return dotGridThumb(palette, motifSvg);
  }
}
