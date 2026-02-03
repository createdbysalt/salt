"use client";

import { PageGreetingHeader } from "@/app/_components/patterns/page-greeting-header";
import { useDashboardModeContextSafe } from "../contexts/DashboardModeContext";
import { useDashboardUser } from "../contexts/DashboardUserContext";

/**
 * ModeHeader - Mode-aware header content for the unified header row
 *
 * Renders personalized greeting in the 60px header area.
 * Content can vary by mode in the future if needed.
 */
export function ModeHeader() {
  const { activeMode, isLoaded } = useDashboardModeContextSafe();
  const user = useDashboardUser();

  // Show loading skeleton until mode is loaded
  if (!isLoaded) {
    return (
      <div className="space-y-0.5">
        <div className="h-7 w-56 bg-muted/30 rounded animate-pulse" />
        <div className="h-5 w-72 bg-muted/20 rounded animate-pulse" />
      </div>
    );
  }

  // All modes use the greeting header for now
  // Can be customized per mode in the future
  return (
    <PageGreetingHeader
      page="overview"
      viewer={{ firstName: user?.firstName }}
      variant="dashboard"
      mode="greeting"
    />
  );
}
