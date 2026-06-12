"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { connectGoogle } from "@/app/actions/gmail/connect";
import { disconnectGmail } from "@/app/actions/gmail/disconnect";
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
} from "@/app/actions/calendar/connect";
import {
  connectComposioApiKeyProvider,
  connectComposioProvider,
  disconnectComposioProvider,
} from "@/app/actions/connectors/composio-connect";
import type { ConnectorCatalogId, ConnectorsPageData } from "@/app/_features/connectors";
import { CONNECTOR_CATALOG_BY_ID } from "@/app/_features/connectors/connector-catalog";
import { connectorsPageUrl } from "@/app/_features/connectors/constants";
import { updateConnectorToolPreferences } from "@/app/_features/connectors/actions";
import { ApiKeyConnectDialog } from "./ApiKeyConnectDialog";
import { ConnectorsMarketplace } from "./ConnectorsMarketplace";

interface ConnectorsPageProps {
  connectors: ConnectorsPageData;
}

export function ConnectorsPage({ connectors }: ConnectorsPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingId, setLoadingId] = React.useState<ConnectorCatalogId | null>(null);
  const [savingPreferences, setSavingPreferences] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [apiKeyConnectorId, setApiKeyConnectorId] =
    React.useState<ConnectorCatalogId | null>(null);

  const returnUrl = connectorsPageUrl();
  const googleConnected = searchParams.get("gmail_connected") || searchParams.get("google_connected");
  const googleError = searchParams.get("gmail_error") || searchParams.get("google_error");

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const connectedProvider = searchParams.get("connected_provider");

  React.useEffect(() => {
    if (!mounted) return;
    if (googleConnected === "true") {
      const definition = Object.values(CONNECTOR_CATALOG_BY_ID).find(
        (entry) => entry.providerKey === connectedProvider,
      );
      toast.success(`${definition?.name ?? "Account"} connected!`);
      window.history.replaceState({}, "", returnUrl);
    } else if (googleError) {
      toast.error(`Failed to connect: ${googleError}`);
      window.history.replaceState({}, "", returnUrl);
    }
  }, [googleConnected, googleError, connectedProvider, mounted, returnUrl]);

  const startComposioConnect = async (
    id: ConnectorCatalogId,
    name: string,
    action: () => Promise<
      { success: true; url: string } | { success: false; error: string }
    >,
  ) => {
    setLoadingId(id);

    let result: Awaited<ReturnType<typeof action>>;
    try {
      result = await action();
    } catch {
      result = { success: false, error: "Connection failed. Please try again." };
    }
    if (!result.success) {
      toast.error(result.error || `Failed to connect ${name}`);
      setLoadingId(null);
      return;
    }

    // Same-tab OAuth: the callback redirects back to the connectors tab.
    window.location.href = result.url;
  };

  const handleConnect = async (id: ConnectorCatalogId) => {
    if (!connectors.workspaceId) {
      toast.error("No workspace found. Please ensure you're part of a workspace.");
      return;
    }

    if (id === "google") {
      await startComposioConnect(id, "Gmail", connectGoogle);
      return;
    }

    if (id === "google-calendar") {
      await startComposioConnect(id, "Google Calendar", connectGoogleCalendar);
      return;
    }

    const definition = CONNECTOR_CATALOG_BY_ID[id];

    // API-key connectors (Stripe) collect the key in a dialog — no OAuth popup.
    if (definition?.ownership === "composio" && definition.authMethod === "api_key") {
      setApiKeyConnectorId(id);
      return;
    }

    // Generic per-app Composio connectors (Drive, Docs, Sheets, Slides, …)
    if (definition?.ownership === "composio" && definition.providerKey) {
      const providerKey = definition.providerKey;
      await startComposioConnect(id, definition.name, () =>
        connectComposioProvider(providerKey),
      );
      return;
    }

    setLoadingId(null);
  };

  const handleApiKeySubmit = async (apiKey: string): Promise<boolean> => {
    const definition = apiKeyConnectorId
      ? CONNECTOR_CATALOG_BY_ID[apiKeyConnectorId]
      : null;
    if (!definition?.providerKey) {
      return false;
    }

    const result = await connectComposioApiKeyProvider({
      provider: definition.providerKey,
      apiKey,
    });
    if (result.success) {
      toast.success(`${definition.name} connected!`);
      router.refresh();
      return true;
    }
    return false;
  };

  const handleDisconnect = async (id: ConnectorCatalogId) => {
    setLoadingId(id);

    if (id === "google") {
      const result = await disconnectGmail();
      if (result.success) {
        toast.success("Gmail disconnected");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to disconnect Gmail");
      }
      setLoadingId(null);
      return;
    }

    if (id === "google-calendar") {
      const result = await disconnectGoogleCalendar();
      if (result.success) {
        toast.success("Google Calendar disconnected");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to disconnect Google Calendar");
      }
      setLoadingId(null);
      return;
    }

    // Generic per-app Composio connectors (Drive, Docs, Sheets, Slides, Stripe, …)
    const definition = CONNECTOR_CATALOG_BY_ID[id];
    if (definition?.ownership === "composio" && definition.providerKey) {
      const result = await disconnectComposioProvider(definition.providerKey);
      if (result.success) {
        toast.success(`${definition.name} disconnected`);
        router.refresh();
      } else {
        toast.error(result.error || `Failed to disconnect ${definition.name}`);
      }
      setLoadingId(null);
    }
  };

  const handleSaveToolPreferences = async (
    id: ConnectorCatalogId,
    disabledTools: string[],
  ): Promise<boolean> => {
    setSavingPreferences(true);
    const result = await updateConnectorToolPreferences({ connectorId: id, disabledTools });
    setSavingPreferences(false);

    if (result.success) {
      router.refresh();
      return true;
    }

    toast.error(result.error);
    return false;
  };

  return (
    <>
      <ApiKeyConnectDialog
        definition={
          apiKeyConnectorId ? CONNECTOR_CATALOG_BY_ID[apiKeyConnectorId] : null
        }
        open={apiKeyConnectorId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setApiKeyConnectorId(null);
          }
        }}
        onSubmit={handleApiKeySubmit}
      />
      <ConnectorsMarketplace
        data={connectors}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onSaveToolPreferences={handleSaveToolPreferences}
        loadingId={loadingId}
        savingPreferences={savingPreferences}
      />
    </>
  );
}
