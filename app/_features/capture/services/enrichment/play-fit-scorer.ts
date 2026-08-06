/**
 * Play-Fit Scorer
 *
 * Computes how well a capture's signals match playbook triggers.
 * Returns top playbooks with fit scores, thresholds, and reasoning.
 *
 * Flow:
 * 1. Capture signals → match against playbook triggers
 * 2. Compute weighted score (0-100)
 * 3. Compare against playbook's confidence_threshold
 * 4. Return all matches with meets_threshold flag
 */

import { buildSignalTriggerIndex, buildPlaybookThresholdIndex } from "@/app/_features/plays/playbooks/trigger-dispatch";
import type { PlayFitScore } from "./types";

/** Signal weights for scoring (higher = more important) */
const SIGNAL_WEIGHTS: Record<string, number> = {
  // High-value email signals
  capture_email_received: 15,
  capture_email_sent: 10,
  is_bidirectional_thread: 25,
  you_initiated: 20,
  is_reply: 15,
  from_known_contact: 20,

  // Payment/billing signals
  billing_payment_matched: 30,
  billing_due_date_passed: 25,
  has_invoice_sent: 20,
  payment_overdue: 30,
  large_amount: 15,

  // Calendar signals
  meeting_synced_from_calendar: 15,
  meeting_upcoming: 20,
  meeting_end_passed: 15,
  is_organizer: 10,
  has_external_attendees: 15,

  // Attachment/content signals
  has_attachment: 10,
  has_pdf_attachment: 15,
  has_contract_keywords: 25,
  has_payment_keywords: 20,

  // Sender classification
  is_automated_sender: -10,
  is_marketing_email: -15,
  is_newsletter: -10,

  // Default weight for unknown signals
  _default: 10,
};

function getSignalWeight(signal: string): number {
  return SIGNAL_WEIGHTS[signal] ?? SIGNAL_WEIGHTS._default;
}

interface PlaybookMatch {
  slug: string;
  name: string;
  matchedSignals: string[];
  totalSignals: number;
  rawScore: number;
}

/**
 * Compute play-fit scores for a capture based on its signals.
 *
 * @param captureSignals - Array of signal keys from the capture
 * @returns Record of playbook slug → PlayFitScore (top 5)
 */
export function computePlayFitScores(
  captureSignals: string[]
): Record<string, PlayFitScore> {
  if (captureSignals.length === 0) {
    return {};
  }

  const captureSignalSet = new Set(captureSignals);
  const triggerIndex = buildSignalTriggerIndex();

  // Map playbook slug → accumulated match info
  const playbookMatches = new Map<string, PlaybookMatch>();

  // For each signal in the capture, find matching playbooks
  for (const signal of captureSignals) {
    const matchingPlaybooks = triggerIndex.get(signal) ?? [];

    for (const playbook of matchingPlaybooks) {
      const existing = playbookMatches.get(playbook.slug);
      const weight = getSignalWeight(signal);

      if (existing) {
        existing.matchedSignals.push(signal);
        existing.rawScore += weight;
      } else {
        playbookMatches.set(playbook.slug, {
          slug: playbook.slug,
          name: playbook.name,
          matchedSignals: [signal],
          totalSignals: 1, // Will be updated below
          rawScore: weight,
        });
      }
    }
  }

  if (playbookMatches.size === 0) {
    return {};
  }

  // Get threshold for each playbook
  const thresholdIndex = buildPlaybookThresholdIndex();

  // Calculate total signals each playbook listens for
  for (const [slug, match] of playbookMatches) {
    // Count unique signals this playbook triggers on
    let totalSignals = 0;
    for (const [signal, playbooks] of triggerIndex) {
      if (playbooks.some(p => p.slug === slug)) {
        totalSignals++;
      }
    }
    match.totalSignals = Math.max(totalSignals, 1);
  }

  // Convert to scores (0-100)
  const scored: Array<{ slug: string; fit: PlayFitScore }> = [];

  for (const match of playbookMatches.values()) {
    // Score formula:
    // - Base: (matched signals / total playbook signals) * 50
    // - Bonus: raw weighted score normalized to 0-50
    const coverageScore = (match.matchedSignals.length / match.totalSignals) * 50;
    const weightedScore = Math.min(50, (match.rawScore / 50) * 50);
    const totalScore = Math.round(coverageScore + weightedScore);

    // Get playbook's threshold
    const threshold = thresholdIndex.get(match.slug) ?? 70;
    const meetsThreshold = totalScore >= threshold;

    // Generate reason
    const reason = generateFitReason(match.matchedSignals, match.name);

    scored.push({
      slug: match.slug,
      fit: {
        score: Math.min(100, totalScore),
        reason,
        matched_signals: match.matchedSignals,
        threshold,
        meets_threshold: meetsThreshold,
      },
    });
  }

  // Sort by score descending, take top 5
  scored.sort((a, b) => b.fit.score - a.fit.score);
  const topScored = scored.slice(0, 5);

  // Convert to record
  const result: Record<string, PlayFitScore> = {};
  for (const { slug, fit } of topScored) {
    // Only include if score is meaningful (>= 30)
    if (fit.score >= 30) {
      result[slug] = fit;
    }
  }

  return result;
}

/**
 * Generate a human-readable reason for the play fit.
 */
function generateFitReason(matchedSignals: string[], playbookName: string): string {
  const signalDescriptions: string[] = [];

  // Prioritize most important signals for the reason
  const prioritySignals = [
    { signal: "is_bidirectional_thread", desc: "active conversation" },
    { signal: "you_initiated", desc: "you started this thread" },
    { signal: "billing_payment_matched", desc: "payment detected" },
    { signal: "payment_overdue", desc: "overdue payment" },
    { signal: "from_known_contact", desc: "known contact" },
    { signal: "meeting_upcoming", desc: "upcoming meeting" },
    { signal: "has_contract_keywords", desc: "contract mentioned" },
    { signal: "is_reply", desc: "reply in thread" },
    { signal: "capture_email_received", desc: "incoming email" },
    { signal: "has_attachment", desc: "has attachments" },
  ];

  for (const { signal, desc } of prioritySignals) {
    if (matchedSignals.includes(signal)) {
      signalDescriptions.push(desc);
      if (signalDescriptions.length >= 2) break;
    }
  }

  if (signalDescriptions.length === 0) {
    return `Matches ${matchedSignals.length} signal${matchedSignals.length > 1 ? "s" : ""}`;
  }

  return signalDescriptions.join(" + ");
}

/**
 * Check if any playbook would match the given signals.
 * Useful for quick filtering without full scoring.
 */
export function hasAnyPlaybookMatch(signals: string[]): boolean {
  const triggerIndex = buildSignalTriggerIndex();

  for (const signal of signals) {
    if (triggerIndex.has(signal)) {
      return true;
    }
  }

  return false;
}
