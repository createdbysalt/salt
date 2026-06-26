import { ReactNode } from "react";
import { DashboardLayoutWrapper } from "@/app/_features/shell/components/DashboardLayoutWrapper";
import { HqSidebar } from "@/app/_features/shell/components/HqSidebar";

/**
 * Product layout — authenticated Salt app shell (HQ, Plays, Memory surfaces, etc.)
 */
export default async function ProductLayout({
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
