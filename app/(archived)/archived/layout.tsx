import { ReactNode } from "react";
import { DashboardLayoutWrapper } from "@/app/_features/shell/components/DashboardLayoutWrapper";

/**
 * Archived Layout
 *
 * Preserves the old dashboard UI at /archived/* routes
 * for reference while building the new design.
 */
export default async function ArchivedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>;
}
