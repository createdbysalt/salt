"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/utils";
import {
  Home,
  TrendingUp,
  FolderOpen,
  MessageSquare,
  MoreHorizontal,
  Clock,
  FileText,
  CreditCard,
  Settings,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { useUnreadCount } from "@/app/_features/messaging/hooks";
import { useProjectContext } from "../context/project-context";

interface MainNavItem {
  href: string;
  label: string;
  icon: typeof Home;
  unreadCount?: number;
}

interface MoreNavItem {
  href: string;
  label: string;
  section: string;
  hideWhenAllProjects?: boolean;
}

function getMainNavItems(messagesUnreadCount: number): MainNavItem[] {
  return [
    {
      href: "/bridge",
      label: "Home",
      icon: Home,
    },
    {
      href: "/bridge/intelligence",
      label: "Intelligence",
      icon: TrendingUp,
    },
    {
      href: "/bridge/knowledge",
      label: "Knowledge",
      icon: FolderOpen,
    },
    {
      href: "/bridge/messages",
      label: "Messages",
      icon: MessageSquare,
      unreadCount: messagesUnreadCount,
    },
  ];
}

function getMoreNavItems(): MoreNavItem[] {
  return [
    {
      href: "/bridge/progress",
      label: "Progress",
      section: "MY PROJECT",
      hideWhenAllProjects: true,
    },
    {
      href: "/bridge/requests",
      label: "Requests",
      section: "ACCOUNT",
    },
    {
      href: "/bridge/billing",
      label: "Billing",
      section: "ACCOUNT",
    },
    {
      href: "/bridge/settings",
      label: "Settings",
      section: "ACCOUNT",
    },
  ];
}

interface BridgeMobileNavProps {
  clientId: string | null;
}

/**
 * Mobile bottom navigation for Bridge portal
 * Shows main nav items with "More" dropdown for additional items
 */
export function BridgeMobileNav({ clientId }: BridgeMobileNavProps) {
  const pathname = usePathname();
  const { totalUnread } = useUnreadCount({
    userType: "client",
    clientId: clientId ?? undefined,
  });

  // Try to get project context, but handle case where it's not available
  let hasProjectSelected = false;
  try {
    const projectContext = useProjectContext();
    hasProjectSelected = projectContext.hasProjectSelected;
  } catch {
    // ProjectContext not available, default to false
  }

  // Memoize nav items with unread count
  const mainNavItems = useMemo(() => getMainNavItems(totalUnread), [totalUnread]);
  const moreNavItems = useMemo(() => {
    const items = getMoreNavItems();
    return items.filter((item) => {
      if (item.hideWhenAllProjects && !hasProjectSelected) {
        return false;
      }
      return true;
    });
  }, [hasProjectSelected]);

  // Group more items by section
  const groupedMoreItems = useMemo(() => {
    const groups: Record<string, MoreNavItem[]> = {};
    moreNavItems.forEach((item) => {
      if (!groups[item.section]) {
        groups[item.section] = [];
      }
      groups[item.section].push(item);
    });
    return groups;
  }, [moreNavItems]);

  const isActive = (href: string) => {
    if (href === "/bridge") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
      <div className="flex items-center justify-around h-16 px-2">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 gap-1 transition-colors relative",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.unreadCount && item.unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-4 min-w-4 p-0 text-[10px] font-semibold flex items-center justify-center"
                  >
                    {item.unreadCount > 99 ? "99+" : item.unreadCount}
                  </Badge>
                )}
              </div>
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}

        {/* More Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex flex-col items-center justify-center flex-1 gap-1 h-auto py-2 px-0"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-xs">More</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {Object.entries(groupedMoreItems).map(([section, items], index) => (
              <div key={section}>
                {index > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {section}
                </DropdownMenuLabel>
                {items.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
