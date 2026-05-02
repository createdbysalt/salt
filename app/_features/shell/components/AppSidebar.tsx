"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/utils";
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
import { AppSwitcher } from "./AppSwitcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
import { useUnreadCount } from "@/app/_features/messaging/hooks";
import { useFavorites } from "../hooks/useFavorites";
import { useRecents } from "../hooks/useRecents";
import { hqRoutes, workRoutes, billingRoutes, salesRoutes, clientsRoutes } from "../routes";
import type { FavoriteItemType } from "../types/favorites";
import type { RecentItemType } from "../types/recents";

// App types for the 4-app architecture
type AppType = "hq" | "clients" | "work" | "billing" | "sales";
import type { User } from "@supabase/supabase-js";

type ProfileData = {
  saas_tier: string | null;
} | null;

interface AppSidebarProps {
  user: User;
  profile: ProfileData;
  studioId: string;
}

// ============================================================================
// NAV ITEM DEFINITIONS (4-App Architecture)
// ============================================================================

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

/**
 * Detect which app we're in based on the current pathname
 */
function getAppFromPathname(pathname: string): AppType {
  if (pathname.startsWith("/hq")) return "hq";
  if (pathname.startsWith("/clients")) return "clients";
  if (pathname.startsWith("/work")) return "work";
  if (pathname.startsWith("/billing")) return "billing";
  if (pathname.startsWith("/sales")) return "sales";
  // Default to HQ for root or unknown paths
  return "hq";
}

/**
 * HQ App - Headquarters, Command Center
 * Daily briefing, inbox, insights, calendar
 */
function getHqNavItems(unreadCount: number): NavItem[] {
  return [
    {
      title: "Daily Briefing",
      url: hqRoutes.home,
      icon: Sparkles,
    },
    {
      title: "Inbox",
      url: hqRoutes.inbox,
      icon: Inbox,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      title: "Command Center",
      url: hqRoutes.dashboard,
      icon: BarChart3,
    },
    {
      title: "Insights",
      url: hqRoutes.insights,
      icon: Brain,
    },
    {
      title: "Calendar",
      url: hqRoutes.meetings.list,
      icon: Building2,
    },
  ];
}

/**
 * Work App - Active Projects & Retainers
 * Projects, retainers, requests, proposals
 */
function getWorkNavItems(): NavItem[] {
  return [
    {
      title: "Active",
      url: workRoutes.home,
      icon: FolderKanban,
    },
    {
      title: "Projects",
      url: workRoutes.projects.list,
      icon: FolderKanban,
    },
    {
      title: "Retainers",
      url: workRoutes.retainers.list,
      icon: Package,
    },
    {
      title: "Requests",
      url: workRoutes.requests,
      icon: FileText,
    },
    {
      title: "Proposals",
      url: workRoutes.proposals.list,
      icon: FileText,
    },
  ];
}

/**
 * Billing App - Financial Operations
 * Invoices, payments, services catalog
 */
function getBillingNavItems(): NavItem[] {
  return [
    {
      title: "Dashboard",
      url: billingRoutes.home,
      icon: Wallet,
    },
    {
      title: "Invoices",
      url: billingRoutes.invoices.list,
      icon: FileText,
    },
    {
      title: "Payments",
      url: billingRoutes.payments,
      icon: Wallet,
    },
    {
      title: "Services",
      url: billingRoutes.services.list,
      icon: Package,
    },
    {
      title: "Settings",
      url: billingRoutes.settings,
      icon: Settings,
    },
  ];
}

/**
 * Sales App - Pipeline Management
 * Pipeline, pitches, discovery, reports
 */
function getSalesNavItems(): NavItem[] {
  return [
    {
      title: "Pipeline",
      url: salesRoutes.pipeline,
      icon: Users,
    },
    {
      title: "Pitches",
      url: "/sales/pitches",
      icon: FileText,
    },
    {
      title: "Discovery",
      url: "/sales/discovery",
      icon: Search,
    },
    {
      title: "Reports",
      url: "/sales/reports",
      icon: BarChart3,
    },
  ];
}

/**
 * Clients App - Foundation Layer
 * Uses its own sidebar (ClientsSidebar), not this one
 */
function getClientsNavItems(): NavItem[] {
  return [
    {
      title: "All Clients",
      url: clientsRoutes.list,
      icon: Users,
    },
    {
      title: "Messages",
      url: "/clients/messages",
      icon: MessageSquare,
    },
    {
      title: "Onboarding",
      url: "/clients/onboarding",
      icon: Sparkles,
    },
  ];
}

function getNavItemsForApp(app: AppType, unreadCount: number): NavItem[] {
  switch (app) {
    case "hq":
      return getHqNavItems(unreadCount);
    case "work":
      return getWorkNavItems();
    case "billing":
      return getBillingNavItems();
    case "sales":
      return getSalesNavItems();
    case "clients":
      return getClientsNavItems();
    default:
      return getHqNavItems(unreadCount);
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
            const isModeRoot = ["/hq", "/clients", "/work", "/billing", "/sales", "/websites", "/branding"].includes(item.url);
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
                    <item.icon className="text-muted-foreground/60" />
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
                <Link href="/hq/support">
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

export function AppSidebar({ user, profile, studioId }: AppSidebarProps) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  // Detect which app we're in based on pathname
  const currentApp = getAppFromPathname(pathname);

  const { totalUnread } = useUnreadCount({
    userType: "studio",
    studioId,
  });

  // Get favorites (cross-app)
  const { favorites, isLoading: favoritesLoading } = useFavorites({ limit: 5 });

  // Get recents (simplified - TODO: update useRecents for new app system)
  const { recents, isLoading: recentsLoading } = useRecents({ mode: "studio", limit: 5 });

  const navItems = getNavItemsForApp(currentApp, totalUnread);

  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader>
        {/* App Switcher - Planning Center style dropdown */}
        <div className={cn("py-1", isCollapsed && "hidden")}>
          <AppSwitcher />
        </div>
        {/* Collapsed state: show icon only */}
        {isCollapsed && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="SALT">
                <Link href="/hq">
                  <img
                    src="/salt-icon-black.svg"
                    alt="SALT"
                    className="h-5 w-5 dark:hidden"
                  />
                  <img
                    src="/salt-icon-white.svg"
                    alt="SALT"
                    className="h-5 w-5 hidden dark:block"
                  />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <NavMain items={navItems} />

        {/* Favorites */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>
            <Star className="mr-2 h-4 w-4 text-muted-foreground/60" />
            favorites
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
                        <Icon className="text-muted-foreground/60" />
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
            <Clock className="mr-2 h-4 w-4 text-muted-foreground/60" />
            recents
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
                        <Icon className="text-muted-foreground/60" />
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
