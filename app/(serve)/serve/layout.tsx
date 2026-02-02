import { ReactNode } from "react";
import { DashboardLayoutWrapper } from "@/app/_features/shell/components/DashboardLayoutWrapper";

/**
 * Serve Mode Layout
 *
 * Client portal management experience:
 * - Portal home/overview
 * - Shared Intelligence (what clients see)
 * - Branding assets
 * - Requests & Forms
 * - Client Messages
 */
export default async function ServeLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>;
}
