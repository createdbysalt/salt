"use client";

import { createContext, useContext, type ReactNode } from "react";

interface DashboardUser {
  firstName?: string;
  fullName?: string;
  email?: string;
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


