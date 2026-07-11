"use server";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { sendLlm } from "@/app/_lib/ai/gpt";

/**
 * Voice Correction Capture
 *
 * When users edit play drafts before approval, we analyze the changes to
 * extract voice patterns and save them as operator memory facts.
 *
 * This creates a learning loop: the more the user edits, the better Salt
 * understands their voice, and the fewer edits they need to make.
 */

export interface VoiceCorrectionInput {
  workspaceId: string;
  userId: string;
  originalDraft: string;
  editedDraft: string;
  /** Play channel for context (Gmail, Slack, etc.) */
  channel: string | null;
  /** Play run ID for provenance */
  playRunId: string;
}

export interface VoiceCorrectionResult {
  captured: boolean;
  pattern: string | null;
  confidence: number;
}

const VOICE_ANALYSIS_PROMPT = `Analyze these two versions of a draft and identify ONE specific voice/style difference that represents a user preference.

Focus on:
- Word choices (preferred vs avoided)
- Tone shifts (more formal/casual, warmer/cooler)
- Structure preferences (shorter/longer sentences, more/fewer paragraphs)
- Punctuation and formatting choices

Return a single declarative statement about the user's preference that Salt can remember.
Examples:
- "User prefers shorter paragraphs"
- "User avoids the word 'just'"
- "User prefers bullet points over prose"
- "User signs off with 'Best,' not 'Best regards,'"
- "User prefers direct openers over hedging"

If the changes are trivial, factual corrections, or not about voice/style, return exactly: NO_PATTERN

Respond with ONLY the pattern statement or NO_PATTERN, nothing else.`;

/**
 * Analyzes before/after content to extract voice patterns from user edits.
 * Significant patterns are saved as operator_memory_facts with category 'voice'.
 *
 * Called from the play edit flow when a user modifies draft_body.
 */
export async function captureVoiceCorrection(
  input: VoiceCorrectionInput,
): Promise<VoiceCorrectionResult> {
  const { workspaceId, userId, originalDraft, editedDraft, channel, playRunId } = input;

  // Skip trivial changes
  if (!originalDraft || !editedDraft) {
    return { captured: false, pattern: null, confidence: 0 };
  }

  const originalLength = originalDraft.length;
  const editedLength = editedDraft.length;
  const lengthDelta = Math.abs(editedLength - originalLength);

  // Skip if changes are too small (likely typo fixes) or too large (complete rewrite)
  if (lengthDelta < 20 || lengthDelta > originalLength * 0.8) {
    return { captured: false, pattern: null, confidence: 0 };
  }

  // Analyze the edit with LLM
  const analysis = await sendLlm(
    [
      { role: "system", content: VOICE_ANALYSIS_PROMPT },
      {
        role: "user",
        content: `ORIGINAL DRAFT:\n${originalDraft.slice(0, 1500)}\n\nEDITED VERSION:\n${editedDraft.slice(0, 1500)}`,
      },
    ],
    userId,
    { routingKey: "extraction", maxTokens: 100 },
  );

  if (!analysis || analysis.trim() === "NO_PATTERN") {
    return { captured: false, pattern: null, confidence: 0 };
  }

  const pattern = analysis.trim();

  // Check for duplicate patterns
  const admin = createAdminClient();
  const { data: existingPatterns } = await admin
    .from("operator_memory_facts")
    .select("value")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("category", "voice")
    .eq("status", "confirmed");

  const isDuplicate = existingPatterns?.some(
    (p) => p.value.toLowerCase() === pattern.toLowerCase(),
  );

  if (isDuplicate) {
    return { captured: false, pattern, confidence: 0.5 };
  }

  // Save as confirmed voice fact (user demonstrated it via their edit)
  const { error } = await admin.from("operator_memory_facts").insert({
    workspace_id: workspaceId,
    user_id: userId,
    category: "voice",
    kind: "preference",
    scope_type: "global",
    value: pattern,
    status: "confirmed",
    source: "draft_edit",
    confidence: 85,
    vote_count: 1,
    confirmed_at: new Date().toISOString(),
    provenance: {
      play_run_id: playRunId,
      channel,
      original_length: originalLength,
      edited_length: editedLength,
    },
  });

  if (error) {
    console.error("Failed to save voice correction:", error);
    return { captured: false, pattern, confidence: 0 };
  }

  return { captured: true, pattern, confidence: 0.85 };
}
