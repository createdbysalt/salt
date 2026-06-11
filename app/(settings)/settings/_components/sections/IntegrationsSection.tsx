"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import {
  startStripeConnectOnboardingAction,
  refreshStripeConnectStatusAction,
  disconnectStripeConnectAction,
} from "@/app/actions/integrations/stripe-connect-actions";
import { connectGoogle } from "@/app/actions/gmail/connect";
import { disconnectGmail } from "@/app/actions/gmail/disconnect";
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
} from "@/app/actions/calendar/connect";
import type {
  ConnectorCatalogId,
  ConnectorsPageData,
} from "@/app/_features/connectors";
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

  const stripeReturnStatus = searchParams.get("stripe") as "complete" | "refresh" | null;
  const googleConnected = searchParams.get("gmail_connected") || searchParams.get("google_connected");
  const googleError = searchParams.get("gmail_error") || searchParams.get("google_error");

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    if (stripeReturnStatus === "complete") {
      refreshStripeConnectStatusAction().then((result) => {
        if (result.success) {
          if (result.data.chargesEnabled) {
            toast.success("Stripe connected successfully!");
          } else {
            toast("Stripe setup incomplete. Please complete the remaining steps.");
          }
        }
        router.replace("/settings/connectors");
      });
    } else if (stripeReturnStatus === "refresh") {
      toast("Please complete Stripe setup to start accepting payments.");
      router.replace("/settings/connectors");
    }
  }, [stripeReturnStatus, router, mounted]);

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
    if (!connectors.workspaceId && id !== "stripe") {
      toast.error("No workspace found. Please ensure you're part of a workspace.");
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

    if (id === "stripe") {
      const result = await startStripeConnectOnboardingAction();
      if (result.success) {
        window.location.href = result.data.url;
        return;
      }
      toast.error(result.error);
      setLoadingId(null);
      return;
    }

    setLoadingId(null);
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

    if (id === "stripe") {
      const result = await disconnectStripeConnectAction();
      if (result.success) {
        toast.success("Stripe disconnected");
        router.refresh();
      } else {
        toast.error(result.error);
      }
      setLoadingId(null);
    }
  };

  return (
    <SettingsPage title="Connectors">
      <ConnectorsCatalog
        data={connectors}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        loadingId={loadingId}
      />
    </SettingsPage>
  );
}
