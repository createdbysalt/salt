"use client";

import { createContext, useContext, type ReactNode } from "react";

type DashboardShellContextValue = {
  mobileMenuOpen: boolean;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
};

const DashboardShellContext = createContext<DashboardShellContextValue | null>(null);

export function DashboardShellProvider({
  mobileMenuOpen,
  openMobileMenu,
  closeMobileMenu,
  children,
}: {
  mobileMenuOpen: boolean;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  children: ReactNode;
}) {
  return (
    <DashboardShellContext.Provider value={{ mobileMenuOpen, openMobileMenu, closeMobileMenu }}>
      {children}
    </DashboardShellContext.Provider>
  );
}

export function useDashboardShell() {
  return useContext(DashboardShellContext);
}
