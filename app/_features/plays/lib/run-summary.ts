import "server-only";

import { sendLlm, committedSpend } from "@/app/_lib/ai/gpt";

/**
 * AI-generated run summary — the modal header paragraph ("what this play is")
 * for a playbook run. Replaces the old behavior of showing the first 200
 * characters of the draft, which read as a copy-paste of the artifact.
 *
 * One cheap call per run (playRunSummary routing slot, token-bounded). The
 * caller falls back to the playbook description when this returns null —
 * summaries are advisory, never worth failing a run over.
 */

export interface RunSummaryInput {
  workspaceId: string;
  userId: string;
  playbookName: string;
  /** Signal that fired the run ("Payment received in Stripe"). */
  triggerLabel?: string | null;
  /** Entity the run is about ("Meridian Studio"). */
  targetLabel?: string | null;
  /** Display channel a draft will be sent through ("Gmail"). */
  channel?: string | null;
  /** Evidence labels in execution order (what Salt checked/read). */
  evidenceLabels: readonly string[];
  /** First ~300 chars of the drafted artifact, when one exists. */
  draftExcerpt?: string | null;
}

const MAX_SUMMARY_LENGTH = 280;

function sanitizeSummary(raw: string): string {
  let text = raw.replace(/\s*\n+\s*/g, " ").trim();
  // Models sometimes wrap the whole answer in quotes.
  if (text.length > 1 && text.startsWith('"') && text.endsWith('"')) {
    text = text.slice(1, -1).trim();
  }
  if (text.length > MAX_SUMMARY_LENGTH) {
    text = `${text.slice(0, MAX_SUMMARY_LENGTH - 1).trimEnd()}…`;
  }
  return text;
}

export async function generateRunSummary(
  input: RunSummaryInput,
): Promise<string | null> {
  const facts: string[] = [`Playbook: ${input.playbookName}`];
  if (input.triggerLabel) facts.push(`Trigger: ${input.triggerLabel}`);
  if (input.targetLabel) facts.push(`About: ${input.targetLabel}`);
  if (input.channel) facts.push(`Delivery channel: ${input.channel}`);
  if (input.evidenceLabels.length > 0) {
    facts.push(`What Salt checked: ${input.evidenceLabels.join("; ")}`);
  }
  if (input.draftExcerpt) {
    facts.push(`Draft prepared (excerpt): ${input.draftExcerpt.slice(0, 300)}`);
  }

  try {
    const result = await sendLlm(
      [
        {
          role: "system",
          content:
            "You write one-sentence summaries of automated business plays for the business owner. " +
            "Summarize what happened and what Salt prepared — concrete, specific (names, amounts, apps), no filler, no preamble. " +
            "Never quote the draft at length; describe it.",
        },
        {
          role: "user",
          content: `Summarize this play run in one sentence (max ~30 words).\n\n${facts.join("\n")}`,
        },
      ],
      // Inside an approved playbook run: degrade, never abandon (same
      // reasoning as draft steps).
      committedSpend(input.workspaceId, input.userId),
      {
        routingKey: "playRunSummary",
        maxTokens: 120,
        temperature: 0.4,
      },
    );

    if (!result?.trim()) return null;
    return sanitizeSummary(result);
  } catch {
    return null;
  }
}
