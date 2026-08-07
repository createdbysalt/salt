"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { cn } from "@repo/utils";
import type {
  ConnectorCapabilityGroups,
  ConnectorCatalogId,
  ConnectorsPageData,
} from "@/app/_features/connectors";
import { catalogById } from "@/app/_features/connectors/catalog-view";
import { fetchConnectorTools } from "@/app/_features/connectors/actions";
import { connectorsPaneSurfaceClassName } from "@/app/_features/connectors/components/detail/ConnectorsRail";
import { ConnectorsLibrary } from "@/app/_features/connectors/components/ConnectorsLibrary";
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

  if (!selected) {
    // Library view: Playbooks-style search + filters + cards, no rail.
    return (
      <ConnectorsLibrary
        data={connectorsData}
        onSelect={handleSelectConnector}
      />
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleBackToGrid}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="size-3.5" strokeWidth={2} />
        Back to Connectors
      </button>

      <motion.div
        key={`detail:${selected}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn("min-w-0 p-5 lg:p-6", connectorsPaneSurfaceClassName)}
      >
        {toolsLoading ? (
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
        )}
      </motion.div>
    </div>
  );
}
