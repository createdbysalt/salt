"use client";

import type { ComponentType } from "react";
import type { SidebarProps } from "./DashboardLayoutWrapper";
import { AppSidebar } from "./AppSidebar";

interface ClientOnlySidebarProps {
  component: ComponentType<SidebarProps>;
  props: SidebarProps;
}

export function ClientOnlySidebar({ component: Component = AppSidebar, props }: ClientOnlySidebarProps) {
  return <Component {...props} />;
}
