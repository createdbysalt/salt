"use client";

import { PageGreetingHeader } from "@/app/_components/patterns/page-greeting-header";
import { useDashboardUser } from "@/app/_features/shell/contexts/DashboardUserContext";

/**
 * Studio Mode Header
 * Uses PageGreetingHeader with the "overview" page key for rotating subtitles.
 */
export function StudioHeader() {
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
