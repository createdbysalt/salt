import { ReactNode } from "react";

/**
 * Archived Serve Mode Layout
 *
 * The old client portal management experience (preserved for reference).
 * DashboardLayoutWrapper is applied at /archived level.
 */
export default async function ArchivedServeLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
