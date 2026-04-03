"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/utils";
import {
  Star,
  Clock,
  Settings,
  HelpCircle,
  Search,
  LogOut,
  MoreVertical,
  FolderKanban,
  Users,
  MessageSquare,
  PenSquare,
} from "lucide-react";
import { AppSwitcher } from "./AppSwitcher";
import { useFavorites } from "../hooks/useFavorites";
import type { FavoriteItemType } from "../types/favorites";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui";
import type { User } from "@supabase/supabase-js";

// ============================================================================
// TYPES
// ============================================================================

type ProfileData = {
  saas_tier: string | null;
} | null;

export interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  comingSoon?: boolean;
}

export interface PrimaryAction {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface AppSidebarProps {
  user: User;
  profile: ProfileData;
  studioId: string;
  /** Primary action button (e.g., "+ New Project"). Omit for read-focused apps like HQ. */
  primaryAction?: PrimaryAction;
  /** Secondary action button (e.g., "+ New Retainer"). Muted style, appears below primary. */
  secondaryAction?: PrimaryAction;
  /** Navigation items for this app */
  navItems: NavItem[];
  /** Icon shown when sidebar is collapsed */
  collapsedIcon: React.ComponentType<{ className?: string }>;
  /** Tooltip for collapsed icon */
  collapsedTooltip: string;
  /** Link for collapsed icon */
  collapsedHref: string;
  /** Empty state text for favorites */
  favoritesEmptyText?: string;
  /** Empty state text for recents */
  recentsEmptyText?: string;
}

// ============================================================================
// ICON MAPPINGS
// ============================================================================

const FAVORITE_TYPE_ICONS: Record<FavoriteItemType, React.ComponentType<{ className?: string }>> = {
  project: FolderKanban,
  client: Users,
  report: FolderKanban,
  intelligence: Star,
  portal: Users,
};

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
            // Exact match for root paths, startsWith for nested routes
            const isRootPath = item.url.split("/").filter(Boolean).length === 1;
            const isActive = isRootPath
              ? pathname === item.url || pathname === `${item.url}/`
              : pathname === item.url || pathname.startsWith(`${item.url}/`);
            const hasUnread = item.badge && item.badge > 0;

            // Coming soon items are disabled
            if (item.comingSoon) {
              return (
                <SidebarMenuItem key={item.url} className="relative">
                  <SidebarMenuButton
                    tooltip={item.title}
                    disabled
                    className="cursor-not-allowed opacity-50"
                  >
                    <item.icon className="text-muted-foreground/60" />
                    <span>{item.title}</span>
                    <span className="ml-auto text-[10px] font-medium tracking-wide uppercase text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded">
                      Soon
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            }

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

function NavUser({ user, profile }: { user: User; profile: ProfileData }) {
  const { isMobile } = useSidebar();

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

function GlobalComposeButton() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const handleComposeClick = () => {
    // TODO: Open global compose modal/sheet
    console.log("Open compose");
  };

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleComposeClick}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-sidebar-accent"
          >
            <PenSquare className="h-4 w-4 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Compose message</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleComposeClick}
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-sidebar-accent"
        >
          <PenSquare className="h-4 w-4 text-muted-foreground" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">Compose message</TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AppSidebar({
  user,
  profile,
  studioId,
  primaryAction,
  secondaryAction,
  navItems,
  collapsedIcon: CollapsedIcon,
  collapsedTooltip,
  collapsedHref,
  favoritesEmptyText = "Star items to pin them here.",
  recentsEmptyText = "Recently viewed items will appear here.",
}: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  // Get favorites (cross-app)
  const { favorites, isLoading: favoritesLoading } = useFavorites({ limit: 5 });

  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader>
        {/* App Switcher */}
        <div className={cn("py-1", isCollapsed && "hidden")}>
          <AppSwitcher />
        </div>
        {/* Collapsed state: show icon only */}
        {isCollapsed && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={collapsedTooltip}>
                <Link href={collapsedHref}>
                  <CollapsedIcon className="h-5 w-5" />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Primary Action Button (if provided) */}
        {primaryAction && (
          <SidebarGroup className={cn("pb-0", isCollapsed && "hidden")}>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={primaryAction.title}
                    className="min-w-8 bg-white text-black duration-200 ease-linear hover:bg-neutral-100 hover:text-black active:bg-neutral-200 active:text-black"
                  >
                    <Link href={primaryAction.url}>
                      <primaryAction.icon />
                      <span>{primaryAction.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Secondary Action Button (if provided) - outline style */}
        {secondaryAction && (
          <SidebarGroup className={cn("pt-1 pb-0", isCollapsed && "hidden")}>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={secondaryAction.title}
                    className="min-w-8 border border-border bg-transparent text-foreground duration-200 ease-linear hover:bg-muted active:bg-muted/80"
                  >
                    <Link href={secondaryAction.url}>
                      <secondaryAction.icon />
                      <span>{secondaryAction.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Main Navigation */}
        <NavMain items={navItems} />

        {/* Favorites */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>
            <Star className="mr-2 h-4 w-4 text-muted-foreground/60" />
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
                {favoritesEmptyText}
              </div>
            ) : (
              favorites.map((item) => {
                const Icon = FAVORITE_TYPE_ICONS[item.type] || Users;
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
            Recents
          </SidebarGroupLabel>
          <SidebarMenu>
            <div className="px-2 py-3 text-xs text-muted-foreground">
              {recentsEmptyText}
            </div>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} profile={profile} />
      </SidebarFooter>
    </Sidebar>
  );
}
