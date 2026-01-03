"use client";

import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  Users,
  TrendingUp,
  Settings,
  Menu,
  CheckSquare,
} from "lucide-react";
import { NavItem } from "./NavItem";
import { HelpMenu } from "./HelpMenu";
import { Button } from "@/components/ui/button";
import { useSidebarCollapsed } from "../hooks/useSidebarCollapsed";
import type { NavGroup } from "../types/navigation";
import type { User } from "@supabase/supabase-js";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ProfileData = {
  saas_tier: string | null;
} | null;

const navGroups: NavGroup[] = [
  {
    items: [
      {
        label: "Overview",
        href: "/dashboard/overview",
        icon: LayoutDashboard,
      },
      {
        label: "Tasks",
        href: "/dashboard/tasks",
        icon: CheckSquare,
      },
    ],
    separator: true,
  },
  {
    items: [
      {
        label: "Clients",
        href: "/dashboard/clients",
        icon: Users,
      },
      {
        label: "Projects",
        href: "/dashboard/projects",
        icon: FolderKanban,
      },
      {
        label: "Insights",
        href: "/dashboard/insights",
        icon: TrendingUp,
      },
    ],
    separator: true,
  },
  {
    items: [
      {
        label: "My Studio",
        href: "/dashboard/studio",
        icon: Building2,
      },
      {
        label: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];

/**
 * Dashboard sidebar navigation
 * Left-rail navigation with collapsible icon-only mode
 */
export function DashboardSidebar({
  user,
  profile,
}: {
  user: User;
  profile: ProfileData;
}) {
  const { collapsed, toggle, isLoaded } = useSidebarCollapsed();

  if (!isLoaded) {
    return null;
  }

  return (
    <div className="flex h-full flex-col pt-2 pb-4 relative">
      {/* Hamburger Menu Toggle - positioned on right edge */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        className="h-10 w-10 rounded-full hover:bg-sidebar-accent border border-sidebar-border bg-sidebar shadow-sm absolute -right-5 top-12 z-10"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Navigation Groups */}
      <nav className={`flex-1 space-y-2 ${collapsed ? "px-3" : "px-4 pr-8"}`}>
        <TooltipProvider delayDuration={0}>
          {navGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              <div className={collapsed ? "space-y-1" : "space-y-1"}>
                {group.items.map((item) =>
                  collapsed ? (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <div>
                          <NavItem item={item} collapsed={collapsed} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <NavItem key={item.href} item={item} collapsed={collapsed} />
                  )
                )}
              </div>
              {group.separator && (
                <div className={`my-3 border-t border-sidebar-border ${collapsed ? "mx-0" : ""}`} />
              )}
            </div>
          ))}
        </TooltipProvider>
      </nav>

      {/* Footer with Help Menu */}
      <div className="mt-auto border-t border-sidebar-border pt-3 px-4">
        {collapsed ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center">
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    <Settings className="h-5 w-5" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Help & Resources</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <HelpMenu />
        )}
      </div>
    </div>
  );
}

