import { ReactNode } from "react";
import { DashboardLayoutWrapper } from "@/app/_features/shell/components/DashboardLayoutWrapper";
import { SalesSidebar } from "@/app/_features/shell/components/SalesSidebar";

/**
 * Sales Layout - Pipeline & Proposals
 * Pipeline, proposals, research
 */
export default async function SalesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DashboardLayoutWrapper sidebar={SalesSidebar}>
      {children}
    </DashboardLayoutWrapper>
  );
}
