import type { VoiceSpectrums, VoiceTerminology } from "../types";

export type VoiceExtractionResult = {
  tone: string[];
  spectrums: VoiceSpectrums;
  styleNotes: string;
  terminology: VoiceTerminology;
  confidence: number;
  summary: string;
};

export const VOICE_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    tone: {
      type: "array",
      items: { type: "string" },
      description: "3-5 single-word tone descriptors (e.g., 'direct', 'warm', 'witty')",
    },
    spectrums: {
      type: "object",
      properties: {
        formality: { type: "number", minimum: 0, maximum: 100 },
        complexity: { type: "number", minimum: 0, maximum: 100 },
        warmth: { type: "number", minimum: 0, maximum: 100 },
        brevity: { type: "number", minimum: 0, maximum: 100 },
      },
      required: ["formality", "complexity", "warmth", "brevity"],
    },
    styleNotes: {
      type: "string",
      description: "2-3 sentence style guide capturing unique writing patterns",
    },
    terminology: {
      type: "object",
      properties: {
        preferred: {
          type: "array",
          items: { type: "string" },
          description: "Words or phrases used frequently",
        },
        avoid: {
          type: "array",
          items: { type: "string" },
          description: "Words or phrases never used or actively avoided",
        },
      },
      required: ["preferred", "avoid"],
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description: "Confidence in extraction (0-1), based on sample quality and consistency",
    },
    summary: {
      type: "string",
      description: "One sentence summary of the voice for the user to confirm",
    },
  },
  required: ["tone", "spectrums", "styleNotes", "terminology", "confidence", "summary"],
} as const;

export function buildVoiceExtractionPrompt(samples: string[]): string {
  const samplesText = samples
    .map((s, i) => `--- Sample ${i + 1} ---\n${s.trim()}`)
    .join("\n\n");

  return `Analyze these writing samples to extract the author's voice characteristics.

${samplesText}

---

Extract the voice profile by analyzing:

1. **Tone** (3-5 single words): What emotional/attitudinal qualities come through?
   - Examples: direct, warm, witty, confident, casual, curious, empathetic

2. **Spectrums** (0-100 scales):
   - Formality: 0=very casual (contractions, slang) → 100=very formal (no contractions, polished)
   - Complexity: 0=simple (short sentences, basic vocab) → 100=complex (technical, layered)
   - Warmth: 0=neutral/objective → 100=warm/personable
   - Brevity: 0=detailed/thorough → 100=concise/punchy

3. **Style Notes**: 2-3 sentences capturing unique patterns:
   - Sentence rhythm (short punchy? long flowing?)
   - Opening patterns (how do they start messages?)
   - Transition style (smooth? abrupt?)
   - Opinion expression (hedging? direct?)
   - Any verbal tics or signature phrases

4. **Terminology**:
   - Preferred: Words/phrases they use often
   - Avoid: Words/phrases they never use (corporate jargon they skip, formal phrases they avoid)

5. **Confidence**: How confident are you in this extraction?
   - Consider: sample consistency, sample length, sample variety
   - Lower if samples contradict each other or are too short

6. **Summary**: One sentence describing this voice for user confirmation.

Focus on what makes this voice HUMAN and DISTINCTIVE, not generic AI patterns.`;
}
