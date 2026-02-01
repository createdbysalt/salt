"use client";

import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Palette,
  Share2,
  PanelLeft,
  X,
  Lightbulb,
  FileBarChart,
  PackageOpen,
  Kanban,
  ClipboardList,
  FileText,
} from "lucide-react";
import { NavItem } from "./NavItem";
import { ModeSwitcher } from "./ModeSwitcher";
import { SidebarUserProfile, UserMenuPanel } from "./SidebarUserProfile";
import { ModePrimaryAction, ModeSecondaryAction } from "./sidebar/ModePrimaryAction";
import { ModeRecents } from "./sidebar/ModeRecents";
import { ClientContextBar } from "./sidebar/serve/ClientContextBar";
import { Button } from "@/app/_components/ui/button";
import { useSidebar } from "../contexts/SidebarContext";
import { useDashboardModeContext } from "../contexts/DashboardModeContext";
import { useUnreadCount } from "@/app/_features/messaging/hooks";
import { useSeoAlertCount } from "@/app/_features/seo/hooks";
import type { NavGroup } from "../types/navigation";
import type { DashboardMode } from "../types/mode";
import type { User } from "@supabase/supabase-js";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip";

type ProfileData = {
  saas_tier: string | null;
} | null;

/**
 * Generate nav groups for STRATEGY mode
 * Simplified: Intelligence (unified), Reports, Deliverables
 */
function getStrategyNavGroups(): NavGroup[] {
  return [
    {
      title: "STRATEGY",
      items: [
        {
          label: "Intelligence",
          href: "/dashboard/intelligence",
          icon: Lightbulb,
        },
        {
          label: "Reports",
          href: "/dashboard/reports",
          icon: FileBarChart,
        },
        {
          label: "Deliverables",
          href: "/dashboard/deliverables",
          icon: PackageOpen,
          disabled: true,
          disabledReason: "Coming Q2 2026",
        },
      ],
    },
  ];
}

/**
 * Generate nav groups for STUDIO mode (default)
 * Simplified: Overview, Pipeline, Clients, Communication
 * Note: SEO/Performance moved to Strategy → Reports
 */
function getStudioNavGroups(
  messagesUnreadCount: number,
  _seoAlertCount: number // Keep param for future Overview alerts integration
): NavGroup[] {
  return [
    {
      title: "STUDIO",
      items: [
        {
          label: "Overview",
          href: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          label: "Pipeline",
          href: "/dashboard/pipeline",
          icon: Kanban,
        },
        {
          label: "Proposals",
          href: "/dashboard/proposals",
          icon: FileText,
        },
        {
          label: "Clients",
          href: "/dashboard/clients",
          icon: Users,
        },
        {
          label: "Communication",
          href: "/dashboard/messages", // TODO: Update to /dashboard/communication when unified view is built
          icon: MessageSquare,
          unreadCount: messagesUnreadCount,
        },
      ],
    },
  ];
}

/**
 * Generate nav groups for SERVE mode
 * Simplified: Shared Intelligence, Branding, Requests & Forms, Messages
 * Note: Preview is now a modal triggered by primary action, not a nav item
 */
function getServeNavGroups(): NavGroup[] {
  return [
    {
      title: "SERVE",
      items: [
        {
          label: "Shared Intelligence",
          href: "/dashboard/serve/intelligence",
          icon: Share2,
          disabled: true,
          disabledReason: "Coming Q2 2026",
        },
        {
          label: "Branding",
          href: "/dashboard/serve/branding",
          icon: Palette,
          disabled: true,
          disabledReason: "Coming Q2 2026",
        },
        {
          label: "Requests & Forms",
          href: "/dashboard/serve/requests",
          icon: ClipboardList,
          disabled: true,
          disabledReason: "Coming Q2 2026",
        },
        {
          label: "Messages",
          href: "/dashboard/serve/messages",
          icon: MessageSquare,
          disabled: true,
          disabledReason: "Coming Q2 2026",
        },
      ],
    },
  ];
}

/**
 * Get nav groups based on current mode
 */
function getNavGroupsForMode(
  mode: DashboardMode,
  messagesUnreadCount: number,
  seoAlertCount: number
): NavGroup[] {
  switch (mode) {
    case "strategy":
      return getStrategyNavGroups();
    case "serve":
      return getServeNavGroups();
    case "studio":
    default:
      return getStudioNavGroups(messagesUnreadCount, seoAlertCount);
  }
}

/**
 * DashboardSidebar - Claude Desktop-inspired full-height sidebar
 *
 * Structure:
 * - Logo + Collapse Toggle (header row)
 * - Mode Switcher (horizontal segmented control)
 * - Quick Actions (mode-aware primary + search)
 * - Mode Navigation (scrollable)
 * - Recents (mode-aware recent items)
 * - (flex spacer)
 * - User Profile (at bottom)
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
  const { collapsed, isMobile, toggle, closeMobile, isLoaded } = useSidebar();
  const { activeMode } = useDashboardModeContext();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { totalUnread } = useUnreadCount({
    userType: "studio",
    studioId,
  });
  const { alertCount } = useSeoAlertCount({
    studioId,
  });

  // On mobile, always show expanded view (not collapsed icons)
  const showCollapsed = isMobile ? false : collapsed;

  // Memoize nav groups based on mode and counts
  const modeNavGroups = useMemo(
    () => getNavGroupsForMode(activeMode, totalUnread, alertCount),
    [activeMode, totalUnread, alertCount]
  );

  // Trigger Command Palette for search
  const handleSearchClick = () => {
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  // Close mobile drawer when nav item clicked
  const handleNavClick = () => {
    if (isMobile) {
      closeMobile();
    }
  };

  return (
    <div className="relative flex h-full flex-col">
      {/* Header: Logo + Toggle/Close */}
      <div
        className={`flex items-center shrink-0 border-b border-sidebar-border ${
          showCollapsed ? "justify-center px-2 py-3" : "justify-between px-4 py-4"
        }`}
      >
        {!showCollapsed && (
          <div className="flex items-center">
            <img
              src="/salt-logo-black.png"
              alt="Salt"
              className="h-6 w-auto dark:hidden"
            />
            <img
              src="/salt-logo-white.png"
              alt="Salt"
              className="h-6 w-auto hidden dark:block"
            />
          </div>
        )}
        {/* On mobile: X to close drawer. On desktop: PanelLeft to collapse */}
        {isMobile ? (
          <Button
            variant="ghost"
            onClick={closeMobile}
            className="h-8 w-8 shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        ) : (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={toggle}
                  className={showCollapsed ? "w-full py-3 h-auto flex items-center justify-center" : "h-8 w-8 shrink-0"}
                  disabled={!isLoaded}
                >
                  <PanelLeft className="h-[22px] w-[22px]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{showCollapsed ? "Expand sidebar" : "Collapse sidebar"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Mode Switcher */}
      <div className={`shrink-0 ${showCollapsed ? "px-2 py-3" : "px-3 py-3"}`}>
        <ModeSwitcher collapsed={showCollapsed} />
      </div>

      {/* Quick Actions (mode-aware) */}
      <div
        className={`shrink-0 space-y-1 ${
          showCollapsed ? "px-2 pb-3" : "px-3 pb-3"
        }`}
      >
        <TooltipProvider delayDuration={0}>
          <ModePrimaryAction mode={activeMode} collapsed={showCollapsed} />
          <ModeSecondaryAction
            mode={activeMode}
            collapsed={showCollapsed}
            onSearchClick={handleSearchClick}
          />
        </TooltipProvider>
      </div>

      {/* Client Context Bar (Serve mode only) */}
      {activeMode === "serve" && (
        <div
          className={`shrink-0 ${
            showCollapsed ? "px-2 pb-3" : "px-3 pb-3"
          }`}
        >
          <ClientContextBar collapsed={showCollapsed} />
        </div>
      )}

      {/* Divider */}
      <div
        className={`shrink-0 border-t border-sidebar-border ${
          showCollapsed ? "mx-2" : "mx-3"
        }`}
      />

      {/* Navigation Groups (scrollable) */}
      <nav
        className={`flex-1 overflow-y-auto py-3 ${
          showCollapsed ? "px-2" : "px-3"
        }`}
      >
        <TooltipProvider delayDuration={0}>
          {modeNavGroups.map((group, groupIndex) => (
            <div key={`mode-${groupIndex}`} className="mb-4">
              {/* Linear: 12px, weight 500 - extracted from actual app */}
              {group.title && !showCollapsed && (
                <div className="px-3 mb-2 text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider">
                  {group.title}
                </div>
              )}
              <div className="space-y-1" onClick={handleNavClick}>
                {group.items.map((item) =>
                  showCollapsed ? (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <div>
                          <NavItem item={item} collapsed={showCollapsed} />
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
                    <NavItem key={item.href} item={item} collapsed={showCollapsed} />
                  )
                )}
              </div>
            </div>
          ))}
        </TooltipProvider>

        {/* Divider before Recents */}
        <div
          className={`border-t border-sidebar-border my-3 ${
            showCollapsed ? "" : ""
          }`}
        />

        {/* Recents Section (mode-aware) */}
        <TooltipProvider delayDuration={0}>
          <ModeRecents
            mode={activeMode}
            collapsed={showCollapsed}
            onItemClick={handleNavClick}
          />
        </TooltipProvider>
      </nav>

      {/* User Menu Panel - slides up from behind user profile */}
      <UserMenuPanel
        user={user}
        isOpen={userMenuOpen}
        onClose={() => setUserMenuOpen(false)}
        collapsed={showCollapsed}
      />

      {/* User Profile (at bottom) - sits on top of menu panel, same shade as menu */}
      <div
        className={`shrink-0 py-3 relative z-20 bg-sidebar-accent dark:bg-sidebar-accent/80 border-t border-sidebar-border ${
          showCollapsed ? "px-2" : "px-3"
        }`}
      >
        <SidebarUserProfile
          user={user}
          profile={profile}
          collapsed={showCollapsed}
          isMenuOpen={userMenuOpen}
          onMenuToggle={setUserMenuOpen}
        />
      </div>
    </div>
  );
}
