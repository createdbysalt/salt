import type { VoiceSpectrums } from "../types";

export const VOICE_SPECTRUM_META: {
  key: keyof VoiceSpectrums;
  title: string;
  left: string;
  right: string;
  hint: string;
}[] = [
  {
    key: "formality",
    title: "Formality",
    left: "Casual",
    right: "Formal",
    hint: "Contractions vs. polished phrasing",
  },
  {
    key: "complexity",
    title: "Complexity",
    left: "Simple",
    right: "Complex",
    hint: "Plain language vs. technical depth",
  },
  {
    key: "warmth",
    title: "Warmth",
    left: "Neutral",
    right: "Warm",
    hint: "Matter-of-fact vs. personable",
  },
  {
    key: "brevity",
    title: "Length",
    left: "Detailed",
    right: "Brief",
    hint: "Expansive vs. tight and scannable",
  },
];

export function spectrumLeanLabel(
  value: number,
  left: string,
  right: string,
): string {
  if (value <= 35) return left;
  if (value >= 65) return right;
  return "Balanced";
}

export function spectrumActiveSide(
  value: number,
): "left" | "right" | "center" {
  if (value <= 35) return "left";
  if (value >= 65) return "right";
  return "center";
}

export type SpectrumPosition = "left" | "center" | "right";

/** Stored values for each discrete spectrum choice (no user-facing numbers). */
export const SPECTRUM_POSITION_VALUES: Record<SpectrumPosition, number> = {
  left: 30,
  center: 50,
  right: 70,
};

export function valueToSpectrumPosition(value: number): SpectrumPosition {
  return spectrumActiveSide(value);
}

export function spectrumPositionToValue(position: SpectrumPosition): number {
  return SPECTRUM_POSITION_VALUES[position];
}

/** Short badge label for spectrum controls (includes "Leans" when not balanced). */
export function spectrumLeanBadge(
  value: number,
  left: string,
  right: string,
): string {
  if (value <= 35) return `Leans ${left.toLowerCase()}`;
  if (value >= 65) return `Leans ${right.toLowerCase()}`;
  return "Balanced";
}
