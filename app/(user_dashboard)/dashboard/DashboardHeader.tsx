"use client";

import { PageGreetingHeader } from "@/app/_components/patterns/page-greeting-header";
import { useDashboardUser } from "@/app/_features/shell/contexts/DashboardUserContext";

/**
 * Client component wrapper for the dashboard greeting header.
 * Uses PageGreetingHeader with the "overview" page key for rotating subtitles.
 */
export function DashboardHeader() {
  const user = useDashboardUser();

  return (
    <PageGreetingHeader
      page="overview"
      viewer={{ firstName: user?.firstName }}
      variant="dashboard"
      mode="greeting"
    />
  );
}
