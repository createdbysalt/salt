"use client";

import { useCallback, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui";
import type { ProfileContextFacts } from "@/app/_features/plays/playbooks/records-engine/types";
import type { ProfileActivityTimelineEntry } from "@/app/_features/people/utils/activity";
import { MeHero, type MeQuickAction } from "./MeHero";
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
import { MeNotesTab } from "./tabs/MeNotesTab";
import { MeFilesTab } from "./tabs/MeFilesTab";
import { MeActivityTab } from "./tabs/MeActivityTab";
import type { MeData, OperatorNote, ICPSegment } from "../types";
import type { MemoryFile } from "@/app/_features/files/data";
import type { VoiceProfile } from "../voices/queries";

type MePageProps = {
  data: MeData;
  notes: OperatorNote[];
  activity: ProfileActivityTimelineEntry[];
  contextFacts: ProfileContextFacts;
  icpSegments: ICPSegment[];
  workspaceId: string;
  files: MemoryFile[];
  voiceProfiles: VoiceProfile[];
};

export function MePage({ data, notes, activity, contextFacts, icpSegments, workspaceId, files, voiceProfiles }: MePageProps) {
  const [tab, setTab] = useState("overview");

  const handleQuickAction = useCallback((action: MeQuickAction) => {
    if (action === "note") {
      setTab("notes");
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("me:add-note"));
      }, 100);
      return;
    }
    if (action === "voice") {
      setTab("voice");
      return;
    }
    setTab("overview");
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("me:add-goal"));
    }, 100);
  }, []);

  return (
    <div className="relative min-h-full">
      <div className={memoryDetailShellClass}>
        <MeHero
          identity={data.identity}
          goalCount={data.goals.length}
          factCount={data.facts.filter((f) => f.status === "confirmed").length}
          proposedCount={data.facts.filter((f) => f.status === "proposed").length}
          onQuickAction={handleQuickAction}
        />

        <div className={memoryDetailGridClass}>
          <div className="min-w-0 space-y-6">
            <Tabs value={tab} onValueChange={setTab} className="space-y-5">
              <TabsList className={memoryTabsListClass}>
                <TabsTrigger value="overview" className={memoryTabTriggerClass}>Overview</TabsTrigger>
                <TabsTrigger value="voice" className={memoryTabTriggerClass}>Voice</TabsTrigger>
                <TabsTrigger value="notes" className={memoryTabTriggerClass}>Notes</TabsTrigger>
                <TabsTrigger value="files" className={memoryTabTriggerClass}>Resources</TabsTrigger>
                <TabsTrigger value="activity" className={memoryTabTriggerClass}>Activity</TabsTrigger>
              </TabsList>

              <div className={memoryTabPanelClass}>
                <TabsContent value="overview" className="m-0">
                  <MeOverviewTab
                    identity={data.identity}
                    business={data.business}
                    contextFacts={contextFacts}
                    icpSegments={icpSegments}
                    goals={data.goals}
                  />
                </TabsContent>
                <TabsContent value="voice" className="m-0">
                  <MeVoiceTab
                    voice={data.voice}
                    workspaceVoice={data.workspaceVoice}
                    voiceLearnings={data.facts.filter(
                      (f) => f.category === "voice" && f.source === "draft_edit",
                    )}
                    voiceProfiles={voiceProfiles}
                    workspaceId={workspaceId}
                  />
                </TabsContent>
                <TabsContent value="notes" className="m-0">
                  <MeNotesTab workspaceId={workspaceId} notes={notes} facts={data.facts} />
                </TabsContent>
                <TabsContent value="files" className="m-0">
                  <MeFilesTab files={files} />
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
