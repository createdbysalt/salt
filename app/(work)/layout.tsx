import { ReactNode } from "react";
import { DashboardLayoutWrapper } from "@/app/_features/shell/components/DashboardLayoutWrapper";
import { WorkSidebar } from "@/app/_features/shell/components/WorkSidebar";

/**
 * Work Layout - Active Projects & Retainers
 * Projects, retainers, scripts
 */
export default async function WorkLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DashboardLayoutWrapper sidebar={WorkSidebar}>
      {children}
    </DashboardLayoutWrapper>
  );
}
