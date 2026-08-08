/**
 * Play headline + evidence — the glance layer of the play card.
 *
 * Spec: .cursor/plans/2026-08-08-play-card-interaction-model.md
 *
 * The headline names THE MOMENT, not the artifact
 * ("Kickoff with Meridian Studio at 2pm — brief is ready").
 * The evidence list lives in the detail popup and must be honest about
 * thinness: a brief built from one calendar event says so.
 */

import type { PlaybookOutputType } from "../playbooks/schema/v2/types";

export interface PlayEvidenceItem {
  /**
   * First-person sentence describing what Salt took from this source:
   * "Saw the 2:00 PM kickoff on your calendar", "Noticed invoice #1042
   * is still open". Reads as Salt walking you through its process.
   */
  label: string;
  /** Deep link to the source in the external app, when known */
  url?: string | null;
  /** Named app for external links: "Gmail", "Stripe", ... */
  appLabel?: string | null;
  /** Connector catalog id for the source app glyph (e.g. "google-calendar"). */
  appId?: string | null;
}

export interface PlayEvidence {
  items: PlayEvidenceItem[];
  /** True when Salt had little to work with — the popup must admit it. */
  thin: boolean;
  /** Human sentence for thin evidence: "Only found the calendar event." */
  thinNote: string | null;
}

/** Human sentence per output type: "Your brief is ready for {target}". */
const HEADLINE_TEMPLATE: Partial<
  Record<PlaybookOutputType, (target: string) => string>
> = {
  briefing: (t) => `Your brief is ready for ${t}`,
  email_draft: (t) => `Your draft is ready for ${t}`,
  memory_update: (t) => `A memory update is ready for ${t}`,
  notification: (t) => `${t} needs a look`,
  finding: (t) => `${t} needs a look`,
};

/**
 * Undo honesty, per play type. Shown above the modal footer so the approve
 * click is an informed one: irreversible actions say so plainly, reversible
 * ones say how.
 */
const REVERSIBILITY_NOTE: Partial<Record<PlaybookOutputType, string>> = {
  email_draft:
    "Once sent, this can't be unsent — you can edit the draft above first.",
  briefing:
    "This only saves to your workspace — nothing leaves Salt until you share it.",
  memory_update: "Salt can reverse this afterwards — just ask.",
  notification: "Approving just marks this handled — nothing is sent.",
  finding: "Approving just marks this handled — nothing is sent.",
};

export function reversibilityNote(
  outputType: PlaybookOutputType | null | undefined,
  kind?: string | null,
): string | null {
  if (kind === "question") {
    return "Answering teaches Salt — it updates what Salt remembers, nothing is sent.";
  }
  return (outputType && REVERSIBILITY_NOTE[outputType]) ?? null;
}

/** Em-dashes read as AI-written; commas read as human. */
function humanizeMoment(target: string): string {
  return target.replace(/\s+[—–]\s+/g, ", ").trim();
}

/**
 * Moment-first headline in a human voice. Prefers a playbook-authored
 * headline, then composes "Your brief is ready for X", then falls back to
 * the run title. Never invents a moment.
 */
export function buildPlayHeadline(input: {
  headline?: string | null;
  subject: string;
  targetLabel?: string | null;
  outputType?: PlaybookOutputType | null;
}): string {
  const authored = input.headline?.trim();
  if (authored) return authored;

  const target = input.targetLabel?.trim();
  const template = input.outputType ? HEADLINE_TEMPLATE[input.outputType] : undefined;
  if (target && template) return template(humanizeMoment(target));

  return input.subject;
}

/** Minimum evidence before Salt's work is presented as well-sourced. */
const THIN_THRESHOLD = 2;

/**
 * Build the honest evidence list for the detail popup. `thin` when fewer
 * than THIN_THRESHOLD independent sources informed the play.
 */
export function summarizeEvidence(input: {
  triggerLabel?: string | null;
  sourceUrl?: string | null;
  sourceAppLabel?: string | null;
  confidenceExplanation?: string | null;
  extra?: PlayEvidenceItem[];
  /**
   * Executor-written reasoning chain (metadata.evidence): one first-person
   * sentence per input Salt considered, newest source first. When present,
   * these replace the trigger/source fallback — they're the real walkthrough.
   */
  entries?: PlayEvidenceItem[];
}): PlayEvidence {
  const items: PlayEvidenceItem[] = [];

  if (input.entries?.length) {
    for (const entry of input.entries) {
      if (entry.label.trim()) items.push(entry);
    }
  } else {
    if (input.triggerLabel?.trim()) {
      items.push({ label: input.triggerLabel.trim() });
    }
    for (const item of input.extra ?? []) {
      if (item.label.trim()) items.push(item);
    }
    if (input.sourceUrl?.trim()) {
      items.push({
        label: input.sourceAppLabel?.trim()
          ? `Source in ${input.sourceAppLabel.trim()}`
          : "View source",
        url: input.sourceUrl.trim(),
        appLabel: input.sourceAppLabel?.trim() ?? null,
      });
    }
  }

  const thin = items.length < THIN_THRESHOLD;
  const thinNote = thin
    ? items.length === 0
      ? "Salt had no connected sources for this — review before approving."
      : `This is all Salt found — worth a closer look before approving.`
    : null;

  return { items, thin, thinNote };
}
