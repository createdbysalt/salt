import { ReactNode } from "react";
import { DashboardLayoutWrapper } from "@/app/_features/shell/components/DashboardLayoutWrapper";

/**
 * Strategy Mode Layout
 *
 * AI-powered intelligence for winning projects:
 * - Intelligence dashboard/feed
 * - Reports (Performance, SEO, Analytics)
 * - Deliverables (Strategic assets)
 */
export default async function StrategyLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>;
}
