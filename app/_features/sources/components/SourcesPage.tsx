"use client";

import { useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ConnectorsSurface } from "@/app/_features/connectors/components/ConnectorsSurface";
import { CaptureStreamTab } from "@/app/_features/capture/components/CaptureStreamTab";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { SourcesTabs } from "./SourcesTabs";
import { SourcesPageSkeleton } from "./SourcesPageSkeleton";
import { useSourcesTabCache } from "../hooks/useSourcesTabCache";
import {
  buildSourcesPath,
  syncSourcesUrl,
  type SourcesTab,
} from "../sources-tab-routing";
import type { SourcesTabData } from "../sources-tab-data";
import type { ConnectorCatalogId } from "@/app/_features/connectors";

/**
 * Sources Page — intake surface (2026-08-06 reorg)
 *
 * - Connectors: the pipes Salt learns from (moved from Plays → Customize)
 * - Activity: what came in (capture stream, moved from Plays → Activity)
 */
export function SourcesPage({
  initialTab,
  initialData,
}: {
  initialTab: SourcesTab;
  initialData: SourcesTabData;
}) {
  const { tab, activeData, isTabLoading, handleTabChange } =
    useSourcesTabCache({ tab: initialTab, data: initialData });

  const { connectors, streamCaptures, captureStats, hasCaptureData } =
    activeData ?? initialData;

  const buildConnectorUrl = useCallback(
    (connector: ConnectorCatalogId | null) =>
      buildSourcesPath("connectors", connector),
    [],
  );

  const handleConnectorNavigate = useCallback(
    (connector: ConnectorCatalogId | null) => {
      syncSourcesUrl("connectors", connector);
    },
    [],
  );

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className="mx-auto w-full max-w-[1400px] space-y-8">
        {/* Tab Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SourcesTabs active={tab} onChange={handleTabChange} />
        </div>

        {isTabLoading ? (
          <SourcesPageSkeleton tab={tab} />
        ) : (
          <AnimatePresence mode="wait">
            {/* CONNECTORS TAB */}
            {tab === "connectors" && (
              <motion.div
                key="connectors"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <PlaysSectionHeader
                  eyebrow="Account access"
                  title="Connectors"
                  description="Connect the accounts Salt reads from. Salt asks before sending messages or running Plays."
                />
                <ConnectorsSurface
                  data={connectors}
                  buildUrl={buildConnectorUrl}
                  onNavigate={handleConnectorNavigate}
                />
              </motion.div>
            )}

            {/* ACTIVITY TAB */}
            {tab === "activity" && (
              <motion.div
                key="activity"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <PlaysSectionHeader
                  eyebrow="All captured context"
                  title="Activity"
                  description="Everything Salt saw from connected apps — what arrived and what it caused."
                />
                <CaptureStreamTab
                  realStreamCaptures={streamCaptures}
                  realStats={captureStats}
                  hasRealData={hasCaptureData}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
