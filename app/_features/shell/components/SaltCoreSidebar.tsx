"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Inbox,
  Users,
  FolderKanban,
  Wallet,
  Brain,
  FileText,
  BarChart3,
  Package,
  Link2,
  Star,
  Clock,
  Settings,
  HelpCircle,
  Search,
  LogOut,
  MoreVertical,
  MessageSquare,
  Eye,
  Sparkles,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  Tabs,
  TabsList,
  TabsTrigger,
  useSidebar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui";
import { useDashboardModeContext } from "../contexts/DashboardModeContext";
import { useUnreadCount } from "@/app/_features/messaging/hooks";
import { useFavorites } from "../hooks/useFavorites";
import { useRecents } from "../hooks/useRecents";
import { studioRoutes, strategyRoutes, serveRoutes } from "../routes";
import type { DashboardMode } from "../types/mode";
import type { FavoriteItemType } from "../types/favorites";
import type { RecentItemType } from "../types/recents";
import type { User } from "@supabase/supabase-js";

type ProfileData = {
  saas_tier: string | null;
} | null;

interface SaltCoreSidebarProps {
  user: User;
  profile: ProfileData;
  studioId: string;
}

// ============================================================================
// NAV ITEM DEFINITIONS
// ============================================================================

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

function getStudioNavItems(unreadCount: number): NavItem[] {
  return [
    {
      title: "My Studio",
      url: studioRoutes.home,
      icon: Building2,
    },
    {
      title: "Inbox",
      url: studioRoutes.inbox.home,
      icon: Inbox,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      title: "Clients",
      url: studioRoutes.clients.list,
      icon: Users,
    },
    {
      title: "Projects",
      url: studioRoutes.projects.list,
      icon: FolderKanban,
    },
    {
      title: "Billing & Terms",
      url: studioRoutes.billing.home,
      icon: Wallet,
    },
  ];
}

function getStrategyNavItems(): NavItem[] {
  return [
    {
      title: "Intelligence",
      url: strategyRoutes.home,
      icon: Brain,
    },
    {
      title: "Proposals",
      url: strategyRoutes.proposals.list,
      icon: FileText,
    },
    {
      title: "Reports",
      url: strategyRoutes.reports.home,
      icon: BarChart3,
    },
    {
      title: "Deliverables",
      url: strategyRoutes.deliverables.home,
      icon: Package,
    },
  ];
}

function getServeNavItems(): NavItem[] {
  return [
    {
      title: "Portal Settings",
      url: serveRoutes.bridge.settings,
      icon: Link2,
    },
  ];
}

function getNavItemsForMode(mode: DashboardMode, unreadCount: number): NavItem[] {
  switch (mode) {
    case "strategy":
      return getStrategyNavItems();
    case "serve":
      return getServeNavItems();
    case "studio":
    default:
      return getStudioNavItems(unreadCount);
  }
}

// ============================================================================
// NAV COMPONENTS
// ============================================================================

function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            // Only use startsWith for nested routes (not mode roots)
            const isModeRoot = ["/studio", "/strategy", "/serve"].includes(item.url);
            const isActive = isModeRoot
              ? pathname === item.url
              : pathname === item.url || pathname.startsWith(`${item.url}/`);
            const hasUnread = item.badge && item.badge > 0;

            return (
              <SidebarMenuItem key={item.url} className="relative">
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                >
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                    {/* Unread indicator dot - shows until all items are read */}
                    {hasUnread && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-primary" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

// Icon mapping for favorites
const FAVORITE_TYPE_ICONS: Record<FavoriteItemType, React.ComponentType<{ className?: string }>> = {
  project: FolderKanban,
  client: Users,
  report: FileText,
  intelligence: Sparkles,
  portal: Eye,
};

// Icon mapping for recents
const RECENT_TYPE_ICONS: Record<RecentItemType, React.ComponentType<{ className?: string }>> = {
  project: FolderKanban,
  client: Users,
  conversation: MessageSquare,
  report: FileText,
  audit: Search,
  intelligence: Sparkles,
  portal: Eye,
};

function NavUser({ user, profile }: { user: User; profile: ProfileData }) {
  const { isMobile } = useSidebar();

  // Extract display info
  const email = user.email || "";
  const fullName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    email.split("@")[0] ||
    "User";
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    window.location.href = "/signout";
  };

  const handleSearchClick = () => {
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{fullName}</span>
                <span className="truncate text-xs text-muted-foreground">{email}</span>
              </div>
              <MoreVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{fullName}</span>
                  <span className="truncate text-xs text-muted-foreground">{email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={studioRoutes.support}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Get Help
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSearchClick}>
                <Search className="mr-2 h-4 w-4" />
                Search
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SaltCoreSidebar({ user, profile, studioId }: SaltCoreSidebarProps) {
  const { activeMode, setMode } = useDashboardModeContext();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const { totalUnread } = useUnreadCount({
    userType: "studio",
    studioId,
  });

  // Get favorites (cross-mode)
  const { favorites, isLoading: favoritesLoading } = useFavorites({ limit: 5 });

  // Get recents for current mode
  const { recents, isLoading: recentsLoading } = useRecents({ mode: activeMode, limit: 5 });

  const navItems = getNavItemsForMode(activeMode, totalUnread);

  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader>
        {/* Logo */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href={studioRoutes.home}>
                {isCollapsed ? (
                  <>
                    <img
                      src="/salt-icon-black.svg"
                      alt="Salt Core"
                      className="h-5 w-5 dark:hidden"
                    />
                    <img
                      src="/salt-icon-white.svg"
                      alt="Salt Core"
                      className="h-5 w-5 hidden dark:block"
                    />
                  </>
                ) : (
                  <>
                    <img
                      src="/salt-core-logo-black.svg"
                      alt="Salt Core"
                      className="h-5 w-auto dark:hidden"
                    />
                    <img
                      src="/salt-core-logo-white.svg"
                      alt="Salt Core"
                      className="h-5 w-auto hidden dark:block"
                    />
                  </>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Mode Switcher - Tabs */}
        {!isCollapsed && (
          <div className="pt-2">
            <Tabs
              value={activeMode}
              onValueChange={(value) => setMode(value as DashboardMode)}
            >
              <TabsList className="w-full h-9">
                <TabsTrigger value="studio" className="flex-1 text-xs">
                  Studio
                </TabsTrigger>
                <TabsTrigger value="strategy" className="flex-1 text-xs">
                  Strategy
                </TabsTrigger>
                <TabsTrigger value="serve" className="flex-1 text-xs">
                  Serve
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <NavMain items={navItems} />

        {/* Favorites */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>
            <Star className="mr-2 h-4 w-4" />
            Favorites
          </SidebarGroupLabel>
          <SidebarMenu>
            {favoritesLoading ? (
              <div className="px-2 py-1 space-y-2">
                <div className="h-6 bg-sidebar-accent/30 rounded animate-pulse" />
                <div className="h-6 bg-sidebar-accent/30 rounded animate-pulse" />
              </div>
            ) : favorites.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                No favorites yet. Star items to add them here.
              </div>
            ) : (
              favorites.map((item) => {
                const Icon = FAVORITE_TYPE_ICONS[item.type] || FolderKanban;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })
            )}
          </SidebarMenu>
        </SidebarGroup>

        {/* Recents */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>
            <Clock className="mr-2 h-4 w-4" />
            Recents
          </SidebarGroupLabel>
          <SidebarMenu>
            {recentsLoading ? (
              <div className="px-2 py-1 space-y-2">
                <div className="h-6 bg-sidebar-accent/30 rounded animate-pulse" />
                <div className="h-6 bg-sidebar-accent/30 rounded animate-pulse" />
              </div>
            ) : recents.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                No recent items yet. Visit pages to see them here.
              </div>
            ) : (
              recents.map((item) => {
                const Icon = RECENT_TYPE_ICONS[item.type] || FolderKanban;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} profile={profile} />
      </SidebarFooter>
    </Sidebar>
  );
}
