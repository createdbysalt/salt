"use client";

import { MonitoringStatus } from "../../ambient/MonitoringStatus";
import { ActiveAlerts } from "../../ambient/ActiveAlerts";
import { QuickActions } from "../../ambient/QuickActions";
import { ThisWeekStats } from "../../ambient/ThisWeekStats";

/**
 * Studio Mode Right Sidebar
 * Shows operational intelligence for day-to-day work:
 * - Monitoring status
 * - Active alerts
 * - Quick actions
 * - This week stats
 *
 * This is the existing AmbientIntelligence content, now mode-scoped
 */
export function StudioRightSidebar() {
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
