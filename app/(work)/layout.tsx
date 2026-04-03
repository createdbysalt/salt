import { ReactNode } from "react";
import { DashboardLayoutWrapper } from "@/app/_features/shell/components/DashboardLayoutWrapper";

/**
 * Work Layout - Active Projects & Retainers
 * Projects, retainers, requests, proposals
 */
export default async function WorkLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>;
}
