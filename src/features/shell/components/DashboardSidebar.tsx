"use client";

import { useMemo } from "react";
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  Users,
  TrendingUp,
  Settings,
  Menu,
  CheckSquare,
  CalendarDays,
  HelpCircle,
  BookOpen,
  CreditCard,
  FileText,
  Search,
  MessageSquare,
} from "lucide-react";
import { NavItem } from "./NavItem";
import { HelpMenu } from "./HelpMenu";
import { Button } from "@/components/ui/button";
import { useSidebarCollapsed } from "../hooks/useSidebarCollapsed";
import { useUnreadCount, useSeoAlertCount } from "@/libs/hooks";
import type { NavGroup } from "../types/navigation";
import type { NavItem as NavItemType } from "../types/navigation";
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

/**
 * Generate nav groups with dynamic unread counts
 */
function getNavGroups(messagesUnreadCount: number, seoAlertCount: number): NavGroup[] {
  return [
    {
      title: "ACTIVE",
      items: [
        {
          label: "Overview",
          href: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          label: "Projects",
          href: "/dashboard/projects",
          icon: FolderKanban,
        },
        {
          label: "Clients",
          href: "/dashboard/clients",
          icon: Users,
        },
        {
          label: "Messages",
          href: "/dashboard/messages",
          icon: MessageSquare,
          unreadCount: messagesUnreadCount,
        },
        {
          label: "SEO",
          href: "/dashboard/seo",
          icon: Search,
          unreadCount: seoAlertCount,
        },
      ],
      separator: true,
    },
    {
      title: "INTELLIGENCE",
      items: [
        {
          label: "Intelligence Stream",
          href: "/dashboard/intelligence/stream",
          icon: TrendingUp,
          badge: "NEW",
          disabled: true,
          disabledReason: "Coming Q1-Q2 2026",
        },
        {
          label: "Intelligence Library",
          href: "/dashboard/intelligence/library",
          icon: LayoutDashboard,
          disabled: true,
          disabledReason: "Coming Q1-Q2 2026",
        },
        {
          label: "Strategic Reports",
          href: "/dashboard/intelligence/strategic-reports",
          icon: FileText,
          disabled: true,
          disabledReason: "Coming Q1-Q2 2026",
        },
        {
          label: "Technical Audits",
          href: "/dashboard/intelligence/technical-audits",
          icon: Search,
          disabled: true,
          disabledReason: "Coming Q1-Q2 2026",
        },
      ],
      separator: true,
    },
    {
      title: "SYSTEM",
      items: [
        {
          label: "Settings",
          href: "/dashboard/settings",
          icon: Settings,
        },
        {
          label: "Billing & Credits",
          href: "/dashboard/settings/billing",
          icon: CreditCard,
        },
        {
          label: "Documentation",
          href: "/dashboard/support",
          icon: BookOpen,
        },
      ],
    },
  ];
}

/**
 * Dashboard sidebar navigation
 * Left-rail navigation with collapsible icon-only mode
 */
export function DashboardSidebar({
  user,
  profile,
  studioId,
}: {
  user: User;
  profile: ProfileData;
  studioId: string;
}) {
  const { collapsed, toggle, isLoaded } = useSidebarCollapsed();
  const { totalUnread } = useUnreadCount({
    userType: "studio",
    studioId,
  });
  const { alertCount } = useSeoAlertCount({
    studioId,
  });

  // Memoize nav groups with unread counts
  const navGroups = useMemo(() => getNavGroups(totalUnread, alertCount), [totalUnread, alertCount]);

  const helpNavItem: NavItemType = {
    label: "Help & Resources",
    href: "/dashboard/support",
    icon: HelpCircle,
  };

  return (
    <div className="flex h-full flex-col pt-2 pb-4 relative">
      {/* Hamburger Menu Toggle - positioned on right edge */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        className="h-10 w-10 rounded-full hover:bg-sidebar-accent border border-sidebar-border bg-sidebar shadow-sm absolute -right-5 top-12 z-10"
        disabled={!isLoaded}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Navigation Groups */}
      <nav className={`flex-1 space-y-4 ${collapsed ? "pl-6 pr-10" : "px-4 pr-8"}`}>
        <TooltipProvider delayDuration={0}>
          {navGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {group.title && !collapsed && (
                <div className="px-3 mb-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                  {group.title}
                </div>
              )}
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
                        {item.disabled && item.disabledReason && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.disabledReason}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <NavItem key={item.href} item={item} collapsed={collapsed} />
                  )
                )}
              </div>
              {group.separator && (
                <div className="my-3 border-t border-sidebar-border" />
              )}
            </div>
          ))}
        </TooltipProvider>
      </nav>

      {/* Divider before footer (matches nav dividers) */}
      <div className="my-3 border-t border-sidebar-border" style={{ marginLeft: collapsed ? '24px' : '16px', marginRight: collapsed ? '40px' : '32px' }} />

      {/* Footer with Help Menu */}
      <div className={`${collapsed ? "pl-6 pr-10" : "px-4 pr-8"}`}>
        {collapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <NavItem item={helpNavItem} collapsed={collapsed} />
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

