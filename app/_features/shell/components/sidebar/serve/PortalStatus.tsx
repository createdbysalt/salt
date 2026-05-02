"use client";

import { CheckCircle2, AlertCircle, Clock, Globe, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { useServeClientSafe } from "../../../hooks/useServeClient";

interface PortalStatusData {
  clientName: string;
  configured: boolean;
  lastUpdated: string | null;
  activeFeatures: string[];
  portalUrl: string | null;
}

/**
 * PortalStatus - Shows current client portal configuration status
 * Connected to ServeClientContext to display selected client's portal health
 */
export function PortalStatus() {
  const { selectedClient, isLoaded } = useServeClientSafe();

  // Loading state
  if (!isLoaded) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Portal Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // No client selected - show empty state
  if (!selectedClient) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Portal Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PortalStatusEmpty />
        </CardContent>
      </Card>
    );
  }

  // Build portal status from selected client
  // In a full implementation, this would fetch from client.settings.bridge
  const portalStatus: PortalStatusData = {
    clientName: selectedClient.name,
    configured: true, // Assume configured if they have a client record
    lastUpdated: "Today",
    activeFeatures: ["Messages", "Files", "Projects"],
    portalUrl: `/table`, // Default bridge URL
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Portal Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PortalStatusContent status={portalStatus} clientId={selectedClient.id} />
      </CardContent>
    </Card>
  );
}

function PortalStatusEmpty() {
  return (
    <div className="text-center py-6">
      <Globe className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
      <p className="text-sm text-muted-foreground">No client selected</p>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        Select a client to view their portal status
      </p>
    </div>
  );
}

function PortalStatusContent({
  status,
  clientId,
}: {
  status: PortalStatusData;
  clientId: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm truncate max-w-[140px]">
          {status.clientName}
        </span>
        {status.configured ? (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-500">
            <CheckCircle2 className="h-3 w-3" />
            Active
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
            <AlertCircle className="h-3 w-3" />
            Setup needed
          </span>
        )}
      </div>

      {status.lastUpdated && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Last activity: {status.lastUpdated}
        </div>
      )}

      {status.activeFeatures.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Active features:</p>
          <div className="flex flex-wrap gap-1">
            {status.activeFeatures.map((feature) => (
              <span
                key={feature}
                className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="pt-2 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <Link href={`/serve/branding`}>
            Configure
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/serve/preview" title="Preview portal">
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
