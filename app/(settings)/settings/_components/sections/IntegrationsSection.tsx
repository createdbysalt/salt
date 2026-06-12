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
import type {
  ConnectorCatalogId,
  ConnectorsPageData,
} from "@/app/_features/connectors";
import { CONNECTOR_CATALOG_BY_ID } from "@/app/_features/connectors/connector-catalog";
import { ApiKeyConnectDialog } from "@/app/_features/connectors/components/ApiKeyConnectDialog";
import { SettingsPage } from "../SettingsPage";
import { ConnectorsCatalog } from "./ConnectorsCatalog";

interface IntegrationsSectionProps {
  connectors: ConnectorsPageData;
}

export function IntegrationsSection({ connectors }: IntegrationsSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingId, setLoadingId] = React.useState<ConnectorCatalogId | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [apiKeyConnectorId, setApiKeyConnectorId] =
    React.useState<ConnectorCatalogId | null>(null);

  const googleConnected = searchParams.get("gmail_connected") || searchParams.get("google_connected");
  const googleError = searchParams.get("gmail_error") || searchParams.get("google_error");

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const connectedProvider = searchParams.get("connected_provider");

  React.useEffect(() => {
    if (!mounted) return;
    if (googleConnected === "true") {
      toast.success(
        connectedProvider === "googlecalendar"
          ? "Google Calendar connected!"
          : "Gmail connected!",
      );
      window.history.replaceState({}, "", "/settings/connectors");
    } else if (googleError) {
      toast.error(`Failed to connect: ${googleError}`);
      window.history.replaceState({}, "", "/settings/connectors");
    }
  }, [googleConnected, googleError, connectedProvider, mounted]);

  const handleConnect = async (id: ConnectorCatalogId) => {
    if (!connectors.workspaceId) {
      toast.error("No workspace found. Please ensure you're part of a workspace.");
      return;
    }

    const definition = CONNECTOR_CATALOG_BY_ID[id];

    // API-key connectors (Stripe) collect the key in a dialog — no redirect.
    if (definition?.ownership === "composio" && definition.authMethod === "api_key") {
      setApiKeyConnectorId(id);
      return;
    }

    setLoadingId(id);

    if (id === "google") {
      const result = await connectGoogle();
      if (result.success) {
        window.location.href = result.url;
        return;
      }
      toast.error(result.error || "Failed to connect Gmail");
      setLoadingId(null);
      return;
    }

    if (id === "google-calendar") {
      const result = await connectGoogleCalendar();
      if (result.success) {
        window.location.href = result.url;
        return;
      }
      toast.error(result.error || "Failed to connect Google Calendar");
      setLoadingId(null);
      return;
    }

    // Generic per-app Composio connectors (Drive, Docs, Sheets, Slides, …)
    if (definition?.ownership === "composio" && definition.providerKey) {
      const result = await connectComposioProvider(definition.providerKey, {
        display: "page",
      });
      if (result.success) {
        window.location.href = result.url;
        return;
      }
      toast.error(result.error || `Failed to connect ${definition.name}`);
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
    }
    setLoadingId(null);
  };

  return (
    <SettingsPage title="Connectors">
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
      <ConnectorsCatalog
        data={connectors}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        loadingId={loadingId}
      />
    </SettingsPage>
  );
}
