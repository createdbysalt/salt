import { Suspense } from "react";
import { PersonDetailPage } from "@/app/_features/people/components/PersonDetailPage";
import {
  getPersonActivity,
  getPersonDetailSummary,
  getPersonProfileFields,
  getPersonRelationshipHealth,
} from "@/app/_features/people/queries";
import { getPersonLifecycleEvents } from "@/app/_features/memory/queries/lifecycle-events";
import { getPersonBillingAccount } from "@/app/_features/billing/queries/billing-accounts";
import { assemblePersonNarrativeSignals } from "@/app/_features/memory/narrative/assemble";
import { resolveRecordNarrative } from "@/app/_features/memory/narrative/recompute";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";

function daysSinceIso(iso: string | null): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function mapHealthBand(
  band: "healthy" | "watch" | "risk" | "insufficient" | null | undefined,
): "good" | "watch" | "risk" | null {
  if (band === "healthy") return "good";
  if (band === "watch") return "watch";
  if (band === "risk") return "risk";
  return null;
}

export default async function PersonDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [personSummary, profileFields, activity, lifecycleEvents, billingMetrics, health] =
    await Promise.all([
      getPersonDetailSummary(id),
      getPersonProfileFields(id),
      getPersonActivity(id),
      getPersonLifecycleEvents(id),
      getPersonBillingAccount(id),
      getPersonRelationshipHealth(id),
    ]);

  let aiNarrative = null;
  if (personSummary) {
    const { userId } = await getWorkspaceContext();
    const signals = assemblePersonNarrativeSignals({
      name: personSummary.name,
      title: personSummary.title,
      relationshipType: personSummary.relationshipType,
      primaryOrgName: personSummary.primaryOrg?.name ?? null,
      activeWork: personSummary.metrics.activeWork,
      mrrCents: personSummary.metrics.mrrCents,
      retainerLabel: personSummary.metrics.retainerLabel,
      outstandingCents: personSummary.metrics.outstandingCents,
      meetingWithinDays: personSummary.metrics.meetingWithinDays,
      healthBand: mapHealthBand(health?.band),
      lastContactDaysAgo: daysSinceIso(personSummary.lastContactAt),
    });
    aiNarrative = resolveRecordNarrative({
      table: "people",
      recordId: personSummary.id,
      kind: "person",
      userId,
      signals,
      cache: personSummary.narrativeCache,
    });
  }

  return (
    <Suspense fallback={null}>
      <PersonDetailPage
        personId={id}
        personSummary={personSummary}
        profileFields={profileFields}
        activity={activity}
        lifecycleEvents={lifecycleEvents}
        billingMetrics={billingMetrics}
        health={health}
        aiNarrative={aiNarrative}
      />
    </Suspense>
  );
}
