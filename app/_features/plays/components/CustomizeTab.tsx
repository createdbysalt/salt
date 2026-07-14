"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@repo/utils";
import type {
  ConnectorCapabilityGroups,
  ConnectorCatalogId,
  ConnectorsPageData,
} from "@/app/_features/connectors";
import { catalogById } from "@/app/_features/connectors/catalog-view";
import { fetchConnectorTools } from "@/app/_features/connectors/actions";
import { ConnectorsRail, connectorsPaneSurfaceClassName } from "@/app/_features/connectors/components/detail/ConnectorsRail";
import { ConnectorsBrowsePane } from "@/app/_features/connectors/components/detail/ConnectorsBrowsePane";
import { ConnectorDetailPane } from "@/app/_features/connectors/components/detail/ConnectorDetailPane";
import { ConnectorDetailPaneSkeleton } from "@/app/_features/connectors/components/detail/ConnectorDetailPaneSkeleton";
import {
  buildPlaysCustomizePath,
  syncPlaysCustomizeUrl,
} from "@/app/_features/plays/plays-tab-routing";
import {
  CustomizeSectionToggle,
  type CustomizeSection,
} from "./CustomizeSectionToggle";
import { PlaybookTabV2 } from "./PlaybookTabV2";
import { PlaysSectionHeader } from "./PlaysSectionHeader";
import type { PlaybookV2QueryResult } from "@/app/_features/plays/playbooks/queries-v2";

/**
 * Customize Tab
 *
 * Two sub-sections, switched in place (no route change):
 * - Playbooks: templates and workflows
 * - Connectors: the DB-driven connector catalog. Selecting a connector swaps
 *   the grid for its detail (tools, activity, capture) right here in the tab;
 *   the ?connector= param keeps it deep-linkable and browser-back returns to
 *   the grid.
 */

function parseCustomizeSection(value: string | null): CustomizeSection {
  if (value === "connectors") {
    return "connectors";
  }
  return "playbooks";
}

const sectionHeaders: Record<
  CustomizeSection,
  { eyebrow: string; title: string; description: string }
> = {
  playbooks: {
    eyebrow: "Reusable tactics",
    title: "Playbooks",
    description:
      "The library of moves Salt runs on your behalf. Organized by section and tuned to your preferences.",
  },
  connectors: {
    eyebrow: "Account access",
    title: "Connectors",
    description:
      "Connect the accounts Salt reads from. Salt asks before sending messages or running Plays.",
  },
};

interface CustomizeTabProps {
  connectors: ConnectorsPageData;
  playbooksV2: PlaybookV2QueryResult | null;
  workspaceId: string;
  keeperUnseenCount?: number;
}

export function CustomizeTab({
  connectors,
  playbooksV2,
  workspaceId: _workspaceId,
  keeperUnseenCount: _keeperUnseenCount,
}: CustomizeTabProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [connectorsData, setConnectorsData] = useState(connectors);

  useEffect(() => {
    setConnectorsData(connectors);
  }, [connectors]);

  const handleConnectionChange = useCallback(
    (change: { connectorId: ConnectorCatalogId; connected: boolean }) => {
      setConnectorsData((current) => ({
        ...current,
        connectors: {
          ...current.connectors,
          [change.connectorId]: {
            ...current.connectors[change.connectorId],
            connected: change.connected,
            needsReconnect: false,
            ...(change.connected ? {} : { label: undefined }),
          },
        },
      }));
    },
    [],
  );
  const [section, setSection] = useState<CustomizeSection>(() =>
    parseCustomizeSection(searchParams.get("customize")),
  );

  const catalog = useMemo(() => catalogById(connectorsData.catalog), [connectorsData.catalog]);
  const resolveConnectorId = useCallback(
    (value: string | null): ConnectorCatalogId | null =>
      value && catalog[value as ConnectorCatalogId]
        ? (value as ConnectorCatalogId)
        : null,
    [catalog],
  );

  const [selected, setSelected] = useState<ConnectorCatalogId | null>(() =>
    resolveConnectorId(searchParams.get("connector")),
  );
  const [toolGroups, setToolGroups] =
    useState<ConnectorCapabilityGroups | null>(null);
  const [toolsLoading, setToolsLoading] = useState(false);

  // Legacy customize=voices/players URLs now live under Me → Voice.
  useEffect(() => {
    const customize = searchParams.get("customize");
    if (customize === "voices" || customize === "players") {
      router.replace("/me?tab=voice");
    }
  }, [router, searchParams]);

  // Keep local state in sync with the URL (deep link, browser back/forward).
  useEffect(() => {
    setSection(parseCustomizeSection(searchParams.get("customize")));
    setSelected(resolveConnectorId(searchParams.get("connector")));
  }, [searchParams, resolveConnectorId]);

  // Load the selected connector's tools (DB-driven, curated fallback).
  useEffect(() => {
    if (!selected) {
      setToolGroups(null);
      return;
    }
    let cancelled = false;
    setToolsLoading(true);
    void fetchConnectorTools(selected)
      .then((result) => {
        if (!cancelled) {
          setToolGroups(result.success ? result.data : null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setToolGroups(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setToolsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const handleSectionChange = useCallback((nextSection: CustomizeSection) => {
    setSection(nextSection);
    setSelected(null);
    syncPlaysCustomizeUrl(nextSection);
  }, []);

  const handleSelectConnector = useCallback((id: string) => {
    const connectorId = id as ConnectorCatalogId;
    setSelected(connectorId);
    syncPlaysCustomizeUrl("connectors", connectorId);
  }, []);

  const handleBackToGrid = useCallback(() => {
    setSelected(null);
    syncPlaysCustomizeUrl("connectors");
  }, []);

  const header = sectionHeaders[section];

  const rightPane =
    section !== "connectors" ? null : selected ? (
      toolsLoading ? (
        <ConnectorDetailPaneSkeleton />
      ) : (
        <ConnectorDetailPane
          connectorId={selected}
          data={connectorsData}
          toolGroups={toolGroups}
          embedded
          onBack={handleBackToGrid}
          oauthReturnUrl={buildPlaysCustomizePath("connectors", selected)}
          onConnectionChange={handleConnectionChange}
        />
      )
    ) : (
      <ConnectorsBrowsePane
        data={connectorsData}
        showHeader={false}
        embedded
        activeId={selected}
        onSelect={handleSelectConnector}
      />
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PlaysSectionHeader
          eyebrow={header.eyebrow}
          title={header.title}
          description={header.description}
        />
        <CustomizeSectionToggle
          active={section}
          onChange={handleSectionChange}
        />
      </div>

      {section === "playbooks" && (
        <motion.div
          key="playbooks"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {playbooksV2 ? (
            <PlaybookTabV2
              playbooks={playbooksV2.playbooks}
              counts={{
                total: playbooksV2.counts.total,
                bySection: playbooksV2.counts.bySection,
              }}
            />
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Loading playbooks...</p>
            </div>
          )}
        </motion.div>
      )}

      {section === "connectors" && (
        // Master-detail: persistent rail (search + connected + available) on
        // the left, browse grid or the selected connector's detail on the right.
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
          <aside className="hidden lg:block">
            <div className="sticky top-4 h-[calc(100vh-14rem)] min-h-64">
              <ConnectorsRail
                data={connectorsData}
                activeId={selected}
                onSelect={handleSelectConnector}
                onBrowseAll={handleBackToGrid}
              />
            </div>
          </aside>
          <motion.div
            key={selected ? `detail:${selected}` : "browse"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "min-w-0 p-5 lg:p-6",
              connectorsPaneSurfaceClassName,
            )}
          >
            {rightPane}
          </motion.div>
        </div>
      )}

    </div>
  );
}
