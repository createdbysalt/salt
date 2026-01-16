"use client";

import { Activity, Zap } from "lucide-react";

/**
 * Status Bar Component
 * Bottom bar showing ambient monitoring status and credit usage
 */
export function StatusBar() {
  // Mock data - will be replaced with real data later
  const monitoringActive = false;
  const creditsRemaining = 47;

  return (
    <div className="flex items-center justify-between px-6 py-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3 w-3" />
          <span>
            {monitoringActive ? "Monitoring active" : "No active monitoring"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Zap className="h-3 w-3" />
        <span>{creditsRemaining} intelligence credits remaining</span>
      </div>
    </div>
  );
}
