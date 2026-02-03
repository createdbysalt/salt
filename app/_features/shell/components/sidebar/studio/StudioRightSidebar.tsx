"use client";

import { useAmbientPanelSafe } from "../../../contexts/AmbientPanelContext";
import { MonitoringStatus } from "../../ambient/MonitoringStatus";
import { ActiveAlerts } from "../../ambient/ActiveAlerts";
import { QuickActions } from "../../ambient/QuickActions";
import { ThisWeekStats } from "../../ambient/ThisWeekStats";
import { ClientsListAmbientPanel } from "../../ambient/clients/ClientsListAmbientPanel";
import { ClientDetailAmbientPanel } from "../../ambient/clients/ClientDetailAmbientPanel";

/**
 * Studio Mode Right Sidebar
 *
 * Renders contextual content based on the current page:
 * - Default: Monitoring status, active alerts, quick actions, this week stats
 * - Clients List: Portfolio overview, needs attention, stage distribution
 * - Client Detail: Health score, revenue metrics, upcoming meetings, activity
 *
 * Pages set their context using the useAmbientPanel hook
 */
export function StudioRightSidebar() {
  const { data } = useAmbientPanelSafe();

  // Render contextual panel based on data type
  switch (data.type) {
    case "clients-list":
      return <ClientsListAmbientPanel data={data} />;

    case "client-detail":
      return <ClientDetailAmbientPanel data={data} />;

    case "default":
    default:
      // Default studio ambient panel
      return (
        <div className="flex h-full flex-col pt-2 px-6 pb-6 space-y-4">
          <div className="space-y-4">
            <MonitoringStatus />
            <ActiveAlerts />
            <QuickActions />
            <ThisWeekStats />
          </div>
        </div>
      );
  }
}
