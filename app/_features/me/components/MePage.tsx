"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui";
import type { ProfileContextFacts } from "@/app/_features/plays/playbooks/profile/types";
import { MeHero } from "./MeHero";
import {
  MeOverviewTab,
  MePreferencesTab,
  MeGoalsTab,
  MeSaltMemoryTab,
  MeActivityTab,
} from "./MeTabs";

type MePageProps = {
  contextFacts: ProfileContextFacts;
};

export function MePage({ contextFacts }: MePageProps) {
  const [tab, setTab] = useState("overview");

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className="mx-auto w-full max-w-[1400px] space-y-8">
        <MeHero />

        <Tabs value={tab} onValueChange={setTab} className="space-y-5">
          <TabsList className="bg-card border border-border/60 rounded-full p-1 h-auto flex-wrap">
            <TabsTrigger
              value="overview"
              className="rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background px-4"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background px-4"
            >
              Preferences
            </TabsTrigger>
            <TabsTrigger
              value="goals"
              className="rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background px-4"
            >
              Goals
            </TabsTrigger>
            <TabsTrigger
              value="memory"
              className="rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background px-4"
            >
              Salt Memory
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background px-4"
            >
              Activity
            </TabsTrigger>
          </TabsList>

          <div className="rounded-3xl border border-border/60 bg-card/60 p-6">
            <TabsContent value="overview" className="m-0">
              <MeOverviewTab contextFacts={contextFacts} />
            </TabsContent>
            <TabsContent value="preferences" className="m-0">
              <MePreferencesTab />
            </TabsContent>
            <TabsContent value="goals" className="m-0">
              <MeGoalsTab />
            </TabsContent>
            <TabsContent value="memory" className="m-0">
              <MeSaltMemoryTab />
            </TabsContent>
            <TabsContent value="activity" className="m-0">
              <MeActivityTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
