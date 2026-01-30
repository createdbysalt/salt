"use client";

import { useDashboardModeContextSafe } from "../../contexts/DashboardModeContext";
import { StudioRightSidebar } from "./studio/StudioRightSidebar";
import { StrategyRightSidebar } from "./strategy/StrategyRightSidebar";
import { ServeRightSidebar } from "./serve/ServeRightSidebar";

/**
 * ModeRightSidebar - Mode-aware right sidebar wrapper
 * Renders different content based on the active dashboard mode
 *
 * - Strategy: Generation Queue, Recent Insights, Research Context
 * - Studio: This Week Stats, Active Alerts, Quick Actions (existing AmbientIntelligence)
 * - Serve: Portal Status, Preview Controls, Client Activity
 */
export function ModeRightSidebar() {
  // Use safe hook that returns defaults during SSR or outside provider
  const { activeMode, isLoaded } = useDashboardModeContextSafe();

  // Show loading skeleton until mode is loaded
  if (!isLoaded) {
    return (
      <div className="flex h-full flex-col p-6 space-y-4">
        <div className="space-y-4 animate-pulse">
          <div className="h-32 bg-muted/30 rounded-lg" />
          <div className="h-48 bg-muted/30 rounded-lg" />
          <div className="h-40 bg-muted/30 rounded-lg" />
        </div>
      </div>
    );
  }

  switch (activeMode) {
    case "strategy":
      return <StrategyRightSidebar />;
    case "serve":
      return <ServeRightSidebar />;
    case "studio":
    default:
      return <StudioRightSidebar />;
  }
}
