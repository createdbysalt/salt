"use client";

import { Check, ChevronRight, Loader2, Unplug } from "lucide-react";
import { Button } from "@repo/ui";
import { ConnectorIcon } from "@/app/_features/connectors/components/connector-icons";
import { connectorsPageUrl } from "@/app/_features/connectors/constants";
import type { ConnectorCatalogId } from "@/app/_features/connectors/types";
import type { InlineConnectAction } from "../types";

type InlineConnectPromptProps = {
  action?: InlineConnectAction | null;
  showBrowseConnectors?: boolean;
  connecting?: boolean;
  disconnecting?: boolean;
  onConnect?: (connectorId: string) => void;
  onDisconnect?: (connectorId: string) => void;
};

export function InlineConnectPrompt({
  action,
  showBrowseConnectors = false,
  connecting = false,
  disconnecting = false,
  onConnect,
  onDisconnect,
}: InlineConnectPromptProps) {
  const browseUrl = connectorsPageUrl({ askSalt: "1" });

  if (!action && !showBrowseConnectors) return null;

  return (
    <div className="mt-2.5 space-y-2">
      {action && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background">
            <ConnectorIcon id={action.connectorId as ConnectorCatalogId} size={16} />
          </span>

          {action.connected && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
              <Check className="size-3.5" strokeWidth={2.5} />
              {action.statusLabel
                ? `Connected as ${action.statusLabel}`
                : `${action.name} connected`}
            </span>
          )}

          {action.canConnect && (
            <Button
              type="button"
              size="sm"
              disabled={connecting}
              onClick={() => onConnect?.(action.connectorId)}
            >
              {connecting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                `Connect ${action.name}`
              )}
            </Button>
          )}

          {action.canDisconnect && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              disabled={disconnecting}
              onClick={() => onDisconnect?.(action.connectorId)}
            >
              {disconnecting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <>
                  <Unplug className="size-3.5" />
                  Disconnect
                </>
              )}
            </Button>
          )}

          {action.comingSoon && !action.connected && (
            <span className="text-xs text-muted-foreground">Coming soon</span>
          )}

          {action.ownership === "native" && !action.connected && !action.comingSoon && (
            <Button type="button" size="sm" variant="outline" asChild>
              <a href={browseUrl}>Set up in Connectors</a>
            </Button>
          )}
        </div>
      )}

      {action?.error && (
        <p className="text-xs text-destructive">{action.error}</p>
      )}

      {showBrowseConnectors && (
        <a
          href={browseUrl}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          Browse all connectors
          <ChevronRight className="size-3.5" />
        </a>
      )}
    </div>
  );
}
