import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PlaybookDetailPageV2 } from "@/app/_features/plays/components/PlaybookDetailPageV2";
import {
  getProfilePlaybookSettings,
  getProfileProvenanceStats,
  getPlaybookConnectorStats,
} from "@/app/_features/plays/queries";
import { getPlaybookBySlug } from "@/app/_features/plays/playbooks/schema/v2/discovery";
import { getPlaybookV2BySlug } from "@/app/_features/plays/playbooks/queries-v2";
import { getPlaybookEnabledState } from "@/app/_features/plays/actions/playbook-settings";
import { resolvePlaybookSettingsSlug } from "@/app/_features/plays/utils/playbook-settings-slug";
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

  const settingsSlug = resolvePlaybookSettingsSlug(slug);
  const isMemoryPlaybook = parsed.definition.layer === "learn";
  const [stats, enabled, settings, connectorStats] = await Promise.all([
    getProfileProvenanceStats(settingsSlug),
    getPlaybookEnabledState(slug),
    isMemoryPlaybook ? getProfilePlaybookSettings(settingsSlug) : Promise.resolve(null),
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
        stats={stats}
        settings={settings}
        settingsBlueprintSlug={settingsSlug}
        playbookMdContent={playbookMdContent?.body}
        packageData={packageData}
        connectorStats={connectorStats}
      />
    </Suspense>
  );
}
