"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@repo/utils";
import type {
  ConnectorCapabilityGroups,
  ConnectorCatalogId,
  ConnectorsPageData,
} from "@/app/_features/connectors";
import { catalogById } from "@/app/_features/connectors/catalog-view";
import { fetchConnectorTools } from "@/app/_features/connectors/actions";
import {
  ConnectorsRail,
  connectorsPaneSurfaceClassName,
} from "@/app/_features/connectors/components/detail/ConnectorsRail";
import { ConnectorsBrowsePane } from "@/app/_features/connectors/components/detail/ConnectorsBrowsePane";
import { ConnectorDetailPane } from "@/app/_features/connectors/components/detail/ConnectorDetailPane";
import { ConnectorDetailPaneSkeleton } from "@/app/_features/connectors/components/detail/ConnectorDetailPaneSkeleton";

/**
 * Connectors Surface — the full connector experience (rail / browse / detail,
 * OAuth + API-key flows, ?connector= deep-linking).
 *
 * Hosted by Sources → Connectors. The hosting surface injects URL handling so
 * this component stays route-agnostic.
 */
interface ConnectorsSurfaceProps {
  data: ConnectorsPageData;
  /** Build the canonical URL for a connector detail (or the grid when null). */
  buildUrl: (connector: ConnectorCatalogId | null) => string;
  /** Sync the hosting surface's URL after in-place grid ↔ detail swaps. */
  onNavigate: (connector: ConnectorCatalogId | null) => void;
}

export function ConnectorsSurface({
  data,
  buildUrl,
  onNavigate,
}: ConnectorsSurfaceProps) {
  const searchParams = useSearchParams();
  const [connectorsData, setConnectorsData] = useState(data);

  useEffect(() => {
    setConnectorsData(data);
  }, [data]);

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

  const catalog = useMemo(
    () => catalogById(connectorsData.catalog),
    [connectorsData.catalog],
  );
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

  // Keep local state in sync with the URL (deep link, browser back/forward).
  useEffect(() => {
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

  const handleSelectConnector = useCallback(
    (id: string) => {
      const connectorId = id as ConnectorCatalogId;
      setSelected(connectorId);
      onNavigate(connectorId);
    },
    [onNavigate],
  );

  const handleBackToGrid = useCallback(() => {
    setSelected(null);
    onNavigate(null);
  }, [onNavigate]);

  const rightPane = selected ? (
    toolsLoading ? (
      <ConnectorDetailPaneSkeleton />
    ) : (
      <ConnectorDetailPane
        connectorId={selected}
        data={connectorsData}
        toolGroups={toolGroups}
        embedded
        onBack={handleBackToGrid}
        oauthReturnUrl={buildUrl(selected)}
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
        className={cn("min-w-0 p-5 lg:p-6", connectorsPaneSurfaceClassName)}
      >
        {rightPane}
      </motion.div>
    </div>
  );
}
