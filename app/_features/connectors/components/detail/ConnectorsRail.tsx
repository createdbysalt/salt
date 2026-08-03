"use client";

import * as React from "react";
import { Check, LayoutGrid, Search } from "lucide-react";
import { cn } from "@repo/utils";
import type {
  ConnectorDefinition,
  ConnectorRuntimeStatus,
  ConnectorsPageData,
} from "@/app/_features/connectors";
import { ConnectorIcon } from "../connector-icons";

/** Shared frame for the connectors master-detail panes (rail + main column). */
export const connectorsPaneSurfaceClassName =
  "rounded-xl border border-border/50 bg-card/30";

interface RailEntry {
  definition: ConnectorDefinition;
  status: ConnectorRuntimeStatus;
}

function RailItem({
  entry,
  active,
  onSelect,
}: {
  entry: RailEntry;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const { definition, status } = entry;
  return (
    <li className="[content-visibility:auto]">
      <button
        type="button"
        onClick={() => onSelect(definition.id)}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
          active
            ? "bg-foreground text-background shadow-sm"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md border bg-background",
            active ? "border-background/20" : "border-border/50",
          )}
        >
          <ConnectorIcon id={definition.id} size={13} />
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{definition.name}</span>
        {status.needsReconnect ? (
          <span
            className="size-2 shrink-0 rounded-full bg-amber-500"
            aria-label="Reconnect needed"
          />
        ) : status.connected && status.stale ? (
          <span
            className="size-2 shrink-0 rounded-full bg-amber-500"
            title="No recent activity — may need reconnecting"
            aria-label="No recent activity — may need reconnecting"
          />
        ) : status.connected ? (
          <Check
            className={cn(
              "size-3.5 shrink-0",
              active ? "text-success-foreground" : "text-success",
            )}
            strokeWidth={2.5}
            aria-label="Connected"
          />
        ) : definition.comingSoon ? (
          <span className="shrink-0 text-[10px] font-medium text-muted-foreground/70">
            Soon
          </span>
        ) : null}
      </button>
    </li>
  );
}

/**
 * Persistent left rail for the connectors master-detail surface (Plays →
 * Customize → Connectors): search, Connected (n), and the Available catalog
 * list. Selecting an item swaps the right pane to that connector's detail;
 * `activeId` highlights the current one. Hidden below lg — on mobile the
 * browse grid is the list and the detail takes the full column.
 */
export function ConnectorsRail({
  data,
  activeId,
  onSelect,
  onBrowseAll,
}: {
  data: ConnectorsPageData;
  activeId: string | null;
  onSelect: (id: string) => void;
  /** Clears selection and returns to the browse grid (embedded mode). */
  onBrowseAll?: () => void;
}) {
  const [query, setQuery] = React.useState("");

  const entries = React.useMemo<RailEntry[]>(
    () =>
      data.catalog.map((definition) => ({
        definition,
        status: data.connectors[definition.id] ?? { connected: false },
      })),
    [data.catalog, data.connectors],
  );

  const filtered = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return entries;
    }
    return entries.filter(({ definition }) =>
      definition.name.toLowerCase().includes(normalized),
    );
  }, [entries, query]);

  const connected = filtered.filter(
    ({ status, definition }) => status.connected && !definition.comingSoon,
  );
  const available = filtered.filter(
    ({ status, definition }) => !status.connected || definition.comingSoon,
  );

  return (
    <nav
      aria-label="Connectors"
      className={cn(
        connectorsPaneSurfaceClassName,
        "flex h-full flex-col gap-3 p-3",
      )}
    >
      {onBrowseAll ? (
        <button
          type="button"
          onClick={onBrowseAll}
          aria-current={activeId === null ? "true" : undefined}
          className={cn(
            "inline-flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors",
            activeId === null
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          <LayoutGrid className="size-4 shrink-0" aria-hidden />
          Browse all
        </button>
      ) : null}

      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search connectors"
          aria-label="Search connectors"
          className="h-8 w-full rounded-lg border border-border/60 bg-card pl-8 pr-3 text-[13px] outline-none transition hover:border-border focus:ring-4 focus:ring-foreground/5"
        />
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4 pr-1">
        {connected.length > 0 ? (
          <div className="space-y-1">
            <p className="px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Connected ({connected.length})
            </p>
            <ul className="space-y-0.5">
              {connected.map((entry) => (
                <RailItem
                  key={entry.definition.id}
                  entry={entry}
                  active={entry.definition.id === activeId}
                  onSelect={onSelect}
                />
              ))}
            </ul>
          </div>
        ) : null}

        <div className="space-y-1">
          <p className="px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Available
          </p>
          {available.length === 0 && connected.length === 0 ? (
            <p className="px-2.5 text-xs text-muted-foreground">
              No connectors match your search.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {available.map((entry) => (
                <RailItem
                  key={entry.definition.id}
                  entry={entry}
                  active={entry.definition.id === activeId}
                  onSelect={onSelect}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </nav>
  );
}
