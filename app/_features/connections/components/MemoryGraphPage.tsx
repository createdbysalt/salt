"use client";

import { motion } from "framer-motion";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { ConnectionsGraph } from "./ConnectionsGraph";
import type { LegacyConnectionsGraph as ConnectionsGraphData } from "../types";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

interface MemoryGraphPageProps {
  /** Real graph data from the database (for non-mock accounts) */
  initialGraphData?: ConnectionsGraphData;
}

/**
 * Memory → Map tab content. Rendered inside the Memory page shell, which
 * provides the outer wrapper and the Map / Activity / Rules tab bar.
 */
export function MemoryGraphPage({ initialGraphData }: MemoryGraphPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: APPLE_EASE }}
      className="space-y-6"
    >
      <PlaysSectionHeader
        eyebrow="What Salt knows"
        title="Memory Map"
        description="Everything Salt remembers, and how it all connects."
      />

      <div className="min-h-[560px] h-[calc(100vh-340px)]">
        <ConnectionsGraph initialData={initialGraphData} />
      </div>
    </motion.div>
  );
}
