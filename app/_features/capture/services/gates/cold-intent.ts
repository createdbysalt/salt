import "server-only";

/**
 * Cold-inbound intent read (Sources plan, Lane 1 discriminator).
 *
 * The one email that proves Salt's magic — "are you free June 14?" from a
 * stranger — has zero relationship signals by definition: no prior thread,
 * no calendar, no payment. Under the Memory-first hold policy it would sit
 * in the held pool until a discovery cron runs. This paid read is how a
 * genuine inquiry earns REAL-TIME admission instead.
 *
 * Cost posture (interview rulings):
 * - Free shape test first: this only runs on pre-ingest SURVIVORS — mail
 *   that already passed the noreply/newsletter/bulk-header checks and the
 *   workspace blocklist. The paid read never sees obvious noise.
 * - One short call (subject + snippet, ~200 tokens) on the cheap model tier.
 * - `sendLlm` gates (canSpend) and meters itself; spend is background-origin
 *   so an over-budget workspace defers the read (mail is held, exactly as it
 *   would be without this feature) rather than failing anything.
 * - Real-time paths only: backfills never pay for intent — historical mail
 *   is not urgent. The held backlog gets the same cheap read in batch via
 *   Sync & Scan (services/held-intent-discovery.ts), never on a cron.
 *
 * Fail-neutral contract: any failure (no key, refused spend, timeout,
 * garbage output) returns checked=false and the pipeline holds the mail
 * exactly as before. The read can only ever ADD admission, never block it.
 */

import { sendLlm, backgroundSpend } from "@/app/_lib/ai";
import type { ColdIntentResult } from "../../types/gate-result";

/** Admission requires genuineInquiry AND confidence at or above this. */
export const COLD_INTENT_ADMIT_CONFIDENCE = 0.6;

const NOT_CHECKED: ColdIntentResult = {
  checked: false,
  genuineInquiry: false,
  confidence: 0,
  reason: "Intent read skipped",
};

const SYSTEM_PROMPT = `You judge first-time emails received by a solo creative or service professional (photographer, designer, coach, consultant).

Given the sender and the email's subject and preview text, decide whether it is a GENUINE BUSINESS INQUIRY — a real person reaching out about booking, hiring, pricing, availability, a referral, or working together — as opposed to a newsletter, product promotion, vendor/SaaS notification, receipt, mass outreach, recruiting spam, or automated message.

Respond with ONLY a JSON object, no other text:
{"genuine_inquiry": true|false, "confidence": 0.0-1.0, "reason": "<one short sentence>"}

Be conservative with confidence when the preview is thin. Mass-personalized sales outreach ("I noticed your website...") is NOT a genuine inquiry.`;

export interface ColdIntentInput {
  workspaceId: string;
  senderEmail: string | null;
  senderName: string | null;
  subject: string | null;
  snippet: string | null;
  /**
   * Track A (Phase M4): fenced block of the workspace's active Memory
   * customizations (person/work). Loaded by the caller only on this paid
   * path; appended to the system prompt so owner instructions steer the
   * read. Metering is unchanged — the block rides the same sendLlm call.
   */
  customizeContext?: string | null;
}

function parseIntentResponse(raw: string): ColdIntentResult | null {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    if (typeof parsed.genuine_inquiry !== "boolean") return null;
    const confidence =
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0;
    return {
      checked: true,
      genuineInquiry: parsed.genuine_inquiry,
      confidence,
      reason:
        typeof parsed.reason === "string" && parsed.reason.length > 0
          ? parsed.reason.slice(0, 300)
          : "No reason given",
    };
  } catch {
    return null;
  }
}

export async function classifyColdInboundIntent(
  input: ColdIntentInput,
): Promise<ColdIntentResult> {
  const subject = input.subject?.trim() ?? "";
  const snippet = input.snippet?.trim() ?? "";

  // Nothing to judge — never pay to classify an empty message.
  if (!subject && !snippet) {
    return { ...NOT_CHECKED, reason: "No subject or preview to classify" };
  }

  const sender = [input.senderName, input.senderEmail]
    .filter(Boolean)
    .join(" — ");

  try {
    const systemPrompt = input.customizeContext
      ? `${SYSTEM_PROMPT}\n\n${input.customizeContext}`
      : SYSTEM_PROMPT;

    const raw = await sendLlm(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            sender ? `From: ${sender}` : null,
            subject ? `Subject: ${subject}` : null,
            snippet ? `Preview: ${snippet.slice(0, 800)}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      backgroundSpend(input.workspaceId),
      { routingKey: "coldIntent", maxTokens: 150, temperature: 0 },
    );

    if (!raw) {
      // Spend refused / no key — sendLlm's null contract. Hold as usual.
      return { ...NOT_CHECKED, reason: "Intent read unavailable" };
    }

    const parsed = parseIntentResponse(raw);
    if (!parsed) {
      return { ...NOT_CHECKED, reason: "Unparseable intent response" };
    }
    return parsed;
  } catch (error) {
    console.error(
      "[cold-intent] classify failed for workspace %s:",
      input.workspaceId,
      error instanceof Error ? error.message : error,
    );
    return { ...NOT_CHECKED, reason: "Intent read failed" };
  }
}

/** The admission decision, kept next to the threshold it depends on. */
export function intentEarnsAdmission(result: ColdIntentResult): boolean {
  return (
    result.checked &&
    result.genuineInquiry &&
    result.confidence >= COLD_INTENT_ADMIT_CONFIDENCE
  );
}
