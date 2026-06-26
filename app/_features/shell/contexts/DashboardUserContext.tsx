"use client";

import { createContext, useContext, type ReactNode } from "react";

interface DashboardUser {
  firstName?: string;
  fullName?: string;
  email?: string;
  workspaceName?: string;
  workspaceId?: string;
  /** True only for the designated demo account (see mock-content.ts). */
  mockContentEnabled?: boolean;
}

const DashboardUserContext = createContext<DashboardUser | null>(null);

export function DashboardUserProvider({
  children,
  user,
}: {
  children: ReactNode;
  user: DashboardUser;
}) {
  return (
    <DashboardUserContext.Provider value={user}>
      {children}
    </DashboardUserContext.Provider>
  );
}

export function useDashboardUser() {
  const context = useContext(DashboardUserContext);
  if (context === null) {
    throw new Error("useDashboardUser must be used within DashboardUserProvider");
  }
  return context;
}

/** Whether the signed-in account should see demo fixtures. */
export function useMockContent(): boolean {
  return useDashboardUser().mockContentEnabled === true;
}
