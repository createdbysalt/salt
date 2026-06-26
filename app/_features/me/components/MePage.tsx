"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui";
import type { ProfileContextFacts } from "@/app/_features/plays/playbooks/profile/types";
import type { ProfileActivityTimelineEntry } from "@/app/_features/people/utils/activity";
import { MeHero } from "./MeHero";
import {
  memoryListShellClass,
  memoryTabPanelClass,
  memoryTabsListClass,
  memoryTabTriggerClass,
} from "@/app/_features/memory/utils/memory-layout";
import { MeOverviewTab } from "./tabs/MeOverviewTab";
import { MeVoiceTab } from "./tabs/MeVoiceTab";
import { MeGoalsTab } from "./tabs/MeGoalsTab";
import { MeBusinessTab } from "./tabs/MeBusinessTab";
import { MeMemoryTab } from "./tabs/MeMemoryTab";
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

      <div className={memoryListShellClass}>
        <MeHero
          identity={data.identity}
          goalCount={data.goals.length}
          factCount={data.facts.filter((f) => f.status === "confirmed").length}
          proposedCount={data.facts.filter((f) => f.status === "proposed").length}
        />

        <Tabs value={tab} onValueChange={setTab} className="space-y-5">
          <TabsList className={memoryTabsListClass}>
            <TabsTrigger value="overview" className={memoryTabTriggerClass}>Overview</TabsTrigger>
            <TabsTrigger value="voice" className={memoryTabTriggerClass}>Voice</TabsTrigger>
            <TabsTrigger value="goals" className={memoryTabTriggerClass}>Goals</TabsTrigger>
            <TabsTrigger value="business" className={memoryTabTriggerClass}>Business</TabsTrigger>
            <TabsTrigger value="memory" className={memoryTabTriggerClass}>Memory</TabsTrigger>
            <TabsTrigger value="activity" className={memoryTabTriggerClass}>Activity</TabsTrigger>
          </TabsList>

          <div className={memoryTabPanelClass}>
            <TabsContent value="overview" className="m-0">
              <MeOverviewTab identity={data.identity} contextFacts={contextFacts} />
            </TabsContent>
            <TabsContent value="voice" className="m-0">
              <MeVoiceTab voice={data.voice} workspaceVoice={data.workspaceVoice} />
            </TabsContent>
            <TabsContent value="goals" className="m-0">
              <MeGoalsTab goals={data.goals} />
            </TabsContent>
            <TabsContent value="business" className="m-0">
              <MeBusinessTab business={data.business} />
            </TabsContent>
            <TabsContent value="memory" className="m-0">
              <MeMemoryTab workspaceId={workspaceId} notes={notes} facts={data.facts} />
            </TabsContent>
            <TabsContent value="activity" className="m-0">
              <MeActivityTab entries={activity} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
