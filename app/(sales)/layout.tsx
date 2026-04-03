import { ReactNode } from "react";
import { DashboardLayoutWrapper } from "@/app/_features/shell/components/DashboardLayoutWrapper";

/**
 * Sales Layout - Pipeline & Proposals
 * Coming soon: Pipeline management, proposals, pitches
 */
export default async function SalesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>;
}
