"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { ConnectionsTabs, type ConnectionsTab } from "./ConnectionsTabs";
import { ConnectionsGraph } from "./ConnectionsGraph";
import { InsightsView } from "./insights/InsightsView";
import { PathsView } from "./paths/PathsView";
import type { ConnectionsGraph as ConnectionsGraphData } from "@/app/_lib/demo/connections-graph-data";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

interface ConnectionsPageProps {
  /** Real graph data from the database (for non-mock accounts) */
  initialGraphData?: ConnectionsGraphData;
}

export function ConnectionsPage({ initialGraphData }: ConnectionsPageProps) {
  const [tab, setTab] = useState<ConnectionsTab>("graph");

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className="mx-auto w-full max-w-[1400px] space-y-8 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <ConnectionsTabs active={tab} onChange={setTab} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: APPLE_EASE }}
            className="space-y-6"
          >
            <PlaysSectionHeader
              eyebrow="Memory · graph"
              title="Connections"
              description="Every record across Memory and the relationships between them. Hover to focus, click to open."
            />

            {tab === "graph" && (
              <div className="min-h-[640px] h-[calc(100vh-420px)]">
                <ConnectionsGraph initialData={initialGraphData} />
              </div>
            )}
            {tab === "insights" && <InsightsView />}
            {tab === "paths" && <PathsView />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
