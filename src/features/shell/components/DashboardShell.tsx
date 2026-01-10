"use client";

import { AppShell } from "@/components/patterns/app-shell";
import { useSidebarCollapsed } from "@/src/features/shell/hooks/useSidebarCollapsed";
import { AmbientIntelligence } from "./ambient/AmbientIntelligence";
import { StatusBar } from "./StatusBar";
import * as React from "react";

interface DashboardShellProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  header?: React.ReactNode;
}

export function DashboardShell({ children, sidebar, header }: DashboardShellProps) {
  const { collapsed, isLoaded } = useSidebarCollapsed();

  // Don't render with transition until loaded
  if (!isLoaded) {
    return (
      <AppShell 
        sidebar={sidebar} 
        header={header}
        rightSidebar={<AmbientIntelligence />}
        statusBar={<StatusBar />}
      >
        {children}
      </AppShell>
    );
  }

  return (
    <AppShell 
      sidebar={sidebar} 
      header={header} 
      sidebarCollapsed={collapsed}
      rightSidebar={<AmbientIntelligence />}
      statusBar={<StatusBar />}
    >
      {children}
    </AppShell>
  );
}





