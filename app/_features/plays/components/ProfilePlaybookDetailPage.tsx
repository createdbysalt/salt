"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui";
import type { PlaybookBlueprintView } from "@/app/_features/plays/types";
import type {
  ProfileFillRule,
  ProfileFillRulesDocument,
  ProfilePlaybookSettings,
  ProfileProvenanceFeedItem,
  ProfileProvenanceStats,
} from "@/app/_features/plays/playbooks/records-engine/types";
import { ProfilePlaybookHero } from "./ProfilePlaybookHero";
import { ProfilePlaybookSidebar } from "./ProfilePlaybookSidebar";
import { ProfilePlaybookSettingsForm } from "./ProfilePlaybookSettingsForm";
import { ProfilePlaybookOverviewTab } from "./ProfilePlaybookOverviewTab";
import { ProfilePlaybookRulesTab } from "./ProfilePlaybookRulesTab";
import { ProfilePlaybookActivityTab } from "./ProfilePlaybookActivityTab";
import { ProfilePlaybookAdvancedTab } from "./ProfilePlaybookAdvancedTab";
import type { PlaybookResource } from "@/app/_features/plays/playbooks/load-playbook-resources";
import {
  memoryDetailGridClass,
  memoryDetailShellClass,
  memoryTabPanelClass,
  memoryTabsListClass,
  memoryTabTriggerClass,
} from "@/app/_features/memory/utils/memory-layout";

type ProfilePlaybookDetailPageProps = {
  blueprint: PlaybookBlueprintView & { fillRules: ProfileFillRulesDocument | null };
  settings: ProfilePlaybookSettings | null;
  stats: ProfileProvenanceStats;
  recentProvenance: ProfileProvenanceFeedItem[];
  rulesByField: Record<string, ProfileFillRule[]>;
  resources: PlaybookResource[];
};

export function ProfilePlaybookDetailPage({
  blueprint,
  settings: initialSettings,
  stats,
  recentProvenance,
  rulesByField,
  resources,
}: ProfilePlaybookDetailPageProps) {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [settings, setSettings] = useState(initialSettings);

  const procedureText = blueprint.procedureMd
    ? blueprint.procedureMd.replace(/```json[\s\S]*?```/g, "").trim()
    : blueprint.whenToUse;
  const domainRulesText =
    resources.find((resource) => resource.category === "reference" && resource.name === "domain.md")
      ?.content ?? null;

  function handleSettingsSaved(next: ProfilePlaybookSettings) {
    setSettings(next);
    router.refresh();
  }

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className={memoryDetailShellClass}>
        <Link
          href="/plays?tab=customize&customize=playbooks"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-2"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2} />
          Back to Playbooks
        </Link>

        <ProfilePlaybookHero blueprint={blueprint} stats={stats} />

        <div className={memoryDetailGridClass}>
          <div className="min-w-0 space-y-6">
            <Tabs value={tab} onValueChange={setTab} className="space-y-5">
              <TabsList className={memoryTabsListClass}>
                <TabsTrigger value="overview" className={memoryTabTriggerClass}>
                  Overview
                </TabsTrigger>
                <TabsTrigger value="rules" className={memoryTabTriggerClass}>
                  Rules
                </TabsTrigger>
                <TabsTrigger value="advanced" className={memoryTabTriggerClass}>
                  Advanced
                </TabsTrigger>
                <TabsTrigger value="activity" className={memoryTabTriggerClass}>
                  Activity
                </TabsTrigger>
                <TabsTrigger value="automation" className={memoryTabTriggerClass}>
                  Automation
                </TabsTrigger>
              </TabsList>

              <div className={memoryTabPanelClass}>
                <TabsContent value="overview" className="m-0">
                  <ProfilePlaybookOverviewTab
                    blueprint={blueprint}
                    procedureText={procedureText}
                  />
                </TabsContent>

                <TabsContent value="rules" className="m-0">
                  <ProfilePlaybookRulesTab
                    rulesByField={rulesByField}
                    autoApplyThreshold={settings?.autoApplyThreshold ?? 85}
                    domainRulesText={domainRulesText}
                  />
                </TabsContent>

                <TabsContent value="advanced" className="m-0">
                  <ProfilePlaybookAdvancedTab
                    resources={resources}
                    blueprintSlug={blueprint.slug}
                    systemRules={blueprint.fillRules}
                    settings={settings}
                    onSaved={handleSettingsSaved}
                  />
                </TabsContent>

                <TabsContent value="activity" className="m-0">
                  <ProfilePlaybookActivityTab
                    playbookTitle={blueprint.name}
                    recentProvenance={recentProvenance}
                  />
                </TabsContent>

                <TabsContent value="automation" className="m-0">
                  <ProfilePlaybookSettingsForm
                    blueprintSlug={blueprint.slug}
                    settings={settings}
                    onSaved={handleSettingsSaved}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <ProfilePlaybookSidebar
            blueprint={blueprint}
            settings={settings}
            domainRulesText={domainRulesText}
          />
        </div>
      </div>
    </div>
  );
}
