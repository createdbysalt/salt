import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PlaybookDetailPageV2 } from "@/app/_features/plays/components/PlaybookDetailPageV2";
import {
  getPlaybookConnectorStats,
  getPlaybookRunStats,
} from "@/app/_features/plays/queries";
import { getPlaybookBySlug } from "@/app/_features/plays/playbooks/schema/v2/discovery";
import { getPlaybookV2BySlug } from "@/app/_features/plays/playbooks/queries-v2";
import { getPlaybookEnabledState } from "@/app/_features/plays/actions/playbook-settings";
import { readPlaybookMd } from "@/app/_features/plays/playbooks/read-playbook-md";
import { readPackageData } from "@/app/_features/plays/playbooks/read-package-files";

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

  const parsed = getPlaybookBySlug(slug);
  if (!parsed?.definition) {
    notFound();
  }

  // Phase 5b/6: every discovered playbook is act-layer (learn lives in Memory
  // Care, not the plays surface), so hero stats come from play_runs.
  const [runStats, enabled, connectorStats] = await Promise.all([
    getPlaybookRunStats(slug),
    getPlaybookEnabledState(slug),
    getPlaybookConnectorStats(slug),
  ]);

  const playbookMdContent = parsed.packagePath
    ? readPlaybookMd(parsed.packagePath)
    : null;
  const packageData = parsed.packagePath
    ? readPackageData(parsed.packagePath)
    : null;

  return (
    <Suspense fallback={null}>
      <PlaybookDetailPageV2
        playbook={{ ...v2Playbook, enabled }}
        definition={parsed.definition}
        runStats={runStats}
        playbookMdContent={playbookMdContent?.body}
        packageData={packageData}
        connectorStats={connectorStats}
      />
    </Suspense>
  );
}
