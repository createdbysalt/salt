import { ReactNode } from "react";
import { DashboardLayoutWrapper } from "@/app/_features/shell/components/DashboardLayoutWrapper";

/**
 * Studio Mode Layout
 *
 * The default dashboard experience for managing daily operations:
 * - Overview/Inbox
 * - Pipeline (Kanban)
 * - Proposals
 * - Clients
 * - Communication
 * - Meetings
 * - Projects
 */
export default async function StudioLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>;
}
