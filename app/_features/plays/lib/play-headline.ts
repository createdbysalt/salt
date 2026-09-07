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
import { draftAddresseeLabel, looksLikeRecordCode } from "./draft-preview";
import {
  attachEvidenceSourceLinks,
  type EvidenceLinkContext,
} from "./evidence-source-links";

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
  /** Source pages this row can open (Memory record, Stripe invoice, …). */
  links?: Array<{ href: string; label: string; external: boolean }>;
}

export interface PlayEvidence {
  items: PlayEvidenceItem[];
  /** True when Salt had little to work with — the popup must admit it. */
  thin: boolean;
  /** Human sentence for thin evidence: "Only found the calendar event." */
  thinNote: string | null;
}

/** Last-resort sentence when we only have a target, not the moment. */
const HEADLINE_TEMPLATE: Partial<
  Record<PlaybookOutputType, (target: string) => string>
> = {
  briefing: (t) => `Brief ready for ${t}`,
  email_draft: (t) => `Email for ${t}`,
  memory_update: (t) => `Memory update for ${t}`,
  notification: (t) => `${t} needs a look`,
  finding: (t) => `${t} needs a look`,
};

/** Persisted artifact-first lines we should rewrite at display time. */
const GENERIC_HEADLINE =
  /^(Your draft is ready for|Your brief is ready for|A memory update is ready for|Brief ready for|Email for|Memory update for)\s+/i;

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

export interface PlayGlanceInput {
  headline?: string | null;
  subject: string;
  targetLabel?: string | null;
  recipientLabel?: string | null;
  draftText?: string | null;
  playbookSlug?: string | null;
  playbookName?: string | null;
  outputType?: PlaybookOutputType | null;
  triggerLabel?: string | null;
  preview?: string | null;
  valueEstimate?: string | null;
  evidenceLabels?: string[] | null;
}

/**
 * Card-face glance: one moment headline, plus a supporting line that does
 * not repeat it. Someone with no context should know who, what, and why
 * this is in the queue.
 */
export function buildPlayGlance(input: PlayGlanceInput): {
  headline: string;
  detail: string | null;
} {
  const headline = buildPlayHeadline(input);
  return { headline, detail: buildPlayGlanceDetail(input, headline) };
}

/**
 * Moment-first headline in a human voice. Prefers a playbook-authored
 * headline, then who + what (Frank hasn't paid INV-2026-1589), then a
 * short fallback. Never invents a moment.
 */
export function buildPlayHeadline(input: PlayGlanceInput): string {
  const authored = input.headline?.trim();
  if (authored && !GENERIC_HEADLINE.test(authored)) return authored;

  const composed = composeMomentHeadline(input);
  if (composed) return composed;

  const target = input.targetLabel?.trim();
  const template = input.outputType ? HEADLINE_TEMPLATE[input.outputType] : undefined;
  if (target && template && !looksLikeRecordCode(target)) {
    return template(humanizeMoment(target));
  }

  if (authored) {
    const rewritten = rewriteGenericHeadline(authored, input);
    if (rewritten) return rewritten;
  }

  return input.subject;
}

function playbookKey(slug?: string | null, name?: string | null): string {
  if (slug?.trim()) return slug.trim();
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, "-");
}

function extractRecordCode(
  ...parts: Array<string | null | undefined>
): string | null {
  for (const part of parts) {
    if (!part) continue;
    const trimmed = part.trim();
    if (looksLikeRecordCode(trimmed)) return trimmed;
    const match =
      trimmed.match(/\b(?:INV|WO)[-_][A-Z0-9-]+\b/i) ??
      trimmed.match(/\b[A-Z]{2,5}-\d{2,}\b/);
    if (match) return match[0];
  }
  return null;
}

function headlineForPlaybook(key: string, person: string): string | null {
  switch (key) {
    case "follow-up":
      return `Follow up with ${person}`;
    case "payment-received":
      return `Thank ${person}`;
    case "meeting-recap":
      return `Recap for ${person}`;
    case "meeting-prep":
      return `Brief ready for ${person}`;
    case "contract-renewal-alert":
      return `${person}'s contract is up for renewal`;
    case "upsell-opportunity":
      return `Proposal for ${person}`;
    default:
      return null;
  }
}

function isInvoicePlay(
  key: string,
  record: string | null,
  target?: string | null,
  recipient?: string | null
): boolean {
  if (key === "invoice-reminder" || key.includes("invoice")) return true;
  if (!record) return false;
  return looksLikeRecordCode(target ?? "") || looksLikeRecordCode(recipient ?? "");
}

function composeMomentHeadline(input: PlayGlanceInput): string | null {
  const person = draftAddresseeLabel({
    recipientLabel: input.recipientLabel ?? input.targetLabel,
    draftText: input.draftText,
  });
  const record = extractRecordCode(
    input.targetLabel,
    input.headline,
    input.subject,
    input.recipientLabel
  );
  const key = playbookKey(input.playbookSlug, input.playbookName);

  if (isInvoicePlay(key, record, input.targetLabel, input.recipientLabel)) {
    if (person && record) return `${person} hasn't paid ${record}`;
    if (record) return `${record} is overdue`;
    if (person) return `${person} has an overdue invoice`;
  }

  if (person) {
    const fromPlaybook = headlineForPlaybook(key, person);
    if (fromPlaybook) return fromPlaybook;
    if (input.outputType === "email_draft") return `Email for ${person}`;
  }

  return null;
}

function rewriteGenericHeadline(
  authored: string,
  input: PlayGlanceInput
): string | null {
  const remainder = authored.replace(GENERIC_HEADLINE, "").trim();
  if (!remainder) return null;
  return composeMomentHeadline({
    ...input,
    headline: null,
    targetLabel: input.targetLabel ?? remainder,
    recipientLabel: input.recipientLabel ?? remainder,
  });
}

function includedIn(headline: string, extra: string): boolean {
  return headline.toLowerCase().includes(extra.toLowerCase());
}

function firstName(person: string): string {
  return person.split(/\s+/)[0] ?? person;
}

function extractMoney(text: string): string | null {
  const match = text.match(/\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/);
  if (!match) return null;
  return match[0].replace(/\.00$/, "");
}

function extractOverdueAge(text: string): string | null {
  const match = text.match(/(\d+)\s+days?\s+(?:overdue|past due)/i);
  if (!match) return null;
  return match[1] === "1" ? "1 day overdue" : `${match[1]} days overdue`;
}

function usefulEvidence(labels: string[] | null | undefined): string | null {
  for (const label of labels ?? []) {
    const text = label.trim();
    if (!text || /^[a-z0-9_]+$/.test(text)) continue;
    if (/^Read .+ from Memory/i.test(text)) continue;
    if (/^Classified /i.test(text)) continue;
    if (/^Ran /i.test(text)) continue;
    if (/^Waiting for approval/i.test(text)) continue;
    if (/^Paused/i.test(text)) continue;
    if (text.length > 72) continue;
    return text;
  }
  return null;
}

function glanceKnew(
  input: PlayGlanceInput,
  headline: string,
  invoice: boolean
): string | null {
  const draft = input.draftText ?? "";
  const money = extractMoney(draft);
  const age = extractOverdueAge(draft);
  if (invoice) {
    if (money && age) return `${money}, ${age}`;
    if (money) return `${money} still open`;
    if (age) return age;
  }

  const evidence = usefulEvidence(input.evidenceLabels);
  if (evidence && !includedIn(headline, evidence)) return evidence;

  const trigger = input.triggerLabel?.trim();
  if (trigger && !/^[a-z0-9_]+$/.test(trigger) && !includedIn(headline, trigger)) {
    return trigger;
  }

  if (invoice) return "Still unpaid";
  return null;
}

function glancePrepared(
  input: PlayGlanceInput,
  person: string | null,
  key: string
): string | null {
  const who = person ? firstName(person) : null;
  if (key === "invoice-reminder" || key.includes("invoice")) {
    return who ? `Drafted ${who} a reminder` : "Drafted a reminder";
  }
  switch (key) {
    case "follow-up":
      return who ? `Drafted ${who} a check-in` : "Drafted a check-in";
    case "payment-received":
      return who ? `Drafted ${who} a thank-you` : "Drafted a thank-you";
    case "meeting-prep":
      return "Wrote the brief";
    case "meeting-recap":
      return "Wrote the recap";
    default:
      if (input.outputType === "email_draft") {
        return who ? `Drafted ${who} an email` : "Drafted the email";
      }
      return null;
  }
}

/** Two-beat pitch: what Salt knows, then what it prepared. */
function buildPlayGlanceDetail(
  input: PlayGlanceInput,
  headline: string
): string | null {
  const person = draftAddresseeLabel({
    recipientLabel: input.recipientLabel ?? input.targetLabel,
    draftText: input.draftText,
  });
  const record = extractRecordCode(
    input.targetLabel,
    input.headline,
    input.subject,
    input.recipientLabel
  );
  const key = playbookKey(input.playbookSlug, input.playbookName);
  const invoice = isInvoicePlay(
    key,
    record,
    input.targetLabel,
    input.recipientLabel
  );
  const knew = glanceKnew(input, headline, invoice);
  const prepared = glancePrepared(input, person, key);

  if (knew && prepared) return `${knew}. ${prepared}.`;
  if (prepared) return `${prepared}.`;
  return knew;
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
  /** Run context used to attach Memory / Stripe links on older plays. */
  sourceLinks?: EvidenceLinkContext;
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

  const linked = input.sourceLinks
    ? attachEvidenceSourceLinks(items, input.sourceLinks)
    : items;

  const thin = linked.length < THIN_THRESHOLD;
  const thinNote = thin
    ? linked.length === 0
      ? "Salt had no connected sources for this — review before approving."
      : `This is all Salt found — worth a closer look before approving.`
    : null;

  return { items: linked, thin, thinNote };
}
