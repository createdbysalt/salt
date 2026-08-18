"use client";

import { useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ConnectorsSurface } from "@/app/_features/connectors/components/ConnectorsSurface";
import { CaptureStreamTab } from "@/app/_features/capture/components/CaptureStreamTab";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { SourcesTabs } from "./SourcesTabs";
import { SourcesPageSkeleton } from "./SourcesPageSkeleton";
import { SourcesCustomizeTab } from "./SourcesCustomizeTab";
import { useSourcesTabCache } from "../hooks/useSourcesTabCache";
import { useCaptureStreamRealtime } from "../hooks/useCaptureStreamRealtime";
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
 * - Customize: intake policy by capture category (2026-08-10)
 */
export function SourcesPage({
  initialTab,
  initialData,
  initialCategory = null,
}: {
  initialTab: SourcesTab;
  initialData: SourcesTabData;
  /** ?category= for the Customize tab's deep links (pane "Customize →"). */
  initialCategory?: string | null;
}) {
  const { tab, activeData, isTabLoading, handleTabChange, invalidateActiveTab } =
    useSourcesTabCache({ tab: initialTab, data: initialData });

  const { connectors, streamCaptures, streamTotalCount, streamCounts, hasCaptureData, workspaceId, customize } =
    activeData ?? initialData;

  // Keep the stream honest: new captures (webhook or backfill) revalidate the
  // active tab — debounced inside the hook so bursts collapse to one refresh.
  useCaptureStreamRealtime({
    workspaceId: workspaceId ?? null,
    enabled: tab === "activity",
    onChange: invalidateActiveTab,
  });

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
                  initialCaptures={streamCaptures}
                  initialTotalCount={streamTotalCount}
                  initialCounts={streamCounts}
                  hasRealData={hasCaptureData}
                  workspaceId={workspaceId}
                />
              </motion.div>
            )}

            {/* CUSTOMIZE TAB — intake policy by capture category */}
            {tab === "customize" && (
              <motion.div
                key="customize"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {customize ? (
                  <SourcesCustomizeTab
                    data={customize}
                    initialCategory={initialCategory}
                    onChanged={invalidateActiveTab}
                  />
                ) : (
                  <>
                    <PlaysSectionHeader
                      eyebrow="Customize what Salt captures"
                      title="Customize"
                      description="What Salt does by default, and the rules you've added on top."
                    />
                    <p className="text-sm text-muted-foreground">
                      Sign in to manage intake rules.
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
