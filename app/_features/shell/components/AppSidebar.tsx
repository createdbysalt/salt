"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/utils";
import {
  Check,
  ChevronRight,
  ClipboardCheck,
  HelpCircle,
  Inbox,
  LogOut,
  MessageCircle,
  MoreVertical,
  Network,
  Pin,
  Play,
  Search,
  Settings,
  Orbit,
  Home,
  Database,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
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
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
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
// NAV STRUCTURE
// ============================================================================

const TOP_NAV = [
  { title: "HQ", url: "/hq", icon: Home },
  { title: "Connections", url: "/connections", icon: Network },
  { title: "Plays", url: "/plays", icon: Play, count: 3 },
  { title: "Capture", url: "/capture", icon: Inbox, count: 5 },
] as const;

const MEMORY_NAV = [
  { title: "People", url: "/people" },
  { title: "Orgs", url: "/orgs" },
  { title: "Work", url: "/work" },
  { title: "Files", url: "/files" },
  { title: "Billing", url: "/billing" },
  { title: "Convos", url: "/conversations" },
  { title: "Meetings", url: "/meetings" },
  { title: "Teams", url: "/teams" },
  { title: "Me", url: "/me" },
];

const PINNED_TABLE_NAV = [
  { title: "Luma Expansion", url: "/roundtables/proj_pricing_redesign" },
  { title: "Atlas Kickoff", url: "/roundtables/proj_flux_discovery" },
  { title: "Cedar Scope Risk", url: "/roundtables/proj_q3_rebrand" },
];

const ALL_TABLE_NAV = [
  ...PINNED_TABLE_NAV,
  { title: "Brightline Brand Refresh", url: "/roundtables/proj_helios_proposal" },
  { title: "Helios Proposal", url: "/roundtables/proj_series_a_launch" },
];

const SETUP_GUIDE = {
  title: "Setup guide",
  nextStep: "Review suggested Memory",
  progress: 92,
};

// ============================================================================
// HOOKS
// ============================================================================

function useActiveCheck() {
  const pathname = usePathname();
  return React.useCallback(
    (url: string) => {
      if (url === "/") return pathname === "/";
      return pathname === url || pathname.startsWith(`${url}/`);
    },
    [pathname]
  );
}

function SetupGuideCard() {
  return (
    <SidebarGroup className="px-2 pb-2 pt-0 group-data-[collapsible=icon]:hidden">
      <Link
        href="/onboarding"
        className="block rounded-xl bg-sidebar-accent/70 p-3 text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
      >
        <div className="flex items-center gap-2">
          <ClipboardCheck className="size-4 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm font-medium">{SETUP_GUIDE.title}</p>
        </div>
        <p className="mt-3 truncate text-xs text-muted-foreground">
          Next: {SETUP_GUIDE.nextStep}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${SETUP_GUIDE.progress}%` }}
          />
        </div>
      </Link>
    </SidebarGroup>
  );
}

// ============================================================================
// COLLAPSIBLE GROUP (Memory, Roundtables)
// ============================================================================

function CollapsibleGroup({
  label,
  icon: Icon,
  href,
  toggleOnly = false,
  children,
  defaultOpen = false,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  href?: string;
  toggleOnly?: boolean;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const isActive = useActiveCheck();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const active = href ? isActive(href) : false;
  const [open, setOpen] = React.useState(defaultOpen || active);

  // Auto-expand when navigating to this section
  React.useEffect(() => {
    if (active && !isCollapsed) {
      setOpen(true);
    }
  }, [active, isCollapsed]);

  // Collapsed mode: simple icon link with tooltip
  if (isCollapsed) {
    const collapsedContent = (
      <>
        <Icon className="size-4" strokeWidth={1.5} />
        <span>{label}</span>
      </>
    );

    return (
      <SidebarGroup className="py-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild={!toggleOnly && Boolean(href)}
              isActive={active}
              tooltip={label}
              className="rounded-lg h-9"
              onClick={() => {
                if (toggleOnly) {
                  setOpen((o) => !o);
                }
              }}
            >
              {toggleOnly || !href ? (
                collapsedContent
              ) : (
                <Link href={href}>{collapsedContent}</Link>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  // Expanded mode: collapsible with hover-to-reveal chevron
  return (
    <SidebarGroup className="py-0">
      <SidebarMenu>
        <SidebarMenuItem>
          <div
            className={cn(
              "group/row relative flex items-center w-full h-9 rounded-xl transition-colors",
              "hover:bg-sidebar-accent",
              active && "bg-sidebar-accent"
            )}
          >
            {/* Icon/Chevron toggle button - appears on hover */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen((o) => !o);
                  }}
                  aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
                  className={cn(
                    "flex items-center justify-center size-4 ml-2 rounded-md cursor-pointer shrink-0",
                    "text-sidebar-foreground",
                    "group-hover/row:hover:bg-foreground/10",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  )}
                >
                  {/* Icon visible by default, chevron on hover */}
                  <span className="relative size-4">
                    <Icon className="absolute inset-0 h-4 w-4 transition-opacity group-hover/row:opacity-0" strokeWidth={1.5} />
                    <ChevronRight
                      className={cn(
                        "absolute inset-0 h-4 w-4 opacity-0 transition-all group-hover/row:opacity-100",
                        open && "rotate-90"
                      )}
                      strokeWidth={1.5}
                    />
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {open ? `Collapse ${label}` : `Expand ${label}`}
              </TooltipContent>
            </Tooltip>

            {/* Label area: navigates for real sections, toggles for grouping-only rows */}
            {toggleOnly || !href ? (
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
                className={cn(
                  "flex items-center flex-1 min-w-0 py-2 pl-2.5 pr-2 text-left text-[13px] font-normal cursor-pointer",
                  "text-sidebar-foreground rounded-r-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                )}
              >
                <span className="truncate">{label}</span>
              </button>
            ) : (
              <Link
                href={href}
                aria-label={`Open ${label}`}
                className={cn(
                  "flex items-center flex-1 min-w-0 py-2 pl-2.5 pr-2 text-[13px] font-normal cursor-pointer",
                  "text-sidebar-foreground rounded-r-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                )}
              >
                <span className="truncate">{label}</span>
              </Link>
            )}
          </div>
        </SidebarMenuItem>

        {open && (
          <SidebarMenuSub className="!mx-0 !px-2 pt-1 pb-2 gap-0.5">
            {children}
          </SidebarMenuSub>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}

// ============================================================================
// SUB ITEM (used inside collapsible groups)
// ============================================================================

function NavSubItem({
  url,
  title,
  icon: Icon,
}: {
  url: string;
  title: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  const isActive = useActiveCheck();
  const active = isActive(url);

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild isActive={active} className="rounded-lg font-normal">
        <Link href={url}>
          {Icon && (
            <Icon
              className="!size-3 shrink-0 text-muted-foreground"
              strokeWidth={1.5}
            />
          )}
          <span className="truncate">{title}</span>
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

function NavSubSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <SidebarMenuSubItem>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
        className={cn(
          "flex h-7 w-full items-center rounded-lg px-2 text-left text-sm font-normal transition-colors",
          "[&>span]:text-[13px] [&>span]:font-normal",
          "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          open && "bg-sidebar-accent"
        )}
      >
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <ChevronRight
          className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")}
          strokeWidth={1.5}
        />
      </button>
      {open && (
        <SidebarMenuSub className="!mx-0 ml-3 mt-0.5 border-l border-sidebar-border/70 px-2 py-1 gap-0.5">
          {children}
        </SidebarMenuSub>
      )}
    </SidebarMenuSubItem>
  );
}

// ============================================================================
// USER MENU (footer)
// ============================================================================

function NavUser({ user, profile }: { user: User; profile: ProfileData }) {
  const { isMobile } = useSidebar();
  void profile;

  const email = user.email || "maya@northstar.studio";
  const fullName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    email.split("@")[0] ||
    "You";
  const firstName = fullName.split(" ")[0] || "You";
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = () => {
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
              size="default"
              tooltip={firstName}
              className="rounded-lg data-[state=open]:bg-sidebar-accent h-9"
            >
              <Avatar className="size-6 ring-1 ring-border">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <span className="truncate text-[13px] font-normal">{firstName}</span>
              <MoreVertical className="ml-auto size-4 text-muted-foreground" strokeWidth={1.5} />
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
                <Avatar className="h-8 w-8 ring-1 ring-border">
                  {avatarUrl && (
                    <AvatarImage src={avatarUrl} alt={fullName} />
                  )}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{fullName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {email}
                  </span>
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
  void studioId;
  const isActive = useActiveCheck();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" variant="sidebar" className={isCollapsed ? "cursor-pointer" : ""}>
      {/* Click-to-expand overlay for collapsed state */}
      {isCollapsed && (
        <div
          className="absolute inset-0 z-10"
          onClick={(e) => {
            // Don't expand if clicking on an actual button/link
            if ((e.target as HTMLElement).closest('button, a')) return;
            toggleSidebar();
          }}
          aria-label="Expand sidebar"
        />
      )}
      <SidebarHeader className="pt-3 pb-4 px-3 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <div className="flex items-center gap-1 group-data-[collapsible=icon]:justify-center">
          <WorkspaceSwitcher />
          <SidebarTrigger className="ml-auto size-7 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-lg group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-2 px-1 group-data-[collapsible=icon]:px-0">
        <SetupGuideCard />

        {/* TOP SECTION — HQ / Plays / Conversations / Capture */}
        <SidebarGroup className="py-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {TOP_NAV.map((item) => {
                const active = isActive(item.url);
                const count = "count" in item ? item.count : undefined;

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="font-normal text-[13px] rounded-lg h-9"
                    >
                      <Link href={item.url}>
                        <item.icon className="size-4 text-sidebar-foreground" strokeWidth={1.5} />
                        <span className="flex-1">{item.title}</span>
                        {count !== undefined && (
                          count > 0 ? (
                            <span
                              className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-light text-foreground"
                              style={{ backgroundColor: "#e8e9fe" }}
                            >
                              {count}
                            </span>
                          ) : (
                            <span
                              className="flex items-center justify-center size-5 rounded-full text-success"
                              style={{ backgroundColor: "#eafde4" }}
                            >
                              <Check className="size-3" strokeWidth={2} />
                            </span>
                          )
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* TABLE — project command centers */}
        <CollapsibleGroup
          label="Roundtables"
          icon={Orbit}
          href="/roundtables"
          defaultOpen={[...PINNED_TABLE_NAV, ...ALL_TABLE_NAV].some((item) =>
            isActive(item.url)
          )}
        >
          {PINNED_TABLE_NAV.map((item) => (
            <NavSubItem
              key={item.url}
              url={item.url}
              title={item.title}
              icon={Pin}
            />
          ))}
          <NavSubSection
            title="All Roundtables"
            defaultOpen={false}
          >
            {ALL_TABLE_NAV.map((item) => (
              <NavSubItem
                key={item.url}
                url={item.url}
                title={item.title}
              />
            ))}
          </NavSubSection>
        </CollapsibleGroup>

        {/* MEMORY — records and context Salt remembers */}
        <CollapsibleGroup
          label="Memory"
          icon={Database}
          toggleOnly
          defaultOpen={MEMORY_NAV.some((item) => isActive(item.url))}
        >
          {MEMORY_NAV.map((item) => {
            const icon =
              "icon" in item
                ? (item.icon as React.ComponentType<{
                    className?: string;
                    strokeWidth?: number;
                  }>)
                : undefined;
            return (
              <NavSubItem
                key={item.url}
                url={item.url}
                title={item.title}
                icon={icon}
              />
            );
          })}
        </CollapsibleGroup>
      </SidebarContent>

      <SidebarFooter className="px-1 group-data-[collapsible=icon]:px-0">
        <NavUser user={user} profile={profile} />
      </SidebarFooter>
    </Sidebar>
  );
}
