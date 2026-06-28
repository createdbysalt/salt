import { factorDirection } from "@/app/_lib/health/core";
import type { HealthFactor, WorkHealthSignals } from "./types";
import { booleanSubScore, compositeScore, daysSince } from "./utils";

function buildFactor(
  key: string,
  label: string,
  subScore: number,
  weight: number,
  detail?: string,
): HealthFactor {
  return {
    key,
    label,
    subScore,
    weight,
    direction: factorDirection(subScore),
    detail,
  };
}

export function scoreTransactional(
  signals: WorkHealthSignals,
  now: number,
): { score: number; factors: HealthFactor[] } {
  const createdDays = daysSince(signals.stageEnteredAt, now);

  const factors: HealthFactor[] = [
    buildFactor(
      "completion_speed",
      "Completion speed",
      completionSpeedScore(createdDays),
      0.4,
      completionSpeedDetail(createdDays),
    ),
    buildFactor(
      "payment_status",
      "Payment status",
      booleanSubScore(signals.isPaid),
      0.4,
      signals.isPaid ? "Paid" : "Payment pending",
    ),
    buildFactor(
      "contact_confirmation",
      "Client confirmation",
      booleanSubScore(signals.clientConfirmed),
      0.2,
      signals.clientConfirmed ? "Client confirmed completion" : "Awaiting confirmation",
    ),
  ];

  return { score: compositeScore(factors), factors };
}

function completionSpeedScore(daysSinceCreated: number | null): number {
  if (daysSinceCreated == null) return 60;
  if (daysSinceCreated <= 1) return 100;
  if (daysSinceCreated <= 3) return 85;
  if (daysSinceCreated <= 7) return 65;
  if (daysSinceCreated <= 14) return 40;
  return 20;
}

function completionSpeedDetail(daysSinceCreated: number | null): string {
  if (daysSinceCreated == null) return "Created date unknown";
  if (daysSinceCreated < 1) return "Created today";
  return `${Math.round(daysSinceCreated)} days since created`;
}
