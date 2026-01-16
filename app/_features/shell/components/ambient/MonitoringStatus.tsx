"use client";

import { Activity, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";

export function MonitoringStatus() {
  // Mock data - will be replaced with real data later
  const sitesMonitored = 0;
  const activeAlerts = 0;
  const creditsRemaining = 47;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Monitoring Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Sites monitored</span>
          <span className="font-medium">{sitesMonitored}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Active alerts</span>
          <span className="font-medium">{activeAlerts}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Intelligence credits</span>
          <span className="font-medium">{creditsRemaining}</span>
        </div>
        {sitesMonitored === 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              No sites monitored yet. Add a project to get started.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
