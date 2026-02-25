import { ReactNode } from "react";

/**
 * Archived Studio Mode Layout
 *
 * The old dashboard experience (preserved for reference).
 * DashboardLayoutWrapper is applied at /archived level.
 */
export default async function ArchivedStudioLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
