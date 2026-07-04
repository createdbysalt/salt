"use server";

import { sendLlm, type LlmChatMessage } from "@/app/_lib/ai/gpt";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import {
  buildVoiceExtractionPrompt,
  type VoiceExtractionResult,
} from "../utils/voice-extraction-prompt";

const MIN_SAMPLE_WORDS = 50;
const MIN_TOTAL_WORDS = 300;
const MAX_SAMPLES = 8;

type ExtractVoiceInput = {
  samples: string[];
};

type ExtractVoiceResult =
  | { ok: true; data: VoiceExtractionResult }
  | { ok: false; message: string };

export async function extractVoiceFromSamples(
  input: ExtractVoiceInput
): Promise<ExtractVoiceResult> {
  const { userId } = await getWorkspaceContext();

  const { samples } = input;

  if (!samples || samples.length === 0) {
    return { ok: false, message: "Please provide at least one writing sample" };
  }

  if (samples.length > MAX_SAMPLES) {
    return { ok: false, message: `Maximum ${MAX_SAMPLES} samples allowed` };
  }

  const validSamples = samples
    .map((s) => s.trim())
    .filter((s) => {
      const wordCount = s.split(/\s+/).length;
      return wordCount >= MIN_SAMPLE_WORDS;
    });

  if (validSamples.length === 0) {
    return {
      ok: false,
      message: `Each sample needs at least ${MIN_SAMPLE_WORDS} words`,
    };
  }

  const totalWords = validSamples.reduce(
    (sum, s) => sum + s.split(/\s+/).length,
    0
  );

  if (totalWords < MIN_TOTAL_WORDS) {
    return {
      ok: false,
      message: `Need at least ${MIN_TOTAL_WORDS} total words across samples (currently ${totalWords})`,
    };
  }

  const prompt = buildVoiceExtractionPrompt(validSamples);

  const messages: LlmChatMessage[] = [
    {
      role: "system",
      content: `You are a voice analysis expert. Extract writing voice characteristics and return valid JSON matching this schema:

{
  "tone": ["word1", "word2", "word3"],
  "spectrums": { "formality": 0-100, "complexity": 0-100, "warmth": 0-100, "brevity": 0-100 },
  "styleNotes": "2-3 sentences",
  "terminology": { "preferred": ["word/phrase"], "avoid": ["word/phrase"] },
  "confidence": 0.0-1.0,
  "summary": "One sentence voice description"
}

Return ONLY valid JSON, no markdown, no explanation.`,
    },
    { role: "user", content: prompt },
  ];

  const response = await sendLlm(messages, userId, {
    routingKey: "extraction",
    maxTokens: 1000,
    temperature: 0.3,
  });

  if (!response) {
    return { ok: false, message: "Failed to analyze samples. Please try again." };
  }

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { ok: false, message: "Invalid response format" };
    }

    const parsed = JSON.parse(jsonMatch[0]) as VoiceExtractionResult;

    if (
      !parsed.tone ||
      !Array.isArray(parsed.tone) ||
      !parsed.spectrums ||
      typeof parsed.spectrums.formality !== "number"
    ) {
      return { ok: false, message: "Incomplete extraction result" };
    }

    const normalized: VoiceExtractionResult = {
      tone: parsed.tone.slice(0, 5).map((t) => String(t).toLowerCase()),
      spectrums: {
        formality: clamp(parsed.spectrums.formality, 0, 100),
        complexity: clamp(parsed.spectrums.complexity, 0, 100),
        warmth: clamp(parsed.spectrums.warmth, 0, 100),
        brevity: clamp(parsed.spectrums.brevity, 0, 100),
      },
      styleNotes: String(parsed.styleNotes || "").slice(0, 500),
      terminology: {
        preferred: (parsed.terminology?.preferred || []).slice(0, 20).map(String),
        avoid: (parsed.terminology?.avoid || []).slice(0, 20).map(String),
      },
      confidence: clamp(parsed.confidence || 0.5, 0, 1),
      summary: String(parsed.summary || "").slice(0, 200),
    };

    return { ok: true, data: normalized };
  } catch {
    return { ok: false, message: "Failed to parse extraction result" };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
