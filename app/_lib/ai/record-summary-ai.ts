/**
 * AI Record Narrative
 *
 * Generates the Memory Overview "Summary" and "Worth attention" lines for a
 * People / Org / Work record from signals Salt already holds.
 *
 * This is the AI layer that sits ON TOP of the deterministic builders in
 * `app/_features/memory/utils/record-summary.ts`. It returns `null` whenever it
 * cannot produce a trustworthy result (no API key, request failure, unparseable
 * output, or empty content) so callers fall back to the deterministic copy.
 *
 * Usage:
 *   const narrative = await generateRecordNarrative({ ... });
 *   const summary = narrative?.summary ?? buildPersonSummary(...);
 */

import "server-only";

import { sendLlm, type LlmSpendContext } from "./gpt";
import {
  buildUntrustedContentSystemPrompt,
  wrapUntrustedUserContent,
} from "./safety";

export type RecordKind = "person" | "org" | "work";

export interface RecordNarrativeInput {
  kind: RecordKind;
  /** Display name of the record (e.g. person/org/work title). */
  name: string;
  /**
   * Grounded, system-derived facts the narrative may use (e.g.
   * "Relationship: client", "2 active projects", "$1.2k outstanding").
   * These are trusted — assembled by Salt, not free user text.
   */
  facts: string[];
  /**
   * Optional free-form context (notes, recent message snippets). Treated as
   * UNTRUSTED data and wrapped accordingly — never as instructions.
   */
  untrustedContext?: string | null;
  /** Who the model spend is attributed to, for provider and ledger both. */
  spend: LlmSpendContext;
}

export interface RecordNarrative {
  summary: string;
  worthAttention: {
    reason: string;
    suggestedPlay: string;
  };
}

const KIND_NOUN: Record<RecordKind, string> = {
  person: "person/contact",
  org: "organization",
  work: "project or piece of work",
};

const TASK_PROMPT = `You are Salt, a proactive operating layer for a solo creative or service professional. Write a tight, factual snapshot of one CRM record for its owner.

Voice: plain, direct, calm, second person ("your client"). No hype, no filler, no emojis, no exclamation marks.

Produce two things, grounded ONLY in the facts provided (never invent numbers, dates, names, or events):
1. "summary": 1-2 sentences describing who/what this is and its current state.
2. "worthAttention": the single most important thing the owner should know or do right now.
   - "reason": one short sentence. If nothing is notable, say so plainly (e.g. "Nothing needs your attention right now.").
   - "suggestedPlay": a brief next action (max ~6 words), or "" if none.

Output ONLY valid JSON, no markdown fences:
{"summary": "...", "worthAttention": {"reason": "...", "suggestedPlay": "..."}}`;

const SYSTEM_PROMPT = buildUntrustedContentSystemPrompt(TASK_PROMPT);

interface ParsedNarrative {
  summary?: unknown;
  worthAttention?: {
    reason?: unknown;
    suggestedPlay?: unknown;
  };
}

function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  }
  return trimmed;
}

function parseNarrative(raw: string): RecordNarrative | null {
  let parsed: ParsedNarrative;
  try {
    parsed = JSON.parse(stripJsonFences(raw)) as ParsedNarrative;
  } catch {
    return null;
  }

  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  const reason =
    typeof parsed.worthAttention?.reason === "string"
      ? parsed.worthAttention.reason.trim()
      : "";
  const suggestedPlay =
    typeof parsed.worthAttention?.suggestedPlay === "string"
      ? parsed.worthAttention.suggestedPlay.trim()
      : "";

  // A usable narrative needs at least a summary and a worth-attention reason.
  if (!summary || !reason) return null;

  return { summary, worthAttention: { reason, suggestedPlay } };
}

/**
 * Generate the AI narrative for a record. Returns `null` when the model is
 * unavailable or returns unusable output — callers must fall back to the
 * deterministic builder in that case.
 */
export async function generateRecordNarrative(
  input: RecordNarrativeInput,
): Promise<RecordNarrative | null> {
  const facts = input.facts.map((f) => f.trim()).filter(Boolean);
  if (facts.length === 0 && !input.untrustedContext?.trim()) {
    // No substrate to ground a narrative — let the caller use the deterministic nudge.
    return null;
  }

  const sections = [
    `Record type: ${KIND_NOUN[input.kind]}`,
    `Name: ${input.name}`,
    "",
    "Known facts:",
    ...facts.map((f) => `- ${f}`),
  ];

  if (input.untrustedContext?.trim()) {
    sections.push(
      "",
      wrapUntrustedUserContent("RECORD_NOTES", input.untrustedContext.trim()),
    );
  }

  const answer = await sendLlm(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: sections.join("\n") },
    ],
    input.spend,
    { routingKey: "recordSummary", temperature: 0.3, maxTokens: 280 },
  );

  if (!answer) return null;

  return parseNarrative(answer);
}
