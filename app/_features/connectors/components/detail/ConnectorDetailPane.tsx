"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  CirclePlus,
  ExternalLink,
  Headphones,
  Loader2,
  Search,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import {
  memoryTabsListClass,
  memoryTabTriggerClass,
} from "@/app/_features/memory/utils/memory-layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui";
import type {
  ConnectorActivityEntry,
  ConnectorCapabilityGroups,
  ConnectorCatalogId,
  ConnectorEmailMode,
  ConnectorTrustSettings,
  ConnectorsPageData,
} from "@/app/_features/connectors";
import { catalogById } from "@/app/_features/connectors/catalog-view";
import { connectorsPageUrl } from "@/app/_features/connectors/constants";
import {
  fetchConnectorActivity,
  updateConnectorEmailMode,
  updateConnectorToolPreferences,
} from "../../actions";
import { setCaptureEnabled } from "../../actions/capture-toggle";
import { connectGoogle } from "../../actions/gmail/connect";
import { disconnectGmail } from "../../actions/gmail/disconnect";
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
} from "../../actions/calendar/connect";
import {
  connectComposioApiKeyProvider,
  connectComposioProvider,
  disconnectComposioProvider,
} from "../../actions/composio-connect";
import {
  createSaveQueue,
  type SaveQueue,
  type SaveQueueStatus,
} from "../../hooks/save-queue";
import { ConnectorIcon } from "../connector-icons";
import { ApiKeyConnectDialog } from "../ApiKeyConnectDialog";
import { getConnectorMeta } from "./connector-meta";
import { ToolCategorySection, filterCapabilities } from "./ToolCategorySection";
import { ToolPermissionsToolbar } from "./ToolPermissionsToolbar";
import {
  buildToolEmptyMessage,
  shouldShowToolSection,
  type ToolRiskFilter,
} from "./tool-risk-filter-control";
import {
  ConnectorCaptureSection,
  ConnectorPermissionsSection,
} from "./side-sections";
import { ConnectorActivityList, ACTIVITY_TIME_FILTERS, filterConnectorActivity, type ActivityTimeFilter } from "./ConnectorActivityList";

/** Recent activity rows shown on Overview before sending people to the Activity tab. */
const OVERVIEW_ACTIVITY_PREVIEW = 5;

interface ConnectorDetailPaneProps {
  connectorId: ConnectorCatalogId;
  data: ConnectorsPageData;
  /** Server-loaded tool groups (DB-driven, curated fallback) — no client fetch flash. */
  toolGroups: ConnectorCapabilityGroups | null;
  /**
   * Embedded in the Plays Connectors tab (grid ↔ detail swap in place) rather
   * than the standalone /connectors/[id] route. Changes the back affordance
   * and the OAuth return path.
   */
  embedded?: boolean;
  /** Return to the grid (embedded mode). */
  onBack?: () => void;
  /** Where OAuth redirects back to (default: the standalone connector page). */
  oauthReturnUrl?: string;
  /**
   * Embedded Plays tab keeps connectors in a client cache — router.refresh()
   * does not update it. Call this after connect/disconnect/capture mutations.
   */
  onConnectorsChanged?: () => void;
  /** Optimistic UI patch before the cache refetch lands. */
  onConnectionChange?: (change: {
    connectorId: ConnectorCatalogId;
    connected: boolean;
  }) => void;
}

function linkIcon(label: string) {
  switch (label) {
    case "Documentation":
      return BookOpen;
    case "Support":
      return Headphones;
    default:
      return ExternalLink;
  }
}

/**
 * Full-page connector detail pane for /connectors/[connectorId]. Ports the
 * ConnectorDetailModal content into a master-detail layout: header with
 * Connect/Disconnect, Overview/Tools tabs, and sidebar sections for permissions,
 * memory capture, and connector links.
 */
export function ConnectorDetailPane({
  connectorId,
  data,
  toolGroups,
  embedded = false,
  onBack,
  oauthReturnUrl,
  onConnectorsChanged,
  onConnectionChange,
}: ConnectorDetailPaneProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const definitionsById = React.useMemo(() => catalogById(data.catalog), [data.catalog]);
  const definition = definitionsById[connectorId] ?? null;
  const status = data.connectors[connectorId];
  const connected = Boolean(status?.connected);
  // Expired connection: not "connected", but was — show reconnect, not connect.
  const needsReconnect = Boolean(status?.needsReconnect);

  const serverDisabledTools = React.useMemo(
    () => data.disabledToolsByConnector[connectorId] ?? [],
    [data.disabledToolsByConnector, connectorId],
  );

  // Local state initializes from the server render; it is NOT re-synced per
  // toggle — the server data is only re-read on navigation (P0: no
  // router.refresh round trip per toggle).
  const [localDisabledTools, setLocalDisabledTools] =
    React.useState<string[]>(serverDisabledTools);
  const lastPersistedRef = React.useRef<string[]>(serverDisabledTools);
  const [saveStatus, setSaveStatus] = React.useState<SaveQueueStatus>("idle");
  const [toolQuery, setToolQuery] = React.useState("");
  const [toolRiskFilter, setToolRiskFilter] = React.useState<ToolRiskFilter>("all");

  React.useEffect(() => {
    setToolQuery("");
    setToolRiskFilter("all");
  }, [connectorId]);
  const [activityQuery, setActivityQuery] = React.useState("");
  const [activityTimeFilter, setActivityTimeFilter] =
    React.useState<ActivityTimeFilter>("all");
  const [tab, setTab] = React.useState("overview");

  const [activity, setActivity] = React.useState<ConnectorActivityEntry[] | null>(null);
  const [activityLoading, setActivityLoading] = React.useState(false);

  const serverTrustSettings = data.settingsByConnector[connectorId];
  const [localTrustSettings, setLocalTrustSettings] = React.useState<
    ConnectorTrustSettings | undefined
  >(serverTrustSettings);
  const [savingTrust, setSavingTrust] = React.useState(false);

  const captureState = data.captureByConnector[connectorId];
  const [localCaptureEnabled, setLocalCaptureEnabled] = React.useState(
    captureState?.enabled ?? false,
  );
  const [savingCapture, setSavingCapture] = React.useState(false);

  const [connecting, setConnecting] = React.useState(false);
  const [disconnecting, setDisconnecting] = React.useState(false);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = React.useState(false);

  // Debounced batch save: persist the FINAL disabledTools array ~600ms after
  // the last toggle; revert to the last persisted state on failure.
  const saveQueueRef = React.useRef<SaveQueue<string[]> | null>(null);
  if (saveQueueRef.current === null) {
    saveQueueRef.current = createSaveQueue<string[]>({
      save: async (disabledTools) => {
        const result = await updateConnectorToolPreferences({
          connectorId,
          disabledTools,
        });
        return result.success
          ? { success: true }
          : { success: false, error: result.error };
      },
      onSaved: (value) => {
        lastPersistedRef.current = value;
      },
      onError: (_value, error) => {
        toast.error(error);
        setLocalDisabledTools(lastPersistedRef.current);
      },
      onStatusChange: setSaveStatus,
    });
  }

  React.useEffect(() => {
    const queue = saveQueueRef.current;
    return () => {
      // Persist any still-pending toggles when leaving the page.
      queue?.flush();
    };
  }, []);

  // "Saved" is a moment, not a state — settle back to idle.
  React.useEffect(() => {
    if (saveStatus !== "saved") {
      return;
    }
    const timer = setTimeout(() => setSaveStatus("idle"), 2000);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  // OAuth return: the callback redirects to /connectors/[id] with result params.
  const googleConnected =
    searchParams.get("gmail_connected") ?? searchParams.get("google_connected");
  const googleError =
    searchParams.get("gmail_error") ?? searchParams.get("google_error");

  const returnUrl =
    oauthReturnUrl ?? connectorsPageUrl({ connector: connectorId });

  React.useEffect(() => {
    if (!definition) {
      return;
    }
    if (googleConnected === "true") {
      toast.success(`${definition.name} connected!`);
      window.history.replaceState({}, "", returnUrl);
    } else if (googleError) {
      toast.error(`Failed to connect: ${googleError}`);
      window.history.replaceState({}, "", returnUrl);
    }
  }, [googleConnected, googleError, returnUrl, definition]);

  // Activity loads lazily when Overview or Activity is opened.
  React.useEffect(() => {
    if ((tab !== "overview" && tab !== "activity") || activity !== null) {
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
  }, [tab, activity, connectorId]);

  const filteredActivity = React.useMemo(
    () =>
      activity
        ? filterConnectorActivity(activity, activityQuery, activityTimeFilter)
        : null,
    [activity, activityQuery, activityTimeFilter],
  );
  const activityFiltersActive =
    activityQuery.trim().length > 0 || activityTimeFilter !== "all";
  const activitySummaryLabel = React.useMemo(() => {
    const total = activity?.length ?? 0;
    const visible = filteredActivity?.length ?? 0;
    if (activityLoading || activity === null) {
      return "Loading activity…";
    }
    if (total === 0) {
      return "No events recorded yet";
    }
    if (activityFiltersActive && visible !== total) {
      return `${visible} of ${total} events`;
    }
    return `${total} ${total === 1 ? "event" : "events"}`;
  }, [activity, activityLoading, activityFiltersActive, filteredActivity]);

  if (!definition) {
    return null;
  }

  const meta = getConnectorMeta(connectorId, definition.name, definition.description);
  const recentActivity = activity ? activity.slice(0, OVERVIEW_ACTIVITY_PREVIEW) : null;
  const hasMoreActivity = (activity?.length ?? 0) > OVERVIEW_ACTIVITY_PREVIEW;

  const capabilities = toolGroups;
  const hasToolSections = Boolean(
    capabilities && (capabilities.read.length > 0 || capabilities.write.length > 0),
  );
  const hasToggleableTools = Boolean(
    capabilities &&
      [...capabilities.read, ...capabilities.write].some((capability) =>
        Boolean(capability.toolSlug),
      ),
  );
  const canManageTools = hasToggleableTools && connected;

  const readCount = capabilities?.read.length ?? 0;
  const writeCount = capabilities?.write.length ?? 0;
  const totalCount = readCount + writeCount;

  const filteredRead = capabilities
    ? filterCapabilities(capabilities.read, toolQuery)
    : [];
  const filteredWrite = capabilities
    ? filterCapabilities(capabilities.write, toolQuery)
    : [];
  const showFilteredRead = shouldShowToolSection(
    toolRiskFilter,
    "read",
    filteredRead.length,
  );
  const showFilteredWrite = shouldShowToolSection(
    toolRiskFilter,
    "write",
    filteredWrite.length,
  );
  const noVisibleTools = !showFilteredRead && !showFilteredWrite;

  const applyDisabledTools = (nextDisabled: string[]) => {
    setLocalDisabledTools(nextDisabled);
    saveQueueRef.current?.schedule(nextDisabled);
  };

  const handleToolChange = (toolSlug: string, enabled: boolean) => {
    applyDisabledTools(
      enabled
        ? localDisabledTools.filter((slug) => slug !== toolSlug)
        : [...new Set([...localDisabledTools, toolSlug])],
    );
  };

  const handleBulkChange = (slugs: string[], enabled: boolean) => {
    applyDisabledTools(
      enabled
        ? localDisabledTools.filter((slug) => !slugs.includes(slug))
        : [...new Set([...localDisabledTools, ...slugs])],
    );
  };

  const startOAuthConnect = async (
    action: () => Promise<
      { success: true; url: string } | { success: false; error: string }
    >,
  ) => {
    setConnecting(true);
    let result: Awaited<ReturnType<typeof action>>;
    try {
      result = await action();
    } catch {
      result = { success: false, error: "Connection failed. Please try again." };
    }
    if (!result.success) {
      toast.error(result.error || `Failed to connect ${definition.name}`);
      setConnecting(false);
      return;
    }
    // Same-tab OAuth: the callback redirects back to this connector page.
    window.location.href = result.url;
  };

  const handleConnect = async () => {
    if (!data.workspaceId) {
      toast.error("No workspace found. Please ensure you're part of a workspace.");
      return;
    }

    if (connectorId === "google") {
      await startOAuthConnect(() => connectGoogle({ returnUrl }));
      return;
    }
    if (connectorId === "google-calendar") {
      await startOAuthConnect(() => connectGoogleCalendar({ returnUrl }));
      return;
    }

    // API-key connectors (Stripe, Shopify, …) collect the key in a dialog.
    if (definition.ownership === "composio" && definition.authMethod === "api_key") {
      setApiKeyDialogOpen(true);
      return;
    }

    if (definition.ownership === "composio" && definition.providerKey) {
      const providerKey = definition.providerKey;
      await startOAuthConnect(() =>
        connectComposioProvider(providerKey, { returnUrl }),
      );
    }
  };

  const refreshConnectorsUi = () => {
    if (onConnectorsChanged) {
      onConnectorsChanged();
      return;
    }
    router.refresh();
  };

  const handleApiKeySubmit = async (
    apiKey: string,
    extraFields: Record<string, string>,
  ): Promise<boolean> => {
    if (!definition.providerKey) {
      return false;
    }
    const result = await connectComposioApiKeyProvider({
      provider: definition.providerKey,
      apiKey,
      extraFields: Object.keys(extraFields).length ? extraFields : undefined,
    });
    if (result.success) {
      toast.success(`${definition.name} connected!`);
      onConnectionChange?.({ connectorId, connected: true });
      refreshConnectorsUi();
      return true;
    }
    return false;
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);

    let result: { success: boolean; error?: string };
    if (connectorId === "google") {
      result = await disconnectGmail();
    } else if (connectorId === "google-calendar") {
      result = await disconnectGoogleCalendar();
    } else if (definition.ownership === "composio" && definition.providerKey) {
      result = await disconnectComposioProvider(definition.providerKey);
    } else {
      result = { success: false, error: "This connector can't be disconnected here." };
    }

    if (result.success) {
      toast.success(`${definition.name} disconnected`);
      // #region agent log
      fetch("http://127.0.0.1:7443/ingest/a7cd7781-629e-483f-bcc8-d958046d0b66", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a1002e" },
        body: JSON.stringify({
          sessionId: "a1002e",
          runId: "disconnect-fix",
          hypothesisId: "H1-cache",
          location: "ConnectorDetailPane:handleDisconnect",
          message: "Disconnect succeeded — refreshing connectors UI",
          data: {
            connectorId,
            embedded,
            usesCacheInvalidation: Boolean(onConnectorsChanged),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      onConnectionChange?.({ connectorId, connected: false });
      refreshConnectorsUi();
    } else {
      toast.error(result.error || `Failed to disconnect ${definition.name}`);
    }
    setDisconnecting(false);
  };

  const handleCaptureChange = async (enabled: boolean) => {
    if (!definition.providerKey) {
      return;
    }
    const previous = localCaptureEnabled;
    setLocalCaptureEnabled(enabled);
    setSavingCapture(true);
    const result = await setCaptureEnabled({
      provider: definition.providerKey,
      enabled,
    });
    setSavingCapture(false);
    if (result.success) {
      refreshConnectorsUi();
    } else {
      setLocalCaptureEnabled(previous);
      toast.error(result.error);
    }
  };

  const handleEmailModeChange = async (emailMode: ConnectorEmailMode) => {
    const previous = localTrustSettings;
    setLocalTrustSettings({
      trustLevel: previous?.trustLevel ?? "read_only",
      emailMode,
    });
    setSavingTrust(true);
    const result = await updateConnectorEmailMode({ connectorId, emailMode });
    setSavingTrust(false);
    if (!result.success) {
      setLocalTrustSettings(previous);
      toast.error(result.error);
    }
  };

  const header = (
    <header className="space-y-4">
      {embedded ? (
        // The desktop rail is the primary back path; this is for mobile,
        // where the rail is hidden below lg.
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground lg:hidden"
        >
          <ArrowLeft className="size-3.5" />
          All connectors
        </button>
      ) : (
        <Link
          href="/connectors"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground lg:hidden"
        >
          <ArrowLeft className="size-3.5" />
          Connectors
        </Link>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted/40">
            <ConnectorIcon id={connectorId} size={24} />
          </div>
          <div className="min-w-0 space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {meta.displayName}
            </h1>
            <p className="text-sm text-muted-foreground">{meta.tagline}</p>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {connected ? (
                <span className="text-xs font-medium text-success">Connected</span>
              ) : needsReconnect ? (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  Reconnect needed
                </span>
              ) : definition.comingSoon ? (
                <span className="text-xs text-muted-foreground">Coming soon</span>
              ) : null}
              {connected && status?.label ? (
                <span className="truncate text-xs text-muted-foreground">
                  {status.label}
                </span>
              ) : null}
            </div>
            {needsReconnect ? (
              <p className="max-w-xl pt-1 text-xs leading-relaxed text-muted-foreground">
                This connection expired. Reconnect so Salt keeps learning from
                it — your tool preferences are kept.
              </p>
            ) : !connected && definition.connectHelp ? (
              <p className="max-w-xl pt-1 text-xs leading-relaxed text-muted-foreground">
                {definition.connectHelp}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {connected && !definition.comingSoon ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={disconnecting}>
                  {disconnecting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Disconnecting
                    </>
                  ) : (
                    "Disconnect"
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Disconnect {meta.displayName}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Salt stops learning from this account. Your tool preferences
                    are kept.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleDisconnect()}>
                    Disconnect {meta.displayName}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
          {!connected && !definition.comingSoon ? (
            <Button
              type="button"
              className="rounded-full px-5"
              disabled={connecting}
              onClick={() => void handleConnect()}
            >
              {connecting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {needsReconnect ? "Reconnecting" : "Connecting"}
                </>
              ) : needsReconnect ? (
                `Reconnect ${meta.displayName}`
              ) : (
                `Connect ${meta.displayName}`
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
    </header>
  );

  // ---------- Pre-connect state: informed consent before OAuth ----------
  if (!connected) {
    return (
      <div className="space-y-8">
        <ApiKeyConnectDialog
          definition={definition}
          open={apiKeyDialogOpen}
          onOpenChange={setApiKeyDialogOpen}
          onSubmit={handleApiKeySubmit}
        />
        {header}

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 space-y-8">
            {capabilities && capabilities.overviewBullets.length > 0 ? (
              <section className="space-y-2.5">
                <h2 className="text-sm font-semibold text-foreground">
                  What connecting unlocks
                </h2>
                <ul className="space-y-2">
                  {capabilities.overviewBullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex gap-2 text-[13px] leading-snug text-muted-foreground"
                    >
                      <CirclePlus className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {hasToolSections ? (
              <section className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-foreground">Tools</h2>
                  <p className="text-sm text-muted-foreground">
                    {totalCount} {totalCount === 1 ? "tool" : "tools"} · {readCount} read
                    · {writeCount} write — you control every one after connecting.
                  </p>
                </div>
                {capabilities ? (
                  <>
                    <ToolCategorySection
                      category="read"
                      capabilities={capabilities.read}
                      disabledTools={[]}
                      canManageTools={false}
                      controlsDisabled
                      readOnly
                      onBulkChange={() => undefined}
                      onToolChange={() => undefined}
                    />
                    <ToolCategorySection
                      category="write"
                      capabilities={capabilities.write}
                      disabledTools={[]}
                      canManageTools={false}
                      controlsDisabled
                      readOnly
                      onBulkChange={() => undefined}
                      onToolChange={() => undefined}
                    />
                  </>
                ) : null}
              </section>
            ) : (
              <p className="text-sm text-muted-foreground">
                Tool permissions will appear here once this connector is available.
              </p>
            )}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-6">
            <AboutSections meta={meta} />
          </aside>
        </div>
      </div>
    );
  }

  // ---------- Connected state: tabs + sidebar ----------
  return (
    <div className="space-y-6">
      <ApiKeyConnectDialog
        definition={definition}
        open={apiKeyDialogOpen}
        onOpenChange={setApiKeyDialogOpen}
        onSubmit={handleApiKeySubmit}
      />
      {header}

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Tabs value={tab} onValueChange={setTab} className="min-w-0 space-y-5">
          <TabsList className={memoryTabsListClass}>
            <TabsTrigger value="overview" className={memoryTabTriggerClass}>
              Overview
            </TabsTrigger>
            <TabsTrigger value="tools" className={memoryTabTriggerClass}>
              Tools
            </TabsTrigger>
            <TabsTrigger value="activity" className={memoryTabTriggerClass}>
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="m-0 space-y-8">
            {capabilities && capabilities.overviewBullets.length > 0 ? (
              <section className="space-y-2.5">
                <h3 className="text-sm font-semibold text-foreground">
                  What this connector unlocks
                </h3>
                <ul className="space-y-2">
                  {capabilities.overviewBullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex gap-2 text-[13px] leading-snug text-muted-foreground"
                    >
                      <CirclePlus className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <section className="space-y-2.5">
              <h3 className="text-sm font-semibold text-foreground">Recent activity</h3>
              <ConnectorActivityList
                entries={recentActivity}
                loading={activityLoading}
              />
              {hasMoreActivity ? (
                <button
                  type="button"
                  onClick={() => setTab("activity")}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  View all activity
                  <ChevronRight className="size-3" />
                </button>
              ) : null}
            </section>
            </TabsContent>

            <TabsContent value="tools" className="m-0 space-y-4">
              {hasToolSections ? (
                <ToolPermissionsToolbar
                  toolQuery={toolQuery}
                  onToolQueryChange={setToolQuery}
                  toolRiskFilter={toolRiskFilter}
                  onToolRiskFilterChange={setToolRiskFilter}
                  readCount={readCount}
                  writeCount={writeCount}
                  filteredReadCount={filteredRead.length}
                  filteredWriteCount={filteredWrite.length}
                  saveStatus={saveStatus}
                />
              ) : null}
              {!hasToolSections ? (
              <p className="text-sm text-muted-foreground">
                Tool permissions will appear here once this connector is available.
              </p>
            ) : noVisibleTools ? (
              <p className="text-sm text-muted-foreground">
                {buildToolEmptyMessage(toolRiskFilter, toolQuery)}
              </p>
            ) : (
              <div className="space-y-4">
                {showFilteredRead ? (
                  <ToolCategorySection
                    category="read"
                    capabilities={filteredRead}
                    disabledTools={localDisabledTools}
                    canManageTools={canManageTools}
                    controlsDisabled={false}
                    onBulkChange={handleBulkChange}
                    onToolChange={handleToolChange}
                  />
                ) : null}
                {showFilteredWrite ? (
                  <ToolCategorySection
                    category="write"
                    capabilities={filteredWrite}
                    disabledTools={localDisabledTools}
                    canManageTools={canManageTools}
                    controlsDisabled={false}
                    onBulkChange={handleBulkChange}
                    onToolChange={handleToolChange}
                  />
                ) : null}
              </div>
            )}
            </TabsContent>

          <TabsContent value="activity" className="m-0 space-y-4">
            <div className="flex flex-col gap-3 pb-1 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium text-foreground">Activity log</p>
                <p className="text-xs text-muted-foreground">{activitySummaryLabel}</p>
              </div>
              <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:min-w-[16rem]">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={activityQuery}
                    onChange={(event) => setActivityQuery(event.target.value)}
                    placeholder="Search activity"
                    aria-label="Search activity"
                    className="h-9 w-full rounded-full border border-border/60 bg-background pl-10 pr-11 text-sm outline-none transition hover:border-border focus:ring-4 focus:ring-foreground/5"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label="Filter activity by time"
                        className={cn(
                          "absolute right-1 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/60 hover:text-foreground",
                          activityTimeFilter !== "all" &&
                            "bg-muted/70 text-foreground",
                        )}
                      >
                        <SlidersHorizontal className="size-3.5" strokeWidth={2} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-44 p-1">
                      <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Time
                      </p>
                      {ACTIVITY_TIME_FILTERS.map((option) => {
                        const active = activityTimeFilter === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setActivityTimeFilter(option.value)}
                            className={cn(
                              "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition hover:bg-muted/60",
                              active
                                ? "font-medium text-foreground"
                                : "text-foreground/80",
                            )}
                          >
                            {option.label}
                            {active ? (
                              <Check className="size-4 shrink-0" strokeWidth={2.5} />
                            ) : null}
                          </button>
                        );
                      })}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            <ConnectorActivityList
              entries={filteredActivity}
              loading={activityLoading}
              filteredEmpty={Boolean(
                activity && activity.length > 0 && filteredActivity?.length === 0,
              )}
            />
          </TabsContent>
        </Tabs>

        <aside className="space-y-6 lg:sticky lg:top-6">
          <section className="scroll-mt-6">
            <ConnectorPermissionsSection
              isGmail={connectorId === "google"}
              connected={connected}
              settings={localTrustSettings}
              saving={savingTrust}
              disabled={!connected}
              settingsLink={
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Open Settings
                  <ChevronRight className="size-3" />
                </Link>
              }
              onEmailModeChange={(emailMode) => void handleEmailModeChange(emailMode)}
            />
          </section>

          {captureState?.capable ? (
            <section className="scroll-mt-6">
              <ConnectorCaptureSection
                name={definition.name}
                connected={connected}
                enabled={localCaptureEnabled}
                saving={savingCapture}
                disabled={!connected}
                onChange={(enabled) => void handleCaptureChange(enabled)}
              />
            </section>
          ) : (
            // Honest empty state — the section is present but explains why it's
            // inactive, rather than silently vanishing (content contract).
            <section className="space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground">Memory capture</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Salt can act on {definition.name}, but doesn&apos;t yet learn
                from it in the background. Capture is coming as this connector is
                built out.
              </p>
            </section>
          )}

          <AboutSections meta={meta} />
        </aside>
      </div>
    </div>
  );
}

function AboutSections({
  meta,
}: {
  meta: ReturnType<typeof getConnectorMeta>;
}) {
  return (
    <>
      {meta.links.length > 0 ? (
        <section className="space-y-2.5">
          <h3 className="text-sm font-semibold text-foreground">Links</h3>
          <ul className="space-y-1.5">
            {meta.links.map((link) => {
              const LinkIconComponent = linkIcon(link.label);
              return (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
                  >
                    <LinkIconComponent className="size-3.5" />
                    {link.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {meta.developedBy ? (
        <section className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Developed by</h3>
          <p className="text-xs leading-snug text-muted-foreground">
            {meta.developedBy}
          </p>
        </section>
      ) : null}
    </>
  );
}
