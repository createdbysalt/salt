import { ReactNode } from "react";
import { DashboardLayoutWrapper } from "@/app/_features/shell/components/DashboardLayoutWrapper";
import { BillingSidebar } from "@/app/_features/shell/components/BillingSidebar";

/**
 * Billing Layout - Financial Operations
 * Invoices, services catalog
 */
export default async function BillingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DashboardLayoutWrapper sidebar={BillingSidebar}>
      {children}
    </DashboardLayoutWrapper>
  );
}
