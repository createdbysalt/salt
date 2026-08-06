"use client";

import dynamic from "next/dynamic";
import { useCallback, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { HqBriefingData } from "@/app/_features/plays/types";
import type { PlayCardViewModel } from "@/app/_features/plays/play-card/types";
import type { HqSideRailData, HqStatsData, HqUpcomingData } from "@/app/_features/hq/types";
import {
  fetchHqStatsData,
  fetchHqUpcomingData,
} from "@/app/_features/hq/actions/fetch-hq-tab-data";
import { BriefingHero } from "./BriefingHero";
import { HQTabs, type HQTab } from "./HQTabs";
import { StatsTabSkeleton, UpcomingTabSkeleton } from "./HqTabSkeletons";
import { PlayQueue } from "./PlayQueue";
import { SideRail } from "./SideRail";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

const StatsTab = dynamic(() => import("./StatsTab").then((mod) => mod.StatsTab), {
  loading: () => <StatsTabSkeleton />,
});
const UpcomingTab = dynamic(() => import("./UpcomingTab").then((mod) => mod.UpcomingTab), {
  loading: () => <UpcomingTabSkeleton />,
});

type Props = {
  briefing: HqBriefingData;
  queueCards: PlayCardViewModel[];
  sideRail: HqSideRailData;
};

export function HqDashboardView({ briefing, queueCards, sideRail }: Props) {
  const [tab, setTab] = useState<HQTab>("today");
  const [stats, setStats] = useState<HqStatsData | null>(null);
  const [upcoming, setUpcoming] = useState<HqUpcomingData | null>(null);
  const [, startTransition] = useTransition();

  const handleTabChange = useCallback(
    (nextTab: HQTab) => {
      setTab(nextTab);
      if (nextTab === "stats" && !stats) {
        startTransition(() => {
          void fetchHqStatsData().then(setStats);
        });
      }
      if (nextTab === "upcoming" && !upcoming) {
        startTransition(() => {
          void fetchHqUpcomingData().then(setUpcoming);
        });
      }
    },
    [stats, upcoming],
  );

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className="mx-auto w-full max-w-[1400px]">
        <HQTabs active={tab} onChange={handleTabChange} />

        <div className="mt-6">
          <AnimatePresence mode="wait">
            {tab === "today" && (
              <motion.div
                key="today"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: APPLE_EASE }}
                className="grid gap-5 lg:grid-cols-[1fr_360px] lg:gap-6"
              >
                <div className="min-w-0 space-y-6">
                  <BriefingHero briefing={briefing} sideRail={sideRail} />
                  <PlayQueue
                    initialCards={queueCards}
                    timeSavedLabel={
                      sideRail.timeSaved.minutesThisWeek > 0
                        ? sideRail.timeSaved.valueLabel
                        : null
                    }
                  />
                </div>
                <div id="hq-side-rail-anchor" className="min-w-0">
                  <SideRail data={sideRail} />
                </div>
              </motion.div>
            )}

            {tab === "upcoming" && (
              <motion.div
                key="upcoming"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-w-0"
              >
                {upcoming ? (
                  <UpcomingTab data={upcoming} />
                ) : (
                  <UpcomingTabSkeleton />
                )}
              </motion.div>
            )}

            {tab === "stats" && (
              <motion.div
                key="stats"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-w-0"
              >
                {stats ? (
                  <StatsTab data={stats} />
                ) : (
                  <StatsTabSkeleton />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
