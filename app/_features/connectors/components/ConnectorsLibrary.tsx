"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronRight, X } from "lucide-react";
import { cn } from "@repo/utils";
import type {
  ConnectorDefinition,
  ConnectorRuntimeStatus,
  ConnectorsPageData,
} from "@/app/_features/connectors";
import {
  catalogDomains,
  domainForConnector,
  domainLabel,
  type ConnectorDomain,
} from "@/app/_features/connectors/connector-domains";
import { PlaysSearchField } from "@/app/_features/plays/components/PlaysSearchField";
import { ConnectorIcon } from "./connector-icons";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

type StatusFilter = "all" | "connected" | "available";

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "connected", label: "Connected" },
  { id: "available", label: "Available" },
];

interface LibraryEntry {
  definition: ConnectorDefinition;
  status: ConnectorRuntimeStatus;
}

function ConnectorLibraryCard({
  entry,
  onSelect,
  index,
}: {
  entry: LibraryEntry;
  onSelect: (id: string) => void;
  index: number;
}) {
  const { definition, status } = entry;
  const isConnected = status.connected && !definition.comingSoon;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.03, ease: APPLE_EASE }}
      onClick={() => onSelect(definition.id)}
      className="group flex min-h-[76px] w-full items-center gap-3 rounded-xl border border-border/60 bg-card px-3.5 py-3 text-left transition-all hover:border-border hover:bg-muted/20 hover:shadow-sm"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background transition-colors group-hover:border-border">
        <ConnectorIcon id={definition.id} size={20} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold leading-5 text-foreground">
            {definition.name}
          </p>
          {definition.nativeBadge ? (
            <span className="chip shrink-0 px-1.5 py-0 text-[10px]">
              {definition.nativeBadge}
            </span>
          ) : null}
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {definition.description}
        </p>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-1.5">
        {definition.comingSoon ? (
          <span className="text-[11px] font-medium text-muted-foreground">Soon</span>
        ) : (
          <>
            {isConnected ? (
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full",
                  status.needsReconnect
                    ? "bg-amber-500/15 text-amber-600"
                    : "bg-success/15 text-success",
                )}
                aria-label={status.needsReconnect ? "Reconnect needed" : "Connected"}
                title={status.needsReconnect ? "Reconnect needed" : "Connected"}
              >
                <Check className="size-3.5" strokeWidth={2.5} />
              </span>
            ) : null}
            <ChevronRight
              className="size-4 text-muted-foreground/40 transition-colors group-hover:text-foreground/60"
              aria-hidden
            />
          </>
        )}
      </div>
    </motion.button>
  );
}

function FilterToggleRow({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={active}
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-sm transition hover:bg-muted/50"
    >
      <span className={cn(active ? "text-foreground font-medium" : "text-muted-foreground")}>
        {label}
      </span>
      <span className="flex items-center gap-2">
        {typeof count === "number" ? (
          <span className="text-[11px] text-muted-foreground/70">{count}</span>
        ) : null}
        <span
          className={cn(
            "size-4 rounded-full border transition",
            active ? "border-foreground bg-foreground" : "border-border",
          )}
        />
      </span>
    </button>
  );
}

/**
 * Connectors library — Playbooks-style browse: search field with a filter
 * popover on top, then domain-eyebrow cards. Selecting a card swaps the
 * hosting surface to that connector's detail pane.
 */
export function ConnectorsLibrary({
  data,
  onSelect,
}: {
  data: ConnectorsPageData;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [domains, setDomains] = useState<ConnectorDomain[]>([]);

  const entries = useMemo<LibraryEntry[]>(
    () =>
      data.catalog.map((definition) => ({
        definition,
        status: data.connectors[definition.id] ?? { connected: false },
      })),
    [data.catalog, data.connectors],
  );

  const domainOptions = useMemo(
    () =>
      catalogDomains(data.catalog).map((domain) => ({
        id: domain,
        label: domainLabel(domain),
        count: entries.filter((e) => domainForConnector(e.definition) === domain)
          .length,
      })),
    [data.catalog, entries],
  );

  const statusCounts = useMemo(() => {
    let connected = 0;
    for (const { definition, status: runtime } of entries) {
      if (runtime.connected && !definition.comingSoon) connected++;
    }
    return { connected, available: entries.length - connected };
  }, [entries]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return entries.filter(({ definition, status: runtime }) => {
      if (domains.length > 0 && !domains.includes(domainForConnector(definition))) {
        return false;
      }
      const isConnected = runtime.connected && !definition.comingSoon;
      if (status === "connected" && !isConnected) return false;
      if (status === "available" && isConnected) return false;
      if (!term) return true;
      return (
        definition.name.toLowerCase().includes(term) ||
        definition.description.toLowerCase().includes(term)
      );
    });
  }, [entries, domains, status, query]);

  const activeFilterCount =
    (status !== "all" ? 1 : 0) + domains.length;

  const toggleDomain = (domain: ConnectorDomain) =>
    setDomains((current) =>
      current.includes(domain)
        ? current.filter((d) => d !== domain)
        : [...current, domain],
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: APPLE_EASE }}
      className="space-y-4"
    >
      <div className="space-y-3">
        <PlaysSearchField
          value={query}
          onChange={setQuery}
          placeholder="Search connectors"
          filterActive={activeFilterCount > 0}
          filterActiveCount={activeFilterCount}
          filterTitle=""
          filterContentClassName="w-72 gap-0 overflow-hidden rounded-2xl border-border/60 p-0"
          filterContent={
            <div className="divide-y divide-border/40">
              <div className="py-1.5">
                <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Status
                </p>
                {STATUS_OPTIONS.map((option) => (
                  <FilterToggleRow
                    key={option.id}
                    label={option.label}
                    count={
                      option.id === "connected"
                        ? statusCounts.connected
                        : option.id === "available"
                          ? statusCounts.available
                          : entries.length
                    }
                    active={status === option.id}
                    onClick={() => setStatus(option.id)}
                  />
                ))}
              </div>
              <div className="py-1.5">
                <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Domain
                </p>
                {domainOptions.map((option) => (
                  <FilterToggleRow
                    key={option.id}
                    label={option.label}
                    count={option.count}
                    active={domains.includes(option.id)}
                    onClick={() => toggleDomain(option.id)}
                  />
                ))}
              </div>
            </div>
          }
        />

        {activeFilterCount > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {status !== "all" ? (
              <button
                type="button"
                onClick={() => setStatus("all")}
                className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-muted"
              >
                {STATUS_OPTIONS.find((o) => o.id === status)?.label}
                <X className="size-3" strokeWidth={2.25} />
              </button>
            ) : null}
            {domains.map((domain) => (
              <button
                key={domain}
                type="button"
                onClick={() => toggleDomain(domain)}
                className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-muted"
              >
                {domainLabel(domain)}
                <X className="size-3" strokeWidth={2.25} />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((entry, i) => (
          <ConnectorLibraryCard
            key={entry.definition.id}
            entry={entry}
            onSelect={onSelect}
            index={i}
          />
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full glass-card rounded-3xl p-10 text-center">
            <p className="font-display text-xl tracking-tight">
              No connectors match
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Try clearing the search or adjusting the filters.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
