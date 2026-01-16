"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";

export function ActiveAlerts() {
  // Mock empty state - will be replaced with real alerts later
  const alerts: Array<{
    id: string;
    title: string;
    description: string;
    severity: "info" | "warning" | "error";
  }> = [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Active Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
            <p className="text-sm font-medium">All systems healthy</p>
            <p className="text-xs text-muted-foreground mt-1">
              No issues detected across monitored projects
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3 rounded-md border bg-card text-sm"
              >
                <p className="font-medium">{alert.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {alert.description}
                </p>
                <Button variant="link" size="sm" className="h-auto p-0 mt-2">
                  View details
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
