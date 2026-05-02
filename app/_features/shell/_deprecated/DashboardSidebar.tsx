"use client";

import { useMemo, useState } from "react";
import {
  PanelLeft,
  X,
  Brain,
  Link2,
  FileText,
  Wallet,
  Inbox,
  Users,
  FolderKanban,
  BarChart3,
  Package,
  Building2,
} from "lucide-react";
import { NavItem } from "./NavItem";
import { ModeSwitcher } from "./ModeSwitcher";
import { SidebarUserProfile, UserMenuPanel } from "./SidebarUserProfile";
import { ModePrimaryAction, ModeSecondaryAction } from "./sidebar/ModePrimaryAction";
import { ModeRecents } from "./sidebar/ModeRecents";
import { ModeNavSection } from "./sidebar/ModeNavSection";
import { SidebarFavorites } from "./sidebar/SidebarFavorites";
import { Button } from "@/app/_components/ui/button";
import { useSidebar } from "../contexts/SidebarContext";
import { useDashboardModeContext } from "../contexts/DashboardModeContext";
import { useUnreadCount } from "@/app/_features/messaging/hooks";
import { useSeoAlertCount } from "@/app/_features/seo/hooks";
import { studioRoutes, strategyRoutes, serveRoutes } from "../routes";
import type { NavSection, NavItem as NavItemType } from "../types/navigation";
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

// ============================================================================
// NAVIGATION CONFIGURATION
// Studio: Simple nav items (My Studio → Inbox → Clients → Projects → Billing)
// Strategy/Serve: Multi-view sections with additional items
// ============================================================================

/**
 * Strategy Mode - Intelligence Section
 * Multi-view into strategic intelligence data
 */
function getStrategySection(): NavSection {
  return {
    label: "Intelligence",
    icon: Brain,
    views: [
      { label: "Feed", href: strategyRoutes.intelligence.feed, shortLabel: "Feed" },
      { label: "Library", href: strategyRoutes.intelligence.library, shortLabel: "Lib" },
      { label: "Queue", href: strategyRoutes.intelligence.queue, shortLabel: "Queue" },
    ],
    settingsHref: strategyRoutes.intelligence.settings,
  };
}

/**
 * Strategy Mode - Additional nav items (Proposals, Reports, Deliverables)
 */
function getStrategyAdditionalItems(): NavItemType[] {
  return [
    {
      label: "Proposals",
      href: strategyRoutes.proposals.list,
      icon: FileText,
    },
    {
      label: "Reports",
      href: strategyRoutes.reports.home,
      icon: BarChart3,
    },
    {
      label: "Deliverables",
      href: strategyRoutes.deliverables.home,
      icon: Package,
    },
  ];
}

/**
 * Studio Mode - Primary nav items (no multi-view section)
 * My Studio → Inbox → Clients → Projects → Billing
 */
function getStudioNavItems(): NavItemType[] {
  return [
    {
      label: "My Studio",
      href: studioRoutes.home,
      icon: Building2,
    },
    {
      label: "Inbox",
      href: studioRoutes.inbox.home,
      icon: Inbox,
      // Note: badge count will be added dynamically
    },
    {
      label: "Clients",
      href: studioRoutes.clients.list,
      icon: Users,
    },
    {
      label: "Projects",
      href: studioRoutes.projects.list,
      icon: FolderKanban,
    },
    {
      label: "Billing",
      href: studioRoutes.billing.home,
      icon: Wallet,
    },
  ];
}

/**
 * Serve Mode - No multi-view section needed
 * The main page IS the preview canvas
 */
function getServeNavItems(): NavItemType[] {
  return [
    {
      label: "Portal Settings",
      href: serveRoutes.table.settings,
      icon: Link2,
    },
  ];
}

// ============================================================================
// MODE CONFIGURATION HELPERS
// ============================================================================

interface ModeNavConfig {
  /** Multi-view section (null for Studio mode which uses simple nav) */
  section: NavSection | null;
  /** Primary nav items (for Studio mode) or additional items (for Strategy/Serve) */
  navItems: NavItemType[];
}

function getModeNavConfig(mode: DashboardMode): ModeNavConfig {
  switch (mode) {
    case "strategy":
      return {
        section: getStrategySection(),
        navItems: getStrategyAdditionalItems(),
      };
    case "serve":
      return {
        section: null, // Serve uses simple nav like Studio - the page IS the preview
        navItems: getServeNavItems(),
      };
    case "studio":
    default:
      return {
        section: null, // Studio uses simple nav items, no multi-view section
        navItems: getStudioNavItems(),
      };
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

  // Get mode-specific navigation configuration
  const modeNavConfig = useMemo(
    () => getModeNavConfig(activeMode),
    [activeMode]
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
        className={`flex shrink-0 ${
          showCollapsed
            ? "flex-col items-center gap-2 px-2 py-3"
            : "flex-row items-center justify-between h-[60px] px-4"
        }`}
      >
        {showCollapsed ? (
          <>
            <img
              src="/salt-icon-black.svg"
              alt="SALT"
              className="h-7 w-7 dark:hidden"
            />
            <img
              src="/salt-icon-white.svg"
              alt="SALT"
              className="h-7 w-7 hidden dark:block"
            />
          </>
        ) : (
          <div className="flex items-center">
            <img
              src="/salt-logo-black.svg"
              alt="SALT"
              className="h-5 w-auto dark:hidden"
            />
            <img
              src="/salt-logo-white.svg"
              alt="SALT"
              className="h-5 w-auto hidden dark:block"
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
                  className="h-8 w-8 shrink-0 flex items-center justify-center"
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
      <div className={`shrink-0 ${showCollapsed ? "px-2 pt-2 pb-2" : "px-3 pt-2 pb-2"}`}>
        <ModeSwitcher collapsed={showCollapsed} />
      </div>

      {/* Navigation (scrollable) */}
      <nav
        className={`flex-1 overflow-y-auto ${
          showCollapsed ? "px-2" : "px-0"
        }`}
      >
        {/* Quick Actions (mode-aware) */}
        <div
          className={`space-y-1 py-2 ${
            showCollapsed ? "" : "px-3"
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

        {/* Divider after Quick Actions */}
        <div
          className={`border-t border-sidebar-border my-2 ${
            showCollapsed ? "" : "mx-3"
          }`}
        />

        {/* Navigation Items - Multi-view section (Strategy/Serve) or simple nav (Studio) */}
        <TooltipProvider delayDuration={0}>
          <div className={`space-y-1 py-2 ${showCollapsed ? "" : ""}`} onClick={handleNavClick}>
            {/* Multi-view section (Strategy: Intelligence, Serve: Bridge) */}
            {modeNavConfig.section && (
              <ModeNavSection
                section={modeNavConfig.section}
                collapsed={showCollapsed}
              />
            )}

            {/* Nav Items (Studio: Inbox/Clients/Projects/Billing, Strategy: Proposals/Reports/Deliverables, Serve: Preview) */}
            {modeNavConfig.navItems.map((item) =>
              showCollapsed ? (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <div className="px-0">
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
                <div key={item.href} className="px-3">
                  <NavItem item={item} collapsed={showCollapsed} />
                </div>
              )
            )}
          </div>

          {/* Divider before Favorites */}
          <div
            className={`border-t border-sidebar-border my-2 ${
              showCollapsed ? "" : "mx-3"
            }`}
          />

          {/* Favorites Section (cross-mode) - smaller visual hierarchy */}
          <SidebarFavorites
            collapsed={showCollapsed}
            onItemClick={handleNavClick}
          />

          {/* Divider before Recents */}
          <div
            className={`border-t border-sidebar-border my-2 ${
              showCollapsed ? "" : "mx-3"
            }`}
          />

          {/* Recents Section (mode-aware) - smaller visual hierarchy */}
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
