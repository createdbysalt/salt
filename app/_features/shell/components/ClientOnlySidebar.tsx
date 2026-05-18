"use client";

import * as React from "react";
import { Skeleton, Sidebar, SidebarHeader, SidebarContent } from "@repo/ui";
import type { SidebarProps } from "./DashboardLayoutWrapper";
import type { ComponentType } from "react";

interface ClientOnlySidebarProps {
  component: ComponentType<SidebarProps>;
  props: SidebarProps;
}

function SidebarSkeleton() {
  return (
    <Sidebar>
      <SidebarHeader className="pt-3 pb-4 px-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="h-4 w-16" />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <div className="space-y-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
        <div className="mt-4 space-y-1">
          <Skeleton className="h-9 w-full rounded-lg" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-[85%] ml-4 rounded-lg" />
          ))}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export function ClientOnlySidebar({ component: Component, props }: ClientOnlySidebarProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <SidebarSkeleton />;
  }

  return <Component {...props} />;
}
