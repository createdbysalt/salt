"use client";

import { MonitoringStatus } from "./MonitoringStatus";
import { ActiveAlerts } from "./ActiveAlerts";
import { QuickActions } from "./QuickActions";
import { ThisWeekStats } from "./ThisWeekStats";

/**
 * Ambient Intelligence Panel
 * Right sidebar showing monitoring status, alerts, quick actions, and weekly stats
 */
export function AmbientIntelligence() {
  return (
    <div className="flex h-full flex-col p-6 space-y-4">
      <div className="space-y-4">
        <MonitoringStatus />
        <ActiveAlerts />
        <QuickActions />
        <ThisWeekStats />
      </div>
    </div>
  );
}
