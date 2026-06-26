import type { WorkDetailSummary, WorkDetailViewModel } from "@/app/_features/work/types";
import type { Connection } from "@/app/_lib/demo/people-demo-data";
import { deriveWorkProgress, deriveWorkStatusBadge } from "./progress";

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
  };
  const { progress, overdue } = deriveWorkProgress(progressInput);
  const contactCount = connections.filter((connection) => connection.type === "person").length;

  const health =
    summary.healthScore != null && summary.healthBand
      ? {
          score: summary.healthScore,
          band: summary.healthBand,
          factors: summary.healthFactors ?? [],
        }
      : null;

  return {
    id: summary.id,
    title: summary.name,
    status: deriveWorkStatusBadge(progressInput),
    progress,
    overdue,
    org: summary.org ?? undefined,
    description,
    slug: summary.slug,
    projectType: summary.projectType,
    tags: [],
    lastActivityAt: summary.updatedAt ?? new Date().toISOString(),
    createdAt: summary.createdAt,
    source: "user",
    signals: [],
    contactCount,
    connections,
    health,
    summary:
      description ??
      `${summary.name} is active work in Memory. Salt will fill this record as trusted context arrives.`,
  };
}
