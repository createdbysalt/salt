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
  User as UserIcon,
  Settings,
  HelpCircle,
  Search,
  LogOut,
  MoreVertical,
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
import { studioRoutes, strategyRoutes, serveRoutes } from "../routes";
import type { DashboardMode } from "../types/mode";
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
      title: "Billing",
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

            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                >
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
                {item.badge && item.badge > 0 && (
                  <SidebarMenuBadge>{item.badge > 99 ? "99+" : item.badge}</SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

// Placeholder data for favorites/recents - will be replaced with real data later
const placeholderFavorites = [
  { name: "Acme Corp", url: "/studio/clients", icon: UserIcon },
  { name: "Website Redesign", url: "/studio/projects", icon: FolderKanban },
  { name: "Brand Guidelines", url: "/studio/projects", icon: FileText },
];

const placeholderRecents = [
  { name: "Johnson & Co", url: "/studio/clients", icon: UserIcon },
  { name: "Q1 Invoice", url: "/studio/billing", icon: FileText },
  { name: "Logo Project", url: "/studio/projects", icon: FolderKanban },
];

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
                      className="h-8 w-8 dark:hidden"
                    />
                    <img
                      src="/salt-icon-white.svg"
                      alt="Salt Core"
                      className="h-8 w-8 hidden dark:block"
                    />
                  </>
                ) : (
                  <>
                    <img
                      src="/salt-core-logo-black.svg"
                      alt="Salt Core"
                      className="h-7 w-auto dark:hidden"
                    />
                    <img
                      src="/salt-core-logo-white.svg"
                      alt="Salt Core"
                      className="h-7 w-auto hidden dark:block"
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
            {placeholderFavorites.map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild>
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* Recents */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>
            <Clock className="mr-2 h-4 w-4" />
            Recents
          </SidebarGroupLabel>
          <SidebarMenu>
            {placeholderRecents.map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild>
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} profile={profile} />
      </SidebarFooter>
    </Sidebar>
  );
}
