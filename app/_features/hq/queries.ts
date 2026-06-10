import "server-only";

import {
  countPlayRunsByState,
  countPlaysRanToday,
  getPrimaryOpportunityGap,
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
  const [primary, awaiting, ranToday] = await Promise.all([
    getPrimaryOpportunityGap(),
    countPlayRunsByState(["queued", "draft"]),
    countPlaysRanToday(),
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
    autoSentCount: ranToday,
  };
}

export { listHqQueuePlays };
