"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Plus, Settings, PanelLeft } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useSidebar,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { useDashboardUser } from "@/app/_features/shell/contexts/DashboardUserContext";

function workspaceInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "WS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

/**
 * WorkspaceSwitcher — top of the sidebar.
 *
 * When expanded: shows avatar with dropdown for workspace switching.
 * When collapsed: shows avatar, hover reveals expand icon, click expands sidebar.
 */
export function WorkspaceSwitcher({ className }: { className?: string }) {
  const { state, toggleSidebar } = useSidebar();
  const { workspaceName: userWorkspaceName } = useDashboardUser();
  const workspaceName = userWorkspaceName ?? "Workspace";
  const workspaceAvatar = workspaceInitials(workspaceName);
  const isCollapsed = state === "collapsed";
  const [isHovered, setIsHovered] = React.useState(false);

  // Reset hover state when sidebar collapses
  React.useEffect(() => {
    if (isCollapsed) {
      setIsHovered(false);
    }
  }, [isCollapsed]);

  // When collapsed, clicking expands the sidebar
  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggleSidebar}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
              "flex items-center justify-center h-9 w-9 rounded-lg transition-all outline-none cursor-pointer",
              "text-sidebar-foreground",
              "hover:bg-sidebar-accent",
              "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              className
            )}
          >
            {isHovered ? (
              <PanelLeft className="size-4" strokeWidth={1.5} />
            ) : (
              <span className="text-[11px] font-semibold">{workspaceAvatar}</span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          Expand sidebar
          <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-medium bg-muted rounded">⌘.</kbd>
        </TooltipContent>
      </Tooltip>
    );
  }

  // When expanded, show dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-center h-9 w-9 rounded-lg transition-all outline-none cursor-pointer",
            "bg-primary/10 text-primary",
            "hover:bg-primary/15",
            "data-[state=open]:bg-primary/20",
            "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            className
          )}
        >
          <span className="text-[11px] font-semibold">{workspaceAvatar}</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" sideOffset={4} className="w-60">
        <DropdownMenuItem className="flex items-center gap-2 py-2 cursor-default">
          <Avatar className="h-6 w-6 ring-1 ring-border">
            <AvatarFallback className="salt-avatar-company text-[10px] font-semibold">
              {workspaceAvatar}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium flex-1">
            {workspaceName}
          </span>
          <Check className="h-4 w-4 text-foreground/60" />
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link
            href="?settings=general"
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            Workspace settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled
          className="flex items-center gap-2 text-sm opacity-50 cursor-not-allowed"
        >
          <Plus className="h-4 w-4 text-muted-foreground" />
          New workspace
          <span className="ml-auto text-[9px] uppercase tracking-wide text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded">
            Soon
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
