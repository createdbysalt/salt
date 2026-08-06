import { Suspense } from "react";
import { workspaceSpend } from "@/app/_lib/ai/gpt";
import { PersonDetailPage } from "@/app/_features/people/components/PersonDetailPage";
import {
  getPersonActivity,
  getPersonDetailSummary,
  getPersonProfileFields,
  getPersonRelationshipHealth,
} from "@/app/_features/people/queries";
import { getPersonLifecycleEvents } from "@/app/_features/memory/queries/lifecycle-events";
import { getEntitySourceHistory } from "@/app/_features/memory/queries/source-history";
import { getPersonBillingAccount } from "@/app/_features/billing/queries/billing-accounts";
import { getEntityNotes } from "@/app/_features/memory/queries/entity-notes";
import { getLinkableEntities } from "@/app/_features/memory/queries/linkable-entities";
import { getEntityConnections } from "@/app/_features/connections/queries";
import {
  assemblePersonNarrativeSignals,
  formatEntityNotesForNarrative,
} from "@/app/_features/memory/narrative/assemble";
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
  const { workspace, userId } = await getWorkspaceContext();
  const [personSummary, profileFields, activity, lifecycleEvents, sourceHistory, billingMetrics, health, notes, unifiedConnections, linkableEntities] =
    await Promise.all([
      getPersonDetailSummary(id),
      getPersonProfileFields(id),
      getPersonActivity(id),
      getPersonLifecycleEvents(id),
      getEntitySourceHistory("person", id),
      getPersonBillingAccount(id),
      getPersonRelationshipHealth(id),
      getEntityNotes("person", id),
      getEntityConnections(workspace.id, "person", id),
      getLinkableEntities(),
    ]);

  let aiNarrative = null;
  if (personSummary) {
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
      notes: formatEntityNotesForNarrative(notes),
    });
    aiNarrative = resolveRecordNarrative({
      table: "people",
      recordId: personSummary.id,
      kind: "person",
      spend: workspaceSpend(workspace.id, userId),
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
        sourceHistory={sourceHistory}
        billingMetrics={billingMetrics}
        health={health}
        aiNarrative={aiNarrative}
        notes={notes}
        unifiedConnections={unifiedConnections}
        linkableEntities={linkableEntities}
      />
    </Suspense>
  );
}
