"use client";

import { PageGreetingHeader } from "@/app/_components/patterns/page-greeting-header";
import { useDashboardUser } from "@/app/_features/shell/contexts/DashboardUserContext";

/**
 * Serve Mode Header
 * Uses PageGreetingHeader for the serve mode dashboard.
 *
 * Note: Will need custom greetings for Serve mode added to greetings.ts
 */
export function ServeHeader() {
  const user = useDashboardUser();

  return (
    <PageGreetingHeader
      page="studio" // TODO: Add "serve" page key with serve-focused greetings
      viewer={{ firstName: user?.firstName }}
      variant="dashboard"
      mode="greeting"
    />
  );
}
