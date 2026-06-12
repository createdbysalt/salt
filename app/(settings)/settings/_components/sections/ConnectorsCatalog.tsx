"use client";

import * as React from "react";
import {
  SiGmail,
  SiGooglecalendar,
  SiGoogledocs,
  SiGoogledrive,
  SiGooglesheets,
  SiGoogleslides,
  SiStripe,
} from "@icons-pack/react-simple-icons";
import {
  CheckCircle2,
  Loader2,
  Search,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateWorkspaceTrustLevel } from "@/app/_features/connectors/actions";
import {
  getCatalogCategories,
  getCatalogConnectors,
  type ConnectorCatalogId,
  type ConnectorDefinition,
  type ConnectorRuntimeStatus,
  type ConnectorTab,
  type ConnectorTrustLevel,
  type ConnectorsPageData,
} from "@/app/_features/connectors";
import { FALLBACK_CONNECTOR_ICON } from "@/app/_features/connectors/components/connector-icons";
import { SettingsCard } from "../SettingsCard";
import { SettingsSection } from "../SettingsSection";

interface ConnectorsCatalogProps {
  data: ConnectorsPageData;
  onConnect: (id: ConnectorCatalogId) => void;
  onDisconnect: (id: ConnectorCatalogId) => void;
  loadingId: ConnectorCatalogId | null;
}

/**
 * Workspace-global trust — the ONE switch governing whether Salt may take
 * actions (always with approval) or stay read-only across every connector.
 */
function WorkspaceTrustSection({
  trustLevel,
}: {
  trustLevel: ConnectorTrustLevel;
}) {
  const router = useRouter();
  const [localTrust, setLocalTrust] = React.useState(trustLevel);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setLocalTrust(trustLevel);
  }, [trustLevel]);

  const handleChange = async (next: ConnectorTrustLevel) => {
    if (next === localTrust || saving) {
      return;
    }
    const previous = localTrust;
    setLocalTrust(next);
    setSaving(true);
    const result = await updateWorkspaceTrustLevel(next);
    setSaving(false);
    if (result.success) {
      toast.success(
        next === "act_with_approval"
          ? "Salt can now act — every action still waits for your approval."
          : "Salt is now read-only across all connectors.",
      );
      router.refresh();
    } else {
      setLocalTrust(previous);
      toast.error(result.error);
    }
  };

  return (
    <SettingsSection
      title="What Salt is allowed to do"
      description="One switch for every connector. Plays you approve carry their own permissions."
    >
      <SettingsCard>
        <div className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="flex flex-wrap gap-1.5"
            role="radiogroup"
            aria-label="Salt trust level"
          >
            <button
              type="button"
              role="radio"
              aria-checked={localTrust === "read_only"}
              disabled={saving}
              onClick={() => handleChange("read_only")}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                localTrust === "read_only"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              Read-only
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={localTrust === "act_with_approval"}
              disabled={saving}
              onClick={() => handleChange("act_with_approval")}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                localTrust === "act_with_approval"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              Act with approval
            </button>
          </div>
          {saving ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : null}
        </div>
        <p className="mt-2 text-xs leading-snug text-muted-foreground">
          {localTrust === "read_only"
            ? "Salt can look at your connected accounts, never act on them."
            : "Salt can prepare and take actions — each one waits for your approval first."}
        </p>
        </div>
      </SettingsCard>
    </SettingsSection>
  );
}

// Catalog ids without a branded icon yet fall back to the shared helper.
const CONNECTOR_ICONS: Partial<
  Record<
    ConnectorCatalogId,
    { Icon: React.ComponentType<{ className?: string; color?: string }>; color?: string }
  >
> = {
  google: { Icon: SiGmail, color: "#EA4335" },
  "google-calendar": { Icon: SiGooglecalendar, color: "#4285F4" },
  "google-drive": { Icon: SiGoogledrive, color: "#4285F4" },
  "google-docs": { Icon: SiGoogledocs, color: "#4285F4" },
  "google-sheets": { Icon: SiGooglesheets, color: "#34A853" },
  "google-slides": { Icon: SiGoogleslides, color: "#FBBC04" },
  stripe: { Icon: SiStripe, color: "#635BFF" },
};

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

function sectionTitle(tab: ConnectorTab, category: ConnectorDefinition["category"] | "all"): string {
  if (tab === "discover" && category !== "all") {
    return categoryLabel(category);
  }
  switch (tab) {
    case "connected":
      return "Connected";
    case "available":
      return "Available";
    case "all":
      return "All connectors";
    default:
      return "Recommended";
  }
}

interface ConnectorCardProps {
  definition: ConnectorDefinition;
  status: ConnectorRuntimeStatus;
  loading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

function ConnectorCard({
  definition,
  status,
  loading,
  onConnect,
  onDisconnect,
}: ConnectorCardProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const disabled = loading || definition.comingSoon;
  const iconMeta = CONNECTOR_ICONS[definition.id] ?? FALLBACK_CONNECTOR_ICON;
  const Icon = iconMeta.Icon;

  return (
    <div className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted ring-soft">
          <Icon
            className={cn("size-5", !iconMeta.color && "text-foreground/80")}
            color={iconMeta.color}
          />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">{definition.name}</p>
            {definition.nativeBadge && (
              <span className="chip">{definition.nativeBadge}</span>
            )}
            {definition.comingSoon && (
              <span className="chip text-muted-foreground">Coming soon</span>
            )}
          </div>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
            {definition.description}
          </p>
          {status.connected && status.label && (
            <p className="mt-1 text-xs text-muted-foreground">{status.label}</p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center sm:justify-end">
        {status.connected && mounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={disabled} className="gap-1.5">
                <CheckCircle2 className="size-3.5 text-success" />
                Connected
              </Button>
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
        ) : status.connected ? (
          <Button variant="outline" size="sm" disabled className="gap-1.5">
            <CheckCircle2 className="size-3.5 text-success" />
            Connected
          </Button>
        ) : (
          <Button size="sm" onClick={onConnect} disabled={disabled} className="min-w-24">
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Connecting
              </>
            ) : definition.comingSoon ? (
              "Soon"
            ) : (
              "Connect"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function filterByTab(
  entries: Array<{ definition: ConnectorDefinition; status: ConnectorRuntimeStatus }>,
  tab: ConnectorTab,
): typeof entries {
  switch (tab) {
    case "connected":
      return entries.filter(({ status, definition }) => status.connected && !definition.comingSoon);
    case "available":
      return entries.filter(({ status, definition }) => !status.connected && !definition.comingSoon);
    case "discover":
      return entries.filter(
        ({ definition }) =>
          definition.category === "recommended" || definition.category === "productivity",
      );
    case "all":
    default:
      return entries;
  }
}

export function ConnectorsCatalog({
  data,
  onConnect,
  onDisconnect,
  loadingId,
}: ConnectorsCatalogProps) {
  const [tab, setTab] = React.useState<ConnectorTab>("discover");
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<string>("all");

  const catalogEntries = React.useMemo(() => {
    return getCatalogConnectors().map((definition) => ({
      definition,
      status: data.connectors[definition.id] ?? { connected: false },
    }));
  }, [data.connectors]);

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

  return (
    <div className="space-y-6">
      <WorkspaceTrustSection
        trustLevel={data.workspaceTrustLevel ?? "read_only"}
      />

      <SettingsSection
        title="Browse connectors"
        description="Connect the accounts Salt reads from. Salt asks before sending messages or running Plays."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search connectors"
              className="rounded-full pl-9 ring-soft"
              aria-label="Search connectors"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full rounded-full sm:w-48" aria-label="Filter by category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {getCatalogCategories().map((item) => (
                <SelectItem key={item} value={item}>
                  {categoryLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SettingsSection>

      <Tabs value={tab} onValueChange={(value) => setTab(value as ConnectorTab)}>
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="connected">Connected</TabsTrigger>
          <TabsTrigger value="available">Available</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-6 space-y-8">
          {groupedEntries.length === 0 ? (
            <SettingsCard>
              <div className="px-5 py-10 text-center text-sm text-muted-foreground sm:px-6">
                No connectors match your search.
              </div>
            </SettingsCard>
          ) : (
            groupedEntries.map((group) => (
              <SettingsSection key={group.category} title={sectionTitle(tab, group.category)}>
                <SettingsCard>
                  {group.entries.map(({ definition, status }, index) => (
                    <div
                      key={definition.id}
                      className={cn(index > 0 && "border-t border-border/60")}
                    >
                      <ConnectorCard
                        definition={definition}
                        status={status}
                        loading={loadingId === definition.id}
                        onConnect={() => handleConnect(definition.id)}
                        onDisconnect={() => onDisconnect(definition.id)}
                      />
                    </div>
                  ))}
                </SettingsCard>
              </SettingsSection>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
