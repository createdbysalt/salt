"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { HqBriefingData, HqQueuePlayView } from "@/app/_features/plays/types";
import { BriefingHero } from "./BriefingHero";
import { HQTabs, type HQTab } from "./HQTabs";
import { PlayQueue } from "./PlayQueue";
import { SideRail } from "./SideRail";
import { StatsTab } from "./StatsTab";
import { UpcomingTab } from "./UpcomingTab";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

type Props = {
  briefing: HqBriefingData;
  queuePlays: HqQueuePlayView[];
};

export function HqDashboardView({ briefing, queuePlays }: Props) {
  const [tab, setTab] = useState<HQTab>("today");

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className="mx-auto w-full max-w-[1400px]">
        <HQTabs active={tab} onChange={setTab} />

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
                  <BriefingHero briefing={briefing} />
                  <PlayQueue initialPlays={queuePlays} />
                </div>
                <div className="min-w-0">
                  <SideRail />
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
                <UpcomingTab />
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
                <StatsTab />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
