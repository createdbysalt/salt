import "server-only";

import {
  countHqAutoHandledQueue,
  countHqNeedsYouQueue,
  countPlaysRanToday,
  getPrimaryOpportunityGap,
  listHqNeedsYouCards,
  listHqQueuePlays,
} from "@/app/_features/plays/queries";
import type { HqBriefingData } from "@/app/_features/plays/types";

function formatAmountRange(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | null {
  if (min == null && max == null) return null;
  const symbol = currency === "USD" || !currency ? "$" : `${currency} `;
  const low = min ?? max;
  const high = max ?? min;
  if (low == null || high == null) return null;
  if (low === high) {
    return `${symbol}${Math.round(low).toLocaleString()}`;
  }
  return `${symbol}${Math.round(low).toLocaleString()}–${Math.round(high).toLocaleString()}`;
}

export async function getHqBriefingData(): Promise<HqBriefingData> {
  const [primary, awaiting, ranToday, autoHandled] = await Promise.all([
    getPrimaryOpportunityGap(),
    countHqNeedsYouQueue(),
    countPlaysRanToday(),
    countHqAutoHandledQueue(),
  ]);

  return {
    primaryOpportunity: primary
      ? {
          claim: primary.claim,
          summary: primary.summary,
          amountLabel: formatAmountRange(
            primary.amount_min,
            primary.amount_max,
            primary.currency,
          ),
          confidence: primary.confidence,
        }
      : null,
    playsRanToday: ranToday,
    playsAwaitingApproval: awaiting,
    clearedAmountLabel: primary
      ? formatAmountRange(primary.amount_min, primary.amount_max, primary.currency)
      : null,
    autoSentCount: autoHandled,
  };
}

export { listHqNeedsYouCards, listHqQueuePlays };
