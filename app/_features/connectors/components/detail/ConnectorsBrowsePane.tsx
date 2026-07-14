"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { cn } from "@repo/utils";
import type {
  ConnectorCategory,
  ConnectorDefinition,
  ConnectorRuntimeStatus,
  ConnectorsPageData,
} from "@/app/_features/connectors";
import {
  catalogCategories,
  categoryLabel,
} from "@/app/_features/connectors/catalog-view";
import {
  catalogDomains,
  domainForConnector,
  domainLabel,
  type ConnectorDomain,
} from "@/app/_features/connectors/connector-domains";
import { ConnectorIcon } from "../connector-icons";

type DomainFilter = ConnectorDomain | "all";
type StatusFilter = "all" | "connected" | "available";

/** Cards shown per category before "View all <category>" expands the rest. */
const CATEGORY_CARD_CAP = 6;

const STATUS_FILTERS: readonly { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "connected", label: "Connected" },
  { value: "available", label: "Available" },
];

function DomainChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-[13px] font-medium transition-colors",
        active
          ? "border-foreground/15 bg-foreground text-background"
          : "border-border/60 bg-card text-muted-foreground hover:border-border hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

interface BrowseEntry {
  definition: ConnectorDefinition;
  status: ConnectorRuntimeStatus;
}

function ConnectorLinkCard({
  entry,
  active,
  onSelect,
}: {
  entry: BrowseEntry;
  active?: boolean;
  onSelect?: (id: string) => void;
}) {
  const { definition, status } = entry;
  const isConnected = status.connected && !definition.comingSoon;
  const cardClass = cn(
    "group flex min-h-[76px] w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all",
    active
      ? "border-foreground/20 bg-muted/40 ring-1 ring-foreground/10"
      : "border-border/60 bg-card hover:border-border hover:bg-muted/20 hover:shadow-sm",
  );
  const inner = (
    <>
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background transition-colors",
          active ? "border-foreground/15" : "border-border/50 group-hover:border-border",
        )}
      >
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
          {isConnected ? (
            <span className="hidden shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success sm:inline">
              Connected
            </span>
          ) : null}
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {definition.description}
        </p>
      </div>

      <div className="flex w-8 shrink-0 items-center justify-end">
        {definition.comingSoon ? (
          <span className="text-[11px] font-medium text-muted-foreground">Soon</span>
        ) : (
          <ChevronRight
            className={cn(
              "size-4 transition-colors",
              active
                ? "text-foreground/70"
                : "text-muted-foreground/40 group-hover:text-foreground/60",
            )}
            aria-hidden
          />
        )}
      </div>
    </>
  );

  // Embedded in Plays → grid/detail swap in place (button); standalone route
  // navigates (Link).
  if (onSelect) {
    return (
      <button type="button" className={cardClass} onClick={() => onSelect(definition.id)}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={`/connectors/${definition.id}`} className={cardClass}>
      {inner}
    </Link>
  );
}

function CardGrid({
  entries,
  activeId,
  onSelect,
}: {
  entries: BrowseEntry[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
      {entries.map((entry) => (
        <ConnectorLinkCard
          key={entry.definition.id}
          entry={entry}
          active={entry.definition.id === activeId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function CategorySection({
  category,
  entries,
  activeId,
  onSelect,
}: {
  category: ConnectorCategory;
  entries: BrowseEntry[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const label = category === "recommended" ? "Popular" : categoryLabel(category);
  const overCap = entries.length > CATEGORY_CARD_CAP;
  const visible = expanded ? entries : entries.slice(0, CATEGORY_CARD_CAP);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {label}
        </h2>
        {overCap ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-0.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {expanded ? "Show fewer" : `View all ${label.toLowerCase()}`}
            <ChevronRight
              className={cn("size-3.5 transition-transform", expanded && "rotate-90")}
            />
          </button>
        ) : null}
      </div>
      <CardGrid entries={visible} activeId={activeId} onSelect={onSelect} />
    </section>
  );
}

/**
 * Browse pane for the connectors surface: pinned Connected summary on top,
 * then capped category sections with a real "View all <category>" affordance,
 * plus search. `showHeader` is false when embedded under an existing section
 * header (Plays → Customize → Connectors). When `onSelect` is provided, cards
 * are buttons that swap to the detail in place; otherwise they link to
 * /connectors/[id]. In embedded mode the left rail owns search + status lists,
 * so this pane focuses on domain filters and the category grid.
 */
export function ConnectorsBrowsePane({
  data,
  showHeader = true,
  embedded = false,
  activeId = null,
  onSelect,
}: {
  data: ConnectorsPageData;
  showHeader?: boolean;
  /** Plays → Customize → Connectors: rail is the nav; simplify filters here. */
  embedded?: boolean;
  activeId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [domain, setDomain] = React.useState<DomainFilter>("all");
  const [status, setStatus] = React.useState<StatusFilter>("all");

  const entries = React.useMemo<BrowseEntry[]>(
    () =>
      data.catalog.map((definition) => ({
        definition,
        status: data.connectors[definition.id] ?? { connected: false },
      })),
    [data.catalog, data.connectors],
  );

  const domains = React.useMemo(
    () => catalogDomains(data.catalog),
    [data.catalog],
  );

  // Every view below derives from one filtered list: domain + status + search.
  const filtered = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return entries.filter(({ definition, status: runtime }) => {
      if (domain !== "all" && domainForConnector(definition) !== domain) {
        return false;
      }
      const isConnected = Boolean(runtime.connected) && !definition.comingSoon;
      if (status === "connected" && !isConnected) return false;
      if (status === "available" && isConnected) return false;
      if (
        normalized &&
        !definition.name.toLowerCase().includes(normalized) &&
        !definition.description.toLowerCase().includes(normalized)
      ) {
        return false;
      }
      return true;
    });
  }, [entries, domain, status, query]);

  const connected = filtered.filter(
    ({ status: runtime, definition }) =>
      runtime.connected && !definition.comingSoon,
  );

  const categorySections = React.useMemo(() => {
    const browsable = embedded
      ? filtered
      : filtered.filter(
          ({ status: runtime, definition }) =>
            !runtime.connected || definition.comingSoon,
        );
    return catalogCategories(data.catalog)
      .map((category) => ({
        category,
        entries: browsable.filter(
          ({ definition }) => definition.category === category,
        ),
      }))
      .filter((section) => section.entries.length > 0);
  }, [filtered, data.catalog, embedded]);

  const empty = filtered.length === 0;
  const showConnectedSection = !embedded && connected.length > 0;
  const showSearch = !embedded;
  const showStatusFilters = !embedded;

  return (
    <div className="space-y-6">
      {showHeader ? (
        <header className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Connectors
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Connect the accounts Salt reads from. Salt asks before sending
            messages or running Plays.
          </p>
        </header>
      ) : embedded ? (
        <header className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Browse connectors
          </h2>
          <p className="text-sm text-muted-foreground">
            Pick a connector to connect an account or manage tools and access.
          </p>
        </header>
      ) : null}

      {/* Filter bar: search + status (standalone) + Salt-domain chips. */}
      <div className="space-y-3">
        {showSearch || showStatusFilters ? (
          <div className="flex flex-wrap items-center gap-3">
            {showSearch ? (
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search connectors"
                  aria-label="Search connectors"
                  className="h-9 w-full rounded-full border border-border/60 bg-card pl-10 pr-4 text-sm transition hover:border-border focus:outline-none focus:ring-4 focus:ring-foreground/5"
                />
              </div>
            ) : null}
            {showStatusFilters ? (
              <div
                role="radiogroup"
                aria-label="Filter by connection status"
                className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 p-0.5 text-[13px]"
              >
                {STATUS_FILTERS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={status === option.value}
                    onClick={() => setStatus(option.value)}
                    className={cn(
                      "rounded-full px-3 py-1 font-medium transition-colors",
                      status === option.value
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {domains.length > 1 ? (
          <div
            role="radiogroup"
            aria-label="Filter by domain"
            className="flex flex-wrap gap-1.5"
          >
            <DomainChip
              label="All"
              active={domain === "all"}
              onClick={() => setDomain("all")}
            />
            {domains.map((value) => (
              <DomainChip
                key={value}
                label={domainLabel(value)}
                active={domain === value}
                onClick={() => setDomain(value)}
              />
            ))}
          </div>
        ) : null}
      </div>

      {empty ? (
        <div className="rounded-2xl border border-border/70 bg-card/80 px-6 py-16 text-center text-sm text-muted-foreground ring-soft">
          No connectors match these filters.
        </div>
      ) : (
        <div className="space-y-8">
          {showConnectedSection ? (
            <section className="space-y-3">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Connected ({connected.length})
              </h2>
              <CardGrid
                entries={connected}
                activeId={activeId}
                onSelect={onSelect}
              />
            </section>
          ) : null}

          {categorySections.map((section) => (
            <CategorySection
              key={section.category}
              category={section.category}
              entries={section.entries}
              activeId={activeId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
