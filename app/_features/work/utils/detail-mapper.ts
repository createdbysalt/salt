import type { WorkDetailSummary, WorkDetailViewModel } from "@/app/_features/work/types";
import type { WorkArchetype } from "@/app/_features/work/health/types";
import type { Connection } from "@/app/_lib/demo/people-demo-data";
import { deriveWorkProgress, deriveWorkStatusBadge } from "./progress";
import {
  buildWorkSummary,
  resolveWorkWorthAttention,
} from "@/app/_features/memory/utils/record-summary";
import { WORK_ARCHETYPE_DISPLAY_LABEL } from "@/app/_features/work/health/archetypes";

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export function toWorkDetailViewModel(input: {
  summary: WorkDetailSummary;
  connections: Connection[];
}): WorkDetailViewModel {
  const { summary, connections } = input;
  const description = summary.description?.trim() ?? null;
  const progressInput = {
    status: summary.status,
    startDate: summary.startDate,
    deadline: summary.deadline,
    stageEnteredAt: summary.stageEnteredAt,
    progressOverride: summary.progressOverride,
  };
  const { progress, overdue } = deriveWorkProgress(progressInput);
  const contactCount = connections.filter((connection) => connection.type === "person").length;

  const archetype = summary.healthArchetype as WorkArchetype | null;
  const health =
    summary.healthScore != null && summary.healthBand
      ? {
          score: summary.healthScore,
          band: summary.healthBand,
          archetype: archetype ?? undefined,
          label: archetype ? WORK_ARCHETYPE_DISPLAY_LABEL[archetype] : undefined,
          factors: summary.healthFactors ?? [],
        }
      : null;

  const composedSummary = buildWorkSummary({
    title: summary.name,
    status: summary.status,
    org: summary.org ? { name: summary.org.name } : null,
    progress,
    overdue,
    deadline: summary.deadline,
    healthBand: summary.healthBand,
  });

  const deterministicWorthAttention = resolveWorkWorthAttention({
    status: summary.status,
    progress,
    overdue,
    deadline: summary.deadline,
    healthBand: summary.healthBand,
    lastActivityDaysAgo: daysSince(summary.updatedAt),
  });

  const ai = summary.aiNarrative;
  const resolvedSummary = description ?? ai?.summary ?? composedSummary;
  const worthAttention = ai?.worthAttention.reason
    ? { reason: ai.worthAttention.reason, suggestedPlay: ai.worthAttention.suggestedPlay }
    : { reason: deterministicWorthAttention, suggestedPlay: "" };

  return {
    id: summary.id,
    title: summary.name,
    status: deriveWorkStatusBadge(progressInput),
    dbStatus: summary.status,
    progress,
    overdue,
    org: summary.org ?? undefined,
    service: summary.service,
    description,
    slug: summary.slug,
    workType: summary.workType,
    stage: summary.stage,
    contractValueCents: summary.contractValueCents,
    paymentType: summary.paymentType,
    paymentTerms: summary.paymentTerms,
    currency: summary.currency,
    hourlyRateCents: summary.hourlyRateCents,
    hoursEstimate: summary.hoursEstimate,
    retainerMrrCents: summary.retainerMrrCents,
    renewalDate: summary.renewalDate,
    billingCycle: summary.billingCycle,
    billingContactId: summary.billingContactId,
    poNumber: summary.poNumber,
    estimatedTimeline: summary.estimatedTimeline,
    discountPercent: summary.discountPercent,
    discountAmountCents: summary.discountAmountCents,
    discountReason: summary.discountReason,
    finalPriceCents: summary.finalPriceCents,
    scopeItems: summary.scopeItems,
    tags: [],
    lastActivityAt: summary.updatedAt ?? new Date().toISOString(),
    startDate: summary.startDate,
    deadline: summary.deadline,
    createdAt: summary.createdAt,
    source: "user",
    signals: [],
    contactCount,
    connections,
    health,
    summary: resolvedSummary,
    worthAttention,
  };
}
