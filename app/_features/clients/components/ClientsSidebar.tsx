"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/utils";
import {
  Users,
  MessageSquare,
  ClipboardCheck,
  PlusCircle,
  Star,
  Clock,
  Settings,
  HelpCircle,
  Search,
  LogOut,
  MoreVertical,
  FolderKanban,
} from "lucide-react";
import { AppSwitcher } from "@/app/_features/shell/components/AppSwitcher";
import { useFavorites } from "@/app/_features/shell/hooks/useFavorites";
import type { FavoriteItemType } from "@/app/_features/shell/types/favorites";
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
import type { User } from "@supabase/supabase-js";

type ProfileData = {
  saas_tier: string | null;
} | null;

interface ClientsSidebarProps {
  user: User;
  profile: ProfileData;
  studioId: string;
}

// ============================================================================
// NAV ITEMS
// ============================================================================

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const clientsNavItems: NavItem[] = [
  {
    title: "Directory",
    url: "/clients",
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
    icon: ClipboardCheck,
  },
];

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
            // Exact match for /clients, startsWith for nested routes
            const isActive =
              item.url === "/clients"
                ? pathname === "/clients" || pathname === "/clients/"
                : pathname.startsWith(item.url);

            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                >
                  <Link href={item.url}>
                    <item.icon className="text-muted-foreground/60" />
                    <span>{item.title}</span>
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// Icon mapping for favorites
const FAVORITE_TYPE_ICONS: Record<FavoriteItemType, React.ComponentType<{ className?: string }>> = {
  project: FolderKanban,
  client: Users,
  report: FolderKanban,
  intelligence: Star,
  portal: Users,
};

export function ClientsSidebar({ user, profile, studioId }: ClientsSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  // Get favorites (cross-mode)
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
              <SidebarMenuButton asChild tooltip="Clients">
                <Link href="/clients">
                  <Users className="h-5 w-5" />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}

      </SidebarHeader>

      <SidebarContent>
        {/* Primary Action Button */}
        <SidebarGroup className={cn(isCollapsed && "hidden")}>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Add Client"
                  className="min-w-8 bg-white text-black duration-200 ease-linear hover:bg-neutral-100 hover:text-black active:bg-neutral-200 active:text-black"
                >
                  <Link href="/clients?new=true">
                    <PlusCircle />
                    <span>Add Client</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Main Navigation */}
        <NavMain items={clientsNavItems} />

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
                Star clients to pin them here.
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

        {/* Recents - TODO: Hook up when mode system is refactored */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>
            <Clock className="mr-2 h-4 w-4 text-muted-foreground/60" />
            Recents
          </SidebarGroupLabel>
          <SidebarMenu>
            <div className="px-2 py-3 text-xs text-muted-foreground">
              Recently viewed clients will appear here.
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
