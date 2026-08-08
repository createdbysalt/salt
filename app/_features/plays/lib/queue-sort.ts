/**
 * Queue ordering — the 60-second Monday triage.
 *
 * Spec: .cursor/plans/2026-08-08-play-card-interaction-model.md (Q11)
 * Order: money at risk → time-sensitive (today/tomorrow) → newest first.
 */

import type { PlayCardViewModel } from "../play-card/types";

const MONEY_PATTERN = /\$|invoice|payment|overdue|billing|stripe|proposal/i;
const TIME_PATTERN =
  /\b(today|tonight|tomorrow|this morning|this afternoon|\d{1,2}(:\d{2})?\s?(am|pm))\b/i;

export type QueueBucket = "money" | "time" | "rest";

export function queueBucket(vm: PlayCardViewModel): QueueBucket {
  const text = [vm.subject, vm.targetLabel, vm.triggerLabel, vm.playbookName]
    .filter(Boolean)
    .join(" ");

  if (vm.section === "billing" || MONEY_PATTERN.test(text)) return "money";
  if (TIME_PATTERN.test(text)) return "time";
  return "rest";
}

const BUCKET_RANK: Record<QueueBucket, number> = { money: 0, time: 1, rest: 2 };

/**
 * Stable sort: money at risk first, then today's time-sensitive plays,
 * then everything else newest-first. Does not mutate the input.
 */
export function sortQueueCards(cards: PlayCardViewModel[]): PlayCardViewModel[] {
  return cards
    .map((vm, index) => ({ vm, index }))
    .sort((a, b) => {
      const bucketDiff = BUCKET_RANK[queueBucket(a.vm)] - BUCKET_RANK[queueBucket(b.vm)];
      if (bucketDiff !== 0) return bucketDiff;
      const ageA = a.vm.ageMinutes ?? Number.MAX_SAFE_INTEGER;
      const ageB = b.vm.ageMinutes ?? Number.MAX_SAFE_INTEGER;
      if (ageA !== ageB) return ageA - ageB; // newest (smallest age) first
      return a.index - b.index;
    })
    .map(({ vm }) => vm);
}
