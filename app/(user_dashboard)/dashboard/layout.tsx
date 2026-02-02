import { ReactNode } from "react";
import { DashboardLayoutWrapper } from "@/app/_features/shell/components/DashboardLayoutWrapper";

/**
 * Legacy Dashboard Layout
 *
 * This layout is maintained for backward compatibility during the route migration.
 * New routes should use /studio/*, /strategy/*, or /serve/* directly.
 *
 * @deprecated Use the new route structure instead:
 * - /studio/* for Studio mode (default)
 * - /strategy/* for Strategy mode
 * - /serve/* for Serve mode
 */
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>;
}
