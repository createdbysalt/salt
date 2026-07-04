import type {
  VoiceSpectrums,
  VoiceTerminology,
  WorkspaceVoice,
  OperatorVoiceProfile,
} from "../types";

export type EffectiveVoice = {
  spectrums: VoiceSpectrums;
  tone: string[];
  styleGuide: string;
  terminology: VoiceTerminology;
  archetype: string | null;
  source: {
    spectrums: "personal" | "workspace" | "default";
    tone: "merged" | "personal" | "workspace";
    styleGuide: "merged" | "personal" | "workspace";
  };
};

const DEFAULT_SPECTRUMS: VoiceSpectrums = {
  formality: 50,
  complexity: 50,
  warmth: 50,
  brevity: 50,
};

/**
 * Merges workspace and personal voice settings into an effective voice.
 *
 * Merge strategy:
 * - Spectrums: personal wins if set, else workspace, else defaults
 * - Tone: union of workspace + personal (personal extends workspace)
 * - Style guide: concatenate workspace + personal (personal appends)
 * - Terminology: union for both preferred and avoid lists
 * - Archetype: personal wins if set
 */
export function mergeVoice(
  workspace: WorkspaceVoice | null,
  personal: OperatorVoiceProfile | null
): EffectiveVoice {
  const ws = workspace ?? {
    voiceTone: [],
    voiceSpectrums: null,
    voiceArchetype: null,
    voiceStyleGuide: null,
    voiceTerminology: { preferred: [], avoid: [] },
  };

  const ps = personal ?? {
    voiceTone: [],
    voiceSpectrums: null,
    voiceArchetype: null,
    voiceStyleGuide: null,
    voiceTerminology: { preferred: [], avoid: [] },
    learnedStyle: null,
    inheritsWorkspace: true,
  };

  // Spectrums: personal > workspace > defaults
  let spectrums: VoiceSpectrums;
  let spectrumsSource: "personal" | "workspace" | "default";

  if (ps.voiceSpectrums) {
    spectrums = ps.voiceSpectrums;
    spectrumsSource = "personal";
  } else if (ws.voiceSpectrums) {
    spectrums = ws.voiceSpectrums;
    spectrumsSource = "workspace";
  } else {
    spectrums = DEFAULT_SPECTRUMS;
    spectrumsSource = "default";
  }

  // Tone: union (deduplicated)
  const wsTone = ws.voiceTone ?? [];
  const psTone = ps.voiceTone ?? [];
  const tone = [...new Set([...wsTone, ...psTone])];
  const toneSource = psTone.length > 0 && wsTone.length > 0
    ? "merged"
    : psTone.length > 0
    ? "personal"
    : "workspace";

  // Style guide: concatenate with separator
  const wsGuide = ws.voiceStyleGuide?.trim() ?? "";
  const psGuide = ps.voiceStyleGuide?.trim() ?? "";
  const styleGuide = [wsGuide, psGuide].filter(Boolean).join("\n\n");
  const styleGuideSource = psGuide && wsGuide
    ? "merged"
    : psGuide
    ? "personal"
    : "workspace";

  // Terminology: union both lists
  const terminology: VoiceTerminology = {
    preferred: [
      ...new Set([
        ...(ws.voiceTerminology?.preferred ?? []),
        ...(ps.voiceTerminology?.preferred ?? []),
      ]),
    ],
    avoid: [
      ...new Set([
        ...(ws.voiceTerminology?.avoid ?? []),
        ...(ps.voiceTerminology?.avoid ?? []),
      ]),
    ],
  };

  // Archetype: personal wins
  const archetype = ps.voiceArchetype ?? ws.voiceArchetype ?? null;

  return {
    spectrums,
    tone,
    styleGuide,
    terminology,
    archetype,
    source: {
      spectrums: spectrumsSource,
      tone: toneSource,
      styleGuide: styleGuideSource,
    },
  };
}

/**
 * Converts an EffectiveVoice to a prompt-ready string for AI generation.
 */
export function voiceToPrompt(voice: EffectiveVoice): string {
  const parts: string[] = [];

  // Tone descriptors
  if (voice.tone.length > 0) {
    parts.push(`Tone: ${voice.tone.join(", ")}.`);
  }

  // Spectrum guidance
  const { spectrums } = voice;
  const spectrumDescriptions: string[] = [];

  if (spectrums.formality < 40) {
    spectrumDescriptions.push("casual and conversational");
  } else if (spectrums.formality > 60) {
    spectrumDescriptions.push("professional and polished");
  }

  if (spectrums.complexity < 40) {
    spectrumDescriptions.push("simple and accessible");
  } else if (spectrums.complexity > 60) {
    spectrumDescriptions.push("detailed and technical");
  }

  if (spectrums.warmth > 60) {
    spectrumDescriptions.push("warm and personable");
  } else if (spectrums.warmth < 40) {
    spectrumDescriptions.push("neutral and objective");
  }

  if (spectrums.brevity > 60) {
    spectrumDescriptions.push("concise and to the point");
  } else if (spectrums.brevity < 40) {
    spectrumDescriptions.push("thorough and explanatory");
  }

  if (spectrumDescriptions.length > 0) {
    parts.push(`Writing style: ${spectrumDescriptions.join(", ")}.`);
  }

  // Style guide (explicit instructions)
  if (voice.styleGuide) {
    parts.push(voice.styleGuide);
  }

  // Terminology
  if (voice.terminology.preferred.length > 0) {
    parts.push(`Prefer these words/phrases: ${voice.terminology.preferred.join(", ")}.`);
  }

  if (voice.terminology.avoid.length > 0) {
    parts.push(`Avoid these words/phrases: ${voice.terminology.avoid.join(", ")}.`);
  }

  return parts.join("\n\n");
}
