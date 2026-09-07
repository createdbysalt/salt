import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PlaybookDetailPageV2 } from "@/app/_features/plays/components/PlaybookDetailPageV2";
import {
  getPlaybookApprovalRate,
  getPlaybookConnectorStats,
  getPlaybookRunStats,
  listOpenAutonomyOffers,
  listPlaybookRuns,
} from "@/app/_features/plays/queries";
import {
  getPlaybookV2BySlug,
  resolvePlaybookDefinition,
} from "@/app/_features/plays/playbooks/queries-v2";
import {
  getPlaybookAppSelections,
  getPlaybookEnabledState,
} from "@/app/_features/plays/actions/playbook-settings";
import {
  listPlaybookAdjustments,
  listPlaybookCustomizeEntries,
} from "@/app/_features/plays/customize/queries";
import { readPackageData } from "@/app/_features/plays/playbooks/read-package-files";
import { getDisabledToolSlugs } from "@/app/_lib/composio/classification-store";
import { getTenantContext } from "@/app/_lib/tenancy/context";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";

export default async function PlaybookDetailRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const v2Playbook = await getPlaybookV2BySlug(slug);
  if (!v2Playbook) {
    notFound();
  }

  const resolved = await resolvePlaybookDefinition(slug);
  if (!resolved) {
    notFound();
  }

  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  // Phase 5b/6: every discovered playbook is act-layer (learn lives in Memory
  // Care, not the plays surface), so hero stats come from play_runs.
  const [
    runStats,
    enabled,
    connectorStats,
    approvalRate,
    runs,
    customizeEntries,
    adjustments,
    openAutonomyOffers,
    appSelections,
  ] = await Promise.all([
    getPlaybookRunStats(slug),
    getPlaybookEnabledState(slug),
    getPlaybookConnectorStats(slug),
    getPlaybookApprovalRate(slug),
    listPlaybookRuns(workspace.id, slug),
    listPlaybookCustomizeEntries(workspace.id, slug),
    listPlaybookAdjustments(workspace.id, slug),
    listOpenAutonomyOffers(workspace.id, slug),
    getPlaybookAppSelections(slug),
  ]);

  const packageData = resolved.packagePath
    ? readPackageData(resolved.packagePath)
    : null;

  // Drift-disable feedback: if any allowlisted tool is hard-denied at the
  // gate, the detail page banner says so before a run fails post-approval.
  const disabledToolSlugs = await getDisabledToolSlugs();
  const disabledTools = (resolved.definition.tools ?? []).filter((tool) =>
    disabledToolSlugs.has(tool)
  );

  return (
    <Suspense fallback={null}>
      <PlaybookDetailPageV2
        playbook={{ ...v2Playbook, enabled, disabledTools }}
        definition={resolved.definition}
        origin={resolved.origin}
        runStats={runStats}
        approvalRate={approvalRate}
        packageData={packageData}
        connectorStats={connectorStats}
        runs={runs}
        customizeEntries={customizeEntries}
        adjustments={adjustments}
        openAutonomyOffers={openAutonomyOffers}
        appSelections={appSelections}
      />
    </Suspense>
  );
}
