"use client";

import { CheckCircle2, AlertCircle, Clock, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";

interface PortalStatusData {
  clientName: string;
  configured: boolean;
  lastUpdated: string | null;
  activeFeatures: string[];
}

/**
 * PortalStatus - Shows current client portal configuration status
 */
export function PortalStatus() {
  // Mock data - will be replaced with actual portal status
  // When real data is available, this will come from props or a hook
  const portalStatus: PortalStatusData | null = null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Portal Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {portalStatus === null ? (
          <PortalStatusEmpty />
        ) : (
          <PortalStatusContent status={portalStatus} />
        )}
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
      <Button variant="outline" size="sm" disabled>
        Select client
      </Button>
    </div>
  );
}

function PortalStatusContent({ status }: { status: PortalStatusData }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{status.clientName}</span>
        {status.configured ? (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Configured
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <AlertCircle className="h-3 w-3" />
            Setup needed
          </span>
        )}
      </div>

      {status.lastUpdated && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Last updated: {status.lastUpdated}
        </div>
      )}

      {status.activeFeatures.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">
            Active features:
          </p>
          <div className="flex flex-wrap gap-1">
            {status.activeFeatures.map((feature) => (
              <span
                key={feature}
                className="px-2 py-0.5 text-xs bg-muted rounded-full"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
