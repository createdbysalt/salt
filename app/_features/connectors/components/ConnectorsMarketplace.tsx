"use client";

import * as React from "react";
import {
  Check,
  ChevronRight,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui";
import { cn } from "@repo/utils";
import {
  getCatalogCategories,
  getCatalogConnectors,
  type ConnectorCatalogId,
  type ConnectorCategory,
  type ConnectorDefinition,
  type ConnectorRuntimeStatus,
  type ConnectorTab,
  type ConnectorsPageData,
} from "@/app/_features/connectors";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { ConnectorIcon } from "./connector-icons";
import { ConnectorsFilterPopover } from "./ConnectorsFilterPopover";
import { ConnectorDetailModal } from "./ConnectorDetailModal";

interface ConnectorsMarketplaceProps {
  data: ConnectorsPageData;
  onConnect: (id: ConnectorCatalogId) => void;
  onDisconnect: (id: ConnectorCatalogId) => void;
  onSaveToolPreferences: (
    id: ConnectorCatalogId,
    disabledTools: string[],
  ) => Promise<boolean>;
  loadingId: ConnectorCatalogId | null;
  savingPreferences: boolean;
  showHeader?: boolean;
}

function categoryLabel(category: ConnectorDefinition["category"]): string {
  switch (category) {
    case "recommended":
      return "Recommended";
    case "productivity":
      return "Productivity";
    case "scheduling":
      return "Scheduling";
    case "files":
      return "Files";
    case "meetings":
      return "Meetings";
    case "payments":
      return "Payments";
    default:
      return category;
  }
}

function sectionTitle(
  tab: ConnectorTab,
  category: ConnectorDefinition["category"] | "all",
): string {
  if (tab === "discover" && category !== "all") {
    return category === "recommended" ? "Popular" : categoryLabel(category);
  }
  switch (tab) {
    case "connected":
      return "Connected";
    case "available":
      return "Available to connect";
    case "all":
      return "All connectors";
    default:
      return "Recommended";
  }
}

function filterByTab(
  entries: Array<{ definition: ConnectorDefinition; status: ConnectorRuntimeStatus }>,
  tab: ConnectorTab,
) {
  switch (tab) {
    case "connected":
      return entries.filter(({ status, definition }) => status.connected && !definition.comingSoon);
    case "available":
      return entries.filter(({ status, definition }) => !status.connected && !definition.comingSoon);
    case "discover":
      return entries;
    case "all":
    default:
      return entries;
  }
}

interface ConnectorRowCardProps {
  definition: ConnectorDefinition;
  status: ConnectorRuntimeStatus;
  loading: boolean;
  onOpen: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

function ConnectorRowCard({
  definition,
  status,
  loading,
  onOpen,
  onConnect,
  onDisconnect,
}: ConnectorRowCardProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const disabled = loading || definition.comingSoon;
  const canConnect = !status.connected && !disabled;

  const handleRowClick = () => {
    if (loading) return;
    onOpen();
  };

  const handleRowKeyDown = (event: React.KeyboardEvent) => {
    if (loading) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  };

  const handleConnectClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (canConnect) {
      onConnect();
    }
  };

  return (
    <div
      role="button"
      tabIndex={loading ? -1 : 0}
      aria-label={`View ${definition.name} details`}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      className={cn(
        "group flex min-h-[72px] items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 transition-colors",
        !loading && "cursor-pointer hover:border-border hover:bg-muted/25",
        disabled && !status.connected && "opacity-80",
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background">
        <ConnectorIcon id={definition.id} size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex h-5 min-w-0 items-center gap-1.5">
          <p className="truncate text-[13px] font-semibold leading-5 text-foreground">
            {definition.name}
          </p>
          {definition.nativeBadge && (
            <span className="chip shrink-0 px-1.5 py-0 text-[10px]">{definition.nativeBadge}</span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 h-8 text-xs leading-4 text-muted-foreground">
          {definition.description}
        </p>
      </div>

      <div className="flex w-7 shrink-0 items-center justify-end pr-0.5">
        {loading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Connecting" />
        ) : status.connected ? (
          mounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-md p-0.5 text-success transition-opacity hover:opacity-80"
                  aria-label={`${definition.name} connected — manage connection`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <Check className="size-[18px]" strokeWidth={2.5} aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={onDisconnect}
                  className="text-destructive focus:text-destructive"
                >
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Check className="size-[18px] text-success" strokeWidth={2.5} aria-label="Connected" />
          )
        ) : definition.comingSoon ? (
          <span className="text-[11px] font-medium text-muted-foreground">Soon</span>
        ) : (
          <button
            type="button"
            className="rounded-md p-0.5 text-muted-foreground/45 transition-all duration-200 ease-out motion-safe:group-hover:rotate-90 motion-safe:group-hover:scale-110 motion-safe:group-hover:text-foreground/70 motion-safe:group-focus-visible:rotate-90 motion-safe:group-focus-visible:scale-110 motion-safe:group-focus-visible:text-foreground/70"
            aria-label={`Connect ${definition.name}`}
            onClick={handleConnectClick}
          >
            <Plus className="size-[18px]" strokeWidth={1.75} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

export function ConnectorsMarketplace({
  data,
  onConnect,
  onDisconnect,
  onSaveToolPreferences,
  loadingId,
  savingPreferences,
  showHeader = true,
}: ConnectorsMarketplaceProps) {
  const [tab, setTab] = React.useState<ConnectorTab>("discover");
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<ConnectorCategory | "all">("all");
  const [selectedConnectorId, setSelectedConnectorId] =
    React.useState<ConnectorCatalogId | null>(null);

  const catalogEntries = React.useMemo(
    () =>
      getCatalogConnectors().map((definition) => ({
        definition,
        status: data.connectors[definition.id] ?? { connected: false },
      })),
    [data.connectors],
  );

  const filteredEntries = React.useMemo(() => {
    const tabbed = filterByTab(catalogEntries, tab);
    return tabbed.filter(({ definition }) => {
      const matchesQuery =
        query.trim().length === 0 ||
        definition.name.toLowerCase().includes(query.toLowerCase()) ||
        definition.description.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "all" || definition.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [catalogEntries, tab, query, category]);

  const groupedEntries = React.useMemo(() => {
    if (tab !== "discover") {
      return [{ category: "all" as const, entries: filteredEntries }];
    }

    return getCatalogCategories()
      .map((groupCategory) => ({
        category: groupCategory,
        entries: filteredEntries.filter(
          ({ definition }) => definition.category === groupCategory,
        ),
      }))
      .filter((group) => group.entries.length > 0);
  }, [filteredEntries, tab]);

  const handleConnect = (id: ConnectorCatalogId) => {
    onConnect(id);
  };

  const handleViewAll = (groupCategory: ConnectorDefinition["category"]) => {
    setTab("all");
    setCategory(groupCategory);
  };

  return (
    <div className="space-y-8">
      <ConnectorDetailModal
        connectorId={selectedConnectorId}
        open={selectedConnectorId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedConnectorId(null);
          }
        }}
        data={data}
        loading={selectedConnectorId !== null && loadingId === selectedConnectorId}
        savingPreferences={savingPreferences}
        onConnect={(id) => {
          onConnect(id);
        }}
        onDisconnect={(id) => {
          onDisconnect(id);
          setSelectedConnectorId(null);
        }}
        onSaveToolPreferences={onSaveToolPreferences}
      />

      {showHeader ? (
        <PlaysSectionHeader
          eyebrow="Account access"
          title="Connectors"
          description="Connect the accounts Salt reads from. Salt asks before sending messages or running Plays."
        />
      ) : null}

      <div className="flex items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search all connectors"
            aria-label="Search all connectors"
            className="h-9 w-full rounded-full border border-border/60 bg-card pl-10 pr-4 text-sm transition hover:border-border focus:outline-none focus:ring-4 focus:ring-foreground/5"
          />
        </div>
        <div className="ml-auto">
          <ConnectorsFilterPopover
            tab={tab}
            onTabChange={setTab}
            category={category}
            onCategoryChange={setCategory}
          />
        </div>
      </div>

      {groupedEntries.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card/80 px-6 py-16 text-center text-sm text-muted-foreground ring-soft">
          No connectors match your search.
        </div>
      ) : (
        groupedEntries.map((group) => (
          <section key={group.category} className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                {sectionTitle(tab, group.category)}
              </h3>
              {tab === "discover" && group.category !== "all" && (
                <button
                  type="button"
                  onClick={() => handleViewAll(group.category)}
                  className="inline-flex items-center gap-0.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  View all
                  <ChevronRight className="size-3.5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {group.entries.map(({ definition, status }) => (
                <ConnectorRowCard
                  key={definition.id}
                  definition={definition}
                  status={status}
                  loading={loadingId === definition.id}
                  onOpen={() => setSelectedConnectorId(definition.id)}
                  onConnect={() => handleConnect(definition.id)}
                  onDisconnect={() => onDisconnect(definition.id)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
