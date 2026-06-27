"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui";
import type { ProfileContextFacts } from "@/app/_features/plays/playbooks/records-engine/types";
import type { ProfileActivityTimelineEntry } from "@/app/_features/people/utils/activity";
import { MeHero } from "./MeHero";
import { MeBusinessCard } from "./MeBusinessCard";
import {
  memoryDetailShellClass,
  memoryDetailGridClass,
  memoryTabPanelClass,
  memoryTabsListClass,
  memoryTabTriggerClass,
} from "@/app/_features/memory/utils/memory-layout";
import { MeOverviewTab } from "./tabs/MeOverviewTab";
import { MeVoiceTab } from "./tabs/MeVoiceTab";
import { MeGoalsTab } from "./tabs/MeGoalsTab";
import { MeNotesTab } from "./tabs/MeNotesTab";
import { MeActivityTab } from "./tabs/MeActivityTab";
import type { MeData, OperatorNote } from "../types";

type MePageProps = {
  data: MeData;
  notes: OperatorNote[];
  activity: ProfileActivityTimelineEntry[];
  contextFacts: ProfileContextFacts;
  workspaceId: string;
};

export function MePage({ data, notes, activity, contextFacts, workspaceId }: MePageProps) {
  const [tab, setTab] = useState("overview");

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className={memoryDetailShellClass}>
        <MeHero
          identity={data.identity}
          goalCount={data.goals.length}
          factCount={data.facts.filter((f) => f.status === "confirmed").length}
          proposedCount={data.facts.filter((f) => f.status === "proposed").length}
        />

        <div className={memoryDetailGridClass}>
          <div className="min-w-0 space-y-6">
            <Tabs value={tab} onValueChange={setTab} className="space-y-5">
              <TabsList className={memoryTabsListClass}>
                <TabsTrigger value="overview" className={memoryTabTriggerClass}>Overview</TabsTrigger>
                <TabsTrigger value="voice" className={memoryTabTriggerClass}>Voice</TabsTrigger>
                <TabsTrigger value="goals" className={memoryTabTriggerClass}>Goals</TabsTrigger>
                <TabsTrigger value="notes" className={memoryTabTriggerClass}>Notes</TabsTrigger>
                <TabsTrigger value="activity" className={memoryTabTriggerClass}>Activity</TabsTrigger>
              </TabsList>

              <div className={memoryTabPanelClass}>
                <TabsContent value="overview" className="m-0">
                  <MeOverviewTab
                    identity={data.identity}
                    business={data.business}
                    contextFacts={contextFacts}
                  />
                </TabsContent>
                <TabsContent value="voice" className="m-0">
                  <MeVoiceTab voice={data.voice} workspaceVoice={data.workspaceVoice} />
                </TabsContent>
                <TabsContent value="goals" className="m-0">
                  <MeGoalsTab goals={data.goals} />
                </TabsContent>
                <TabsContent value="notes" className="m-0">
                  <MeNotesTab workspaceId={workspaceId} notes={notes} facts={data.facts} />
                </TabsContent>
                <TabsContent value="activity" className="m-0">
                  <MeActivityTab entries={activity} />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <div className="space-y-6">
            <MeBusinessCard business={data.business} />
          </div>
        </div>
      </div>
    </div>
  );
}
