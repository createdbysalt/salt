import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProfilePlaybookDetailPage } from "@/app/_features/plays/components/ProfilePlaybookDetailPage";
import {
  groupProfileFillRulesByField,
  resolveProfileRules,
} from "@/app/_features/plays/playbooks/records-engine/resolve-rules";
import { loadPlaybookResources } from "@/app/_features/plays/playbooks/load-playbook-resources";
import {
  getProfileBlueprintDetail,
  getProfilePlaybookSettings,
  getProfileProvenanceStats,
  listRecentProfileProvenance,
} from "@/app/_features/plays/queries";

export default async function ProfilePlaybookDetailRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [blueprint, settings, stats, recentProvenance] = await Promise.all([
    getProfileBlueprintDetail(slug),
    getProfilePlaybookSettings(slug),
    getProfileProvenanceStats(slug),
    listRecentProfileProvenance(slug),
  ]);

  if (!blueprint || blueprint.kind !== "profile") {
    notFound();
  }

  const effectiveRules = blueprint.fillRules
    ? resolveProfileRules({ systemRules: blueprint.fillRules, settings })
    : null;
  const rulesByField = groupProfileFillRulesByField(effectiveRules?.rules.rules ?? []);
  const resources = loadPlaybookResources(slug);

  return (
    <Suspense fallback={null}>
      <ProfilePlaybookDetailPage
        blueprint={blueprint}
        settings={settings}
        stats={stats}
        recentProvenance={recentProvenance}
        rulesByField={rulesByField}
        resources={resources}
      />
    </Suspense>
  );
}
