"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent, Badge } from "@repo/ui";
import { getPlayerWithVisual } from "../players/visual";
import type { PlayerSlug } from "../players/capabilities";
import type { PlayerContextRow } from "../players/queries";
import type { ActivityEntryRow, PlaybookBlueprintView, PlayTemplateView } from "../types";
import type { LearningsDigest } from "@/app/_features/me/actions/salt-learnings";
import { PlayerHero } from "./PlayerHero";
import { PlayerOverviewTab } from "./PlayerOverviewTab";
import { PlayerPlaybooksTab } from "./PlayerPlaybooksTab";
import { PlayerSidebar } from "./PlayerSidebar";
import { KeeperLearnedTab } from "./KeeperLearnedTab";
import { KeeperActivityTab } from "./KeeperActivityTab";
import {
  memoryDetailGridClass,
  memoryDetailShellClass,
  memoryTabPanelClass,
  memoryTabsListClass,
  memoryTabTriggerClass,
} from "@/app/_features/memory/utils/memory-layout";

interface PlayerDetailPageProps {
  playerSlug: PlayerSlug;
  context: PlayerContextRow | null;
  blueprints: PlaybookBlueprintView[];
  adoptedTemplates: PlayTemplateView[];
  keeperData?: {
    learnings: LearningsDigest;
    activity: ActivityEntryRow[];
    activityTotalCount: number;
    workspaceId: string;
  };
  loadMoreActivity?: (offset: number) => Promise<ActivityEntryRow[]>;
}

export function PlayerDetailPage({
  playerSlug,
  context,
  blueprints,
  adoptedTemplates,
  keeperData,
  loadMoreActivity,
}: PlayerDetailPageProps) {
  const [tab, setTab] = useState("overview");

  const player = getPlayerWithVisual(playerSlug);
  if (!player) return null;

  const playerBlueprints = blueprints.filter((bp) => bp.playerSlug === player.slug);
  const isKeeper = playerSlug === "keeper";
  const unseenCount = keeperData?.learnings.unseenCount ?? 0;

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className={memoryDetailShellClass}>
        <Link
          href="/plays?tab=customize&customize=players"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-2"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2} />
          Back to Players
        </Link>

        <PlayerHero
          player={player}
          blueprints={playerBlueprints}
          context={context}
        />

        <div className={memoryDetailGridClass}>
          <div className="min-w-0 space-y-6">
            <Tabs value={tab} onValueChange={setTab} className="space-y-5">
              <TabsList className={memoryTabsListClass}>
                <TabsTrigger value="overview" className={memoryTabTriggerClass}>
                  Overview
                </TabsTrigger>
                <TabsTrigger value="playbooks" className={memoryTabTriggerClass}>
                  Playbooks
                </TabsTrigger>
                {isKeeper && (
                  <>
                    <TabsTrigger value="learned" className={memoryTabTriggerClass}>
                      Learned
                      {unseenCount > 0 && (
                        <Badge
                          variant="default"
                          className="ml-1.5 h-5 min-w-[20px] px-1.5 text-[10px]"
                        >
                          {unseenCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="activity" className={memoryTabTriggerClass}>
                      Activity
                    </TabsTrigger>
                  </>
                )}
              </TabsList>

              <div className={memoryTabPanelClass}>
                <TabsContent value="overview" className="m-0">
                  <PlayerOverviewTab player={player} context={context} />
                </TabsContent>

                <TabsContent value="playbooks" className="m-0">
                  <PlayerPlaybooksTab
                    player={player}
                    blueprints={playerBlueprints}
                    adoptedTemplates={adoptedTemplates}
                  />
                </TabsContent>

                {isKeeper && keeperData && (
                  <>
                    <TabsContent value="learned" className="m-0">
                      <KeeperLearnedTab
                        digest={keeperData.learnings}
                        workspaceId={keeperData.workspaceId}
                      />
                    </TabsContent>

                    <TabsContent value="activity" className="m-0">
                      <KeeperActivityTab
                        initialActivity={keeperData.activity}
                        totalCount={keeperData.activityTotalCount}
                        hasMore={keeperData.activity.length < keeperData.activityTotalCount}
                        onLoadMore={loadMoreActivity ?? (async () => [])}
                      />
                    </TabsContent>
                  </>
                )}
              </div>
            </Tabs>
          </div>

          <PlayerSidebar player={player} blueprints={playerBlueprints} />
        </div>
      </div>
    </div>
  );
}
