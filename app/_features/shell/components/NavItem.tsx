"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/utils";
import { Badge } from "@/app/_components/ui/badge";
import type { NavItem as NavItemType } from "../types/navigation";

interface NavItemProps {
  item: NavItemType;
  collapsed?: boolean;
}

/**
 * Navigation item component
 * Shows active state with bright text/icons; inactive state with greyed text/icons
 * Supports disabled state with reduced opacity and no navigation
 * Supports collapsed mode (icon-only)
 */
export function NavItem({ item, collapsed = false }: NavItemProps) {
  const pathname = usePathname();

  // Only use startsWith for nested routes (not mode roots like /studio, /strategy, /serve)
  // This prevents /studio from matching /studio/clients
  const isModeRoot = ["/studio", "/strategy", "/serve"].includes(item.href);
  const isActive = isModeRoot
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const Icon = item.icon;

  // Disabled state - render as div without navigation
  if (item.disabled) {
    return (
      <div
        className={cn(
          // Linear: 13px, weight 450 - verified from actual app
          "flex items-center rounded-md text-[13px] font-[450] transition-all cursor-not-allowed opacity-50",
          "text-muted-foreground",
          collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2.5"
        )}
        aria-disabled="true"
        title={item.disabledReason || "Coming soon"}
      >
        {Icon && <Icon className={cn(collapsed ? "h-5 w-5 shrink-0" : "h-4 w-4 shrink-0", "text-sidebar-icon")} strokeWidth={1.75} />}
        {!collapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <Badge variant="outline" className="text-[10px] font-semibold">
                {item.badge}
              </Badge>
            )}
          </>
        )}
      </div>
    );
  }

  // Unread count badge component
  const UnreadBadge = item.unreadCount && item.unreadCount > 0 ? (
    <Badge
      variant="destructive"
      className={cn(
        "font-semibold",
        collapsed
          ? "absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center"
          : "h-5 min-w-5 px-1.5 text-xs"
      )}
    >
      {item.unreadCount > 99 ? "99+" : item.unreadCount}
    </Badge>
  ) : null;

  return (
    <Link
      href={item.href}
      className={cn(
        // Linear: 13px, weight 450 - verified from actual app
        "flex items-center rounded-md text-[13px] font-[450] transition-[background-color,color,transform] duration-[160ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
        collapsed ? "justify-center px-2 py-3 relative" : "gap-3 px-3 py-2.5",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/30 hover:text-sidebar-primary"
      )}
    >
      {Icon && <Icon className={cn(
        collapsed ? "h-5 w-5 shrink-0" : "h-4 w-4 shrink-0",
        isActive ? "text-sidebar-accent-foreground" : "text-sidebar-icon"
      )} strokeWidth={1.75} />}
      {collapsed && UnreadBadge}
      {!collapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {UnreadBadge}
          {!UnreadBadge && item.badge && (
            <Badge variant={isActive ? "secondary" : "outline"} className="text-[10px] font-semibold">
              {item.badge}
            </Badge>
          )}
        </>
      )}
    </Link>
  );
}

