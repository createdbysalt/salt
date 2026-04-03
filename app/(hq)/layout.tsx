import { ReactNode } from "react";
import { DashboardLayoutWrapper } from "@/app/_features/shell/components/DashboardLayoutWrapper";
import { HqSidebar } from "@/app/_features/shell/components/HqSidebar";

/**
 * HQ Layout - Command Center
 * Daily briefing, inbox, insights, support
 */
export default async function HqLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DashboardLayoutWrapper sidebar={HqSidebar}>
      {children}
    </DashboardLayoutWrapper>
  );
}
