"use client";

import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ClientOnlySidebar } from "./ClientOnlySidebar";
import { DashboardContentShell } from "./DashboardContentShell";
import { StagingBanner } from "./StagingBanner";
import { ClientCommandPalette } from "./ClientCommandPalette";
import { DashboardShellProvider } from "../contexts/DashboardShellContext";
import { SHELL_NAV_BREAKPOINT_PX } from "../constants";
import { useBodyScrollLock } from "@/app/_lib/hooks/use-body-scroll-lock";
import { SettingsModalHost } from "@/app/(studio)/settings/_components/SettingsModalHost";
import type { SidebarProps } from "./DashboardLayoutWrapper";

export function DashboardShellLayout({
  children,
  sidebar: SidebarComponent,
  sidebarProps,
}: {
  children: ReactNode;
  sidebar: ComponentType<SidebarProps>;
  sidebarProps: Omit<SidebarProps, "mobileOpen" | "onMobileClose">;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const openMobileMenu = useCallback(() => {
    window.dispatchEvent(new CustomEvent("salt:close-ask-salt"));
    setMobileOpen(true);
  }, []);
  const closeMobileMenu = useCallback(() => setMobileOpen(false), []);

  useBodyScrollLock(mobileOpen);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= SHELL_NAV_BREAKPOINT_PX) {
        setMobileOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <DashboardShellProvider
      mobileMenuOpen={mobileOpen}
      openMobileMenu={openMobileMenu}
      closeMobileMenu={closeMobileMenu}
    >
      <div className="flex min-h-svh w-full bg-background">
        <ClientOnlySidebar
          component={SidebarComponent}
          props={{
            ...sidebarProps,
            mobileOpen,
            onMobileClose: closeMobileMenu,
          }}
        />
        <div className="flex min-h-svh min-w-0 flex-1 flex-col overflow-hidden">
          <StagingBanner />
          <DashboardContentShell>{children}</DashboardContentShell>
        </div>
        <ClientCommandPalette />
        <SettingsModalHost />
      </div>
    </DashboardShellProvider>
  );
}
