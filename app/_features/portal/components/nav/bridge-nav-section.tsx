"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/utils";
import { Badge } from "@/app/_components/ui/badge";
import type { LucideIcon } from "lucide-react";

export interface BridgeNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exactMatch?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  unreadCount?: number;
  /**
   * If true, this item is hidden when "All Projects" is selected
   */
  hideWhenAllProjects?: boolean;
}

interface BridgeNavSectionProps {
  title: string;
  items: BridgeNavItem[];
  /**
   * Whether a specific project is selected (vs "All Projects")
   */
  hasProjectSelected?: boolean;
}

/**
 * Grouped navigation section for the Bridge portal
 * Supports project-scoped visibility for certain nav items
 */
export function BridgeNavSection({
  title,
  items,
  hasProjectSelected = false,
}: BridgeNavSectionProps) {
  const pathname = usePathname();

  // Filter items based on project selection
  const visibleItems = items.filter((item) => {
    if (item.hideWhenAllProjects && !hasProjectSelected) {
      return false;
    }
    return true;
  });

  // Don't render section if no visible items
  if (visibleItems.length === 0) {
    return null;
  }

  const isActive = (href: string, exactMatch?: boolean) => {
    if (exactMatch) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="space-y-1">
      <div className="px-3 mb-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
        {title}
      </div>
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href, item.exactMatch);

        if (item.disabled) {
          return (
            <div
              key={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all cursor-not-allowed opacity-50",
                "text-sidebar-foreground"
              )}
              title={item.disabledReason}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              <Badge variant="outline" className="text-[10px] font-semibold">
                Coming Soon
              </Badge>
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/30 hover:text-sidebar-primary"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.unreadCount && item.unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="h-5 min-w-5 px-1.5 text-xs font-semibold"
              >
                {item.unreadCount > 99 ? "99+" : item.unreadCount}
              </Badge>
            )}
          </Link>
        );
      })}
    </div>
  );
}
