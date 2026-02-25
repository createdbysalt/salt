"use client";

import { PageGreetingHeader } from "@/app/_components/patterns/page-greeting-header";
import { useDashboardUser } from "@/app/_features/shell/contexts/DashboardUserContext";

/**
 * Strategy Mode Header
 * Uses PageGreetingHeader with the "studio" page key (for strategy-focused greetings).
 *
 * Note: Will need custom greetings for Strategy mode added to greetings.ts
 */
export function StrategyHeader() {
  const user = useDashboardUser();

  return (
    <PageGreetingHeader
      page="studio" // TODO: Add "strategy" page key with strategy-focused greetings
      viewer={{ firstName: user?.firstName }}
      variant="dashboard"
      mode="greeting"
    />
  );
}
