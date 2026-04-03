import { ReactNode } from "react";
import { DashboardLayoutWrapper } from "@/app/_features/shell/components/DashboardLayoutWrapper";

/**
 * Billing Layout - Financial Operations
 * Invoices, payments, services catalog
 */
export default async function BillingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>;
}
