"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CirclePlus,
  ExternalLink,
  Headphones,
  Loader2,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui";
import { cn } from "@repo/utils";
import {
  CONNECTOR_CATALOG_BY_ID,
  getConnectorCapabilities,
  supportsToolPreferences,
  type ConnectorActivityEntry,
  type ConnectorCapability,
  type ConnectorCatalogId,
  type ConnectorEmailMode,
  type ConnectorTrustLevel,
  type ConnectorTrustSettings,
  type ConnectorsPageData,
} from "@/app/_features/connectors";
import { formatToolName } from "@/app/_features/ask-salt/tool-preview";
import { fetchConnectorActivity, updateConnectorTrustSettings } from "../actions";
import { CONNECTOR_ICONS } from "./connector-icons";

interface ConnectorDetailModalProps {
  connectorId: ConnectorCatalogId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ConnectorsPageData;
  loading: boolean;
  savingPreferences: boolean;
  onConnect: (id: ConnectorCatalogId) => void;
  onDisconnect: (id: ConnectorCatalogId) => void;
  onSaveToolPreferences: (
    id: ConnectorCatalogId,
    disabledTools: string[],
  ) => Promise<boolean>;
}

interface ConnectorLink {
  label: string;
  href: string;
}

interface ConnectorMeta {
  displayName: string;
  tagline: string;
  developedBy: string;
  links: ConnectorLink[];
}

const CONNECTOR_META: Partial<Record<ConnectorCatalogId, ConnectorMeta>> = {
  google: {
    displayName: "Gmail",
    tagline: "Search, read, and send email — sends only after you approve.",
    developedBy: "Google",
    links: [
      { label: "Website", href: "https://www.google.com/gmail/about/" },
      {
        label: "Documentation",
        href: "https://developers.google.com/workspace/gmail/api/guides",
      },
      { label: "Support", href: "https://support.google.com/mail" },
    ],
  },
  "google-calendar": {
    displayName: "Google Calendar",
    tagline: "Events and availability — Salt schedules only with your approval.",
    developedBy: "Google",
    links: [
      { label: "Website", href: "https://calendar.google.com" },
      {
        label: "Documentation",
        href: "https://developers.google.com/workspace/calendar/api/guides/overview",
      },
      { label: "Support", href: "https://support.google.com/calendar" },
    ],
  },
  stripe: {
    displayName: "Stripe",
    tagline: "Accept payments and track payout status through Salt.",
    developedBy: "Stripe",
    links: [
      { label: "Website", href: "https://stripe.com" },
      { label: "Documentation", href: "https://docs.stripe.com/connect" },
      { label: "Support", href: "https://support.stripe.com" },
    ],
  },
  "google-drive": {
    displayName: "Google Drive",
    tagline: "Files and shared documents for client work.",
    developedBy: "Google",
    links: [
      { label: "Website", href: "https://www.google.com/drive/" },
      {
        label: "Documentation",
        href: "https://developers.google.com/workspace/drive/api/guides/about-sdk",
      },
      { label: "Support", href: "https://support.google.com/drive" },
    ],
  },
};

function getConnectorMeta(
  connectorId: ConnectorCatalogId,
  fallbackName: string,
  fallbackDescription: string,
): ConnectorMeta {
  return (
    CONNECTOR_META[connectorId] ?? {
      displayName: fallbackName,
      tagline: fallbackDescription,
      developedBy: fallbackName,
      links: [],
    }
  );
}

function filterCapabilities(
  capabilities: ConnectorCapability[],
  query: string,
): ConnectorCapability[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return capabilities;
  }

  return capabilities.filter(
    (capability) =>
      capability.label.toLowerCase().includes(normalized) ||
      capability.description?.toLowerCase().includes(normalized),
  );
}

function bulkCategoryState(
  capabilities: ConnectorCapability[],
  disabledTools: string[],
): "allow" | "disable" | "mixed" {
  const slugs = capabilities
    .map((capability) => capability.toolSlug)
    .filter((slug): slug is string => Boolean(slug));

  if (slugs.length === 0) {
    return "allow";
  }

  const disabledCount = slugs.filter((slug) => disabledTools.includes(slug)).length;
  if (disabledCount === 0) {
    return "allow";
  }
  if (disabledCount === slugs.length) {
    return "disable";
  }
  return "mixed";
}

interface ToolAllowToggleProps {
  enabled: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void;
}

function ToolAllowToggle({ enabled, disabled, onChange }: ToolAllowToggleProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 rounded-lg border border-border/70 bg-muted/30 p-0.5",
        disabled && "opacity-50",
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(false)}
        className={cn(
          "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          !enabled
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Disable
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(true)}
        className={cn(
          "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          enabled
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Allow
      </button>
    </div>
  );
}

interface ToolCategorySectionProps {
  title: string;
  capabilities: ConnectorCapability[];
  disabledTools: string[];
  canManageTools: boolean;
  controlsDisabled: boolean;
  onBulkChange: (slugs: string[], enabled: boolean) => void;
  onToolChange: (toolSlug: string, enabled: boolean) => void;
}

function ToolCategorySection({
  title,
  capabilities,
  disabledTools,
  canManageTools,
  controlsDisabled,
  onBulkChange,
  onToolChange,
}: ToolCategorySectionProps) {
  if (capabilities.length === 0) {
    return null;
  }

  const slugs = capabilities
    .map((capability) => capability.toolSlug)
    .filter((slug): slug is string => Boolean(slug));
  const bulkState = bulkCategoryState(capabilities, disabledTools);
  const bulkLabel =
    bulkState === "mixed" ? "Mixed" : bulkState === "allow" ? "Allow" : "Disable";

  return (
    <section className="rounded-xl border border-border/70">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-muted/20 px-4 py-2.5">
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        {slugs.length > 0 && canManageTools ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 rounded-lg px-2.5 text-xs"
                disabled={controlsDisabled}
              >
                {bulkLabel}
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onBulkChange(slugs, true)}>
                Allow all
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkChange(slugs, false)}>
                Disable all
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <ul className="divide-y divide-border/60">
        {capabilities.map((capability) => {
          const toolSlug = capability.toolSlug;
          const enabled = toolSlug ? !disabledTools.includes(toolSlug) : true;
          const rowControlsDisabled =
            controlsDisabled || !toolSlug || !canManageTools;

          return (
            <li
              key={capability.id}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] items-center gap-4 px-4 py-2"
            >
              <p className="text-sm font-medium text-foreground">{capability.label}</p>
              <p className="text-sm text-muted-foreground">
                {capability.description ?? "—"}
              </p>
              {toolSlug ? (
                <ToolAllowToggle
                  enabled={enabled}
                  disabled={rowControlsDisabled}
                  onChange={(nextEnabled) => onToolChange(toolSlug, nextEnabled)}
                />
              ) : (
                <span className="rounded-lg border border-border/60 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
                  Included
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ConnectorDetailModal({
  connectorId,
  open,
  onOpenChange,
  data,
  loading,
  savingPreferences,
  onConnect,
  onDisconnect,
  onSaveToolPreferences,
}: ConnectorDetailModalProps) {
  const definition = connectorId ? CONNECTOR_CATALOG_BY_ID[connectorId] : null;
  const status = connectorId ? data.connectors[connectorId] : undefined;
  const capabilities = connectorId ? getConnectorCapabilities(connectorId) : null;
  const serverDisabledTools =
    (connectorId && data.disabledToolsByConnector[connectorId]) ?? [];

  const [localDisabledTools, setLocalDisabledTools] =
    React.useState<string[]>(serverDisabledTools);
  const [toolQuery, setToolQuery] = React.useState("");
  const [panelTab, setPanelTab] = React.useState<"tools" | "activity">("tools");
  const [activity, setActivity] = React.useState<ConnectorActivityEntry[] | null>(null);
  const [activityLoading, setActivityLoading] = React.useState(false);

  const router = useRouter();
  const serverTrustSettings = connectorId
    ? data.settingsByConnector[connectorId]
    : undefined;
  const [localTrustSettings, setLocalTrustSettings] = React.useState<
    ConnectorTrustSettings | undefined
  >(serverTrustSettings);
  const [savingTrust, setSavingTrust] = React.useState(false);

  React.useEffect(() => {
    setLocalTrustSettings(serverTrustSettings);
  }, [connectorId, serverTrustSettings?.trustLevel, serverTrustSettings?.emailMode]);

  React.useEffect(() => {
    setLocalDisabledTools(serverDisabledTools);
  }, [connectorId, serverDisabledTools.join("|")]);

  React.useEffect(() => {
    if (!open) {
      setToolQuery("");
    }
  }, [open]);

  React.useEffect(() => {
    setPanelTab("tools");
    setActivity(null);
  }, [connectorId]);

  React.useEffect(() => {
    if (!open || panelTab !== "activity" || activity !== null || !connectorId) {
      return;
    }
    let cancelled = false;
    setActivityLoading(true);
    void fetchConnectorActivity(connectorId)
      .then((result) => {
        if (!cancelled) {
          setActivity(result.success ? result.data : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setActivity([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setActivityLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, panelTab, activity, connectorId]);

  if (!connectorId || !definition || !capabilities) {
    return null;
  }

  const meta = getConnectorMeta(
    connectorId,
    definition.name,
    definition.description,
  );
  const iconMeta = CONNECTOR_ICONS[connectorId];
  const Icon = iconMeta.Icon;
  const canManageTools =
    supportsToolPreferences(connectorId) && (status?.connected ?? false);
  const showConnectCta = !definition.comingSoon && !status?.connected;
  const showDisconnectCta = status?.connected && !definition.comingSoon;
  const controlsDisabled = savingPreferences || loading;
  const hasToolSections =
    capabilities.read.length > 0 || capabilities.write.length > 0;

  const filteredRead = filterCapabilities(capabilities.read, toolQuery);
  const filteredWrite = filterCapabilities(capabilities.write, toolQuery);

  const persistDisabledTools = async (nextDisabled: string[]) => {
    setLocalDisabledTools(nextDisabled);
    const ok = await onSaveToolPreferences(connectorId, nextDisabled);
    if (!ok) {
      setLocalDisabledTools(serverDisabledTools);
    }
  };

  const handleToolChange = async (toolSlug: string, enabled: boolean) => {
    const nextDisabled = enabled
      ? localDisabledTools.filter((slug) => slug !== toolSlug)
      : [...new Set([...localDisabledTools, toolSlug])];
    await persistDisabledTools(nextDisabled);
  };

  const handleBulkChange = async (slugs: string[], enabled: boolean) => {
    const nextDisabled = enabled
      ? localDisabledTools.filter((slug) => !slugs.includes(slug))
      : [...new Set([...localDisabledTools, ...slugs])];
    await persistDisabledTools(nextDisabled);
  };

  const handleTrustSettingsChange = async (next: {
    trustLevel: ConnectorTrustLevel;
    emailMode?: ConnectorEmailMode;
  }) => {
    if (!connectorId) {
      return;
    }
    const previous = localTrustSettings;
    setLocalTrustSettings({
      trustLevel: next.trustLevel,
      emailMode: next.emailMode ?? previous?.emailMode ?? "draft",
    });
    setSavingTrust(true);
    const result = await updateConnectorTrustSettings({
      connectorId,
      trustLevel: next.trustLevel,
      emailMode: connectorId === "google" ? next.emailMode : undefined,
    });
    setSavingTrust(false);
    if (result.success) {
      router.refresh();
    } else {
      setLocalTrustSettings(previous);
    }
  };

  const linkIcon = (label: string) => {
    switch (label) {
      case "Documentation":
        return BookOpen;
      case "Support":
        return Headphones;
      default:
        return ExternalLink;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(580px,78vh)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-6xl">
        <div className="flex items-start justify-between gap-4 border-b border-border/70 px-6 py-3.5 pr-14">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex shrink-0 items-center gap-1">
              <div className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-background">
                <Icon
                  className={cn("size-5", !iconMeta.color && "text-foreground/85")}
                  color={iconMeta.color}
                />
              </div>
            </div>

            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-left text-xl font-semibold tracking-tight">
                {meta.displayName}
              </DialogTitle>
              <DialogDescription className="text-left text-sm text-muted-foreground">
                {meta.tagline}
              </DialogDescription>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {status?.connected ? (
                  <span className="text-xs font-medium text-success">Connected</span>
                ) : definition.comingSoon ? (
                  <span className="text-xs text-muted-foreground">Coming soon</span>
                ) : null}
                {status?.connected && status.label ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {status.label}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 pt-1">
            {showDisconnectCta ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => onDisconnect(connectorId)}
              >
                Disconnect
              </Button>
            ) : null}
            {showConnectCta ? (
              <Button
                type="button"
                size="sm"
                className="rounded-full px-4"
                disabled={loading}
                onClick={() => onConnect(connectorId)}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Connecting
                  </>
                ) : (
                  "Add connector"
                )}
              </Button>
            ) : null}
            {definition.comingSoon ? (
              <Button type="button" size="sm" className="rounded-full px-4" disabled>
                Coming soon
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(220px,252px)_minmax(0,1fr)]">
          <aside className="space-y-5 overflow-y-auto border-b border-border/70 px-6 py-4 lg:border-b-0 lg:border-r">
            <section className="space-y-2.5">
              <h3 className="text-sm font-semibold text-foreground">Overview</h3>
              <ul className="space-y-2">
                {capabilities.overviewBullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2 text-[13px] leading-snug text-muted-foreground">
                    <CirclePlus className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </section>

            {supportsToolPreferences(connectorId) ? (
              <ConnectorPermissionsSection
                isGmail={connectorId === "google"}
                connected={Boolean(status?.connected)}
                settings={localTrustSettings}
                saving={savingTrust}
                disabled={controlsDisabled || !status?.connected}
                onChange={handleTrustSettingsChange}
              />
            ) : null}

            {meta.links.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Links</h3>
                <ul className="space-y-1.5">
                  {meta.links.map((link) => {
                    const LinkIcon = linkIcon(link.label);
                    return (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <LinkIcon className="size-3.5" />
                          {link.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            <section className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Developed by</h3>
              <p className="text-sm text-muted-foreground">{meta.developedBy}</p>
            </section>
          </aside>

          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border/70 px-6 py-3">
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-1"
                  role="tablist"
                  aria-label="Connector detail sections"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={panelTab === "tools"}
                    onClick={() => setPanelTab("tools")}
                    className={cn(
                      "rounded-full px-3 py-1 text-sm font-medium transition",
                      panelTab === "tools"
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Tools
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={panelTab === "activity"}
                    onClick={() => setPanelTab("activity")}
                    className={cn(
                      "rounded-full px-3 py-1 text-sm font-medium transition",
                      panelTab === "activity"
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Activity
                  </button>
                </div>
                {savingPreferences ? (
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                ) : null}
              </div>
              {panelTab === "tools" && hasToolSections ? (
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={toolQuery}
                    onChange={(event) => setToolQuery(event.target.value)}
                    placeholder="Search tools"
                    aria-label="Search tools"
                    className="h-9 w-full rounded-lg border border-border/70 bg-background pl-9 pr-3 text-sm outline-none transition focus:ring-4 focus:ring-foreground/5"
                  />
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-3 pb-5">
              {panelTab === "activity" ? (
                <ConnectorActivityList entries={activity} loading={activityLoading} />
              ) : (
                <>
                  {!hasToolSections ? (
                    <p className="text-sm text-muted-foreground">
                      Tool permissions will appear here once this connector is available.
                    </p>
                  ) : filteredRead.length === 0 && filteredWrite.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No tools match your search.
                    </p>
                  ) : (
                    <>
                      <ToolCategorySection
                        title="Read-only tools"
                        capabilities={filteredRead}
                        disabledTools={localDisabledTools}
                        canManageTools={canManageTools}
                        controlsDisabled={controlsDisabled}
                        onBulkChange={handleBulkChange}
                        onToolChange={handleToolChange}
                      />
                      <ToolCategorySection
                        title="Write / delete tools"
                        capabilities={filteredWrite}
                        disabledTools={localDisabledTools}
                        canManageTools={canManageTools}
                        controlsDisabled={controlsDisabled}
                        onBulkChange={handleBulkChange}
                        onToolChange={handleToolChange}
                      />
                    </>
                  )}

                  {supportsToolPreferences(connectorId) && !canManageTools ? (
                    <p className="text-xs text-muted-foreground">
                      Connect {meta.displayName} to manage which tools Salt can use.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PermissionPill({
  label,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-foreground/20 bg-muted text-foreground"
          : "border-border/60 text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function ConnectorPermissionsSection({
  isGmail,
  connected,
  settings,
  saving,
  disabled,
  onChange,
}: {
  isGmail: boolean;
  connected: boolean;
  settings: ConnectorTrustSettings | undefined;
  saving: boolean;
  disabled: boolean;
  onChange: (next: {
    trustLevel: ConnectorTrustLevel;
    emailMode?: ConnectorEmailMode;
  }) => void;
}) {
  const trustLevel = settings?.trustLevel ?? "read_only";
  const emailMode = settings?.emailMode ?? "draft";

  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">Permissions</h3>
        {saving ? (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      <div className="space-y-1.5">
        <div
          className="flex flex-wrap gap-1.5"
          role="radiogroup"
          aria-label="Trust level"
        >
          <PermissionPill
            label="Read-only"
            selected={trustLevel === "read_only"}
            disabled={disabled}
            onSelect={() => onChange({ trustLevel: "read_only", emailMode })}
          />
          <PermissionPill
            label="Act with approval"
            selected={trustLevel === "act_with_approval"}
            disabled={disabled}
            onSelect={() => onChange({ trustLevel: "act_with_approval", emailMode })}
          />
        </div>
        <p className="text-xs leading-snug text-muted-foreground">
          {trustLevel === "read_only"
            ? "Salt can look, never act. Upgrade when you want Salt to prepare work here."
            : "Salt can act — every action waits for your approval first."}
        </p>
      </div>

      {isGmail ? (
        <div className="space-y-1.5">
          <div
            className="flex flex-wrap gap-1.5"
            role="radiogroup"
            aria-label="Email mode"
          >
            <PermissionPill
              label="Draft"
              selected={emailMode === "draft"}
              disabled={disabled || trustLevel === "read_only"}
              onSelect={() => onChange({ trustLevel, emailMode: "draft" })}
            />
            <PermissionPill
              label="Send"
              selected={emailMode === "send"}
              disabled={disabled || trustLevel === "read_only"}
              onSelect={() => onChange({ trustLevel, emailMode: "send" })}
            />
          </div>
          <p className="text-xs leading-snug text-muted-foreground">
            {emailMode === "draft"
              ? "Salt prepares drafts in your Gmail — nothing sends until you do."
              : "Salt can send email after you approve each message."}
          </p>
        </div>
      ) : null}

      {!connected ? (
        <p className="text-xs text-muted-foreground">
          Connect this app to manage its permissions.
        </p>
      ) : null}
    </section>
  );
}

const ACTIVITY_SOURCE_LABELS: Record<ConnectorActivityEntry["source"], string> = {
  ask_salt: "Ask Salt",
  server_action: "App action",
  background: "Background",
};

function activityStatusIcon(status: ConnectorActivityEntry["status"]) {
  switch (status) {
    case "success":
      return <CheckCircle2 className="size-4 text-success" strokeWidth={1.75} />;
    case "error":
      return <XCircle className="size-4 text-destructive" strokeWidth={1.75} />;
    case "blocked":
      return <ShieldAlert className="size-4 text-warning" strokeWidth={1.75} />;
  }
}

function activitySummary(entry: ConnectorActivityEntry): string | null {
  if (!entry.argsSummary) {
    return null;
  }
  const parts = Object.entries(entry.argsSummary)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .slice(0, 3)
    .map(
      ([key, value]) =>
        `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`,
    );
  return parts.length > 0 ? parts.join(" · ") : null;
}

function ConnectorActivityList({
  entries,
  loading,
}: {
  entries: ConnectorActivityEntry[] | null;
  loading: boolean;
}) {
  if (loading || entries === null) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading activity
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="space-y-1 py-6">
        <p className="text-sm font-medium text-foreground">No activity yet</p>
        <p className="text-sm text-muted-foreground">
          Salt records every action it takes with this connector — reads, approved
          sends, and anything it blocked.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry) => {
        const summary = activitySummary(entry);
        return (
          <li
            key={entry.id}
            className="flex gap-3 rounded-xl border border-border/60 bg-card/60 px-3 py-2.5"
          >
            <div className="mt-0.5 shrink-0">{activityStatusIcon(entry.status)}</div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="text-[13px] font-medium text-foreground">
                  {formatToolName(entry.toolSlug)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {ACTIVITY_SOURCE_LABELS[entry.source]}
                  {entry.approvedBy ? " · approved" : ""}
                  {" · "}
                  {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                </span>
              </div>
              {summary ? (
                <p className="truncate text-xs text-muted-foreground">{summary}</p>
              ) : null}
              {entry.status !== "success" && entry.error ? (
                <p className="text-xs text-destructive">{entry.error}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
