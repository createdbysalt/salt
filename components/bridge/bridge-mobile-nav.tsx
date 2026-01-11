"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, TrendingUp, FolderOpen, MessageSquare, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUnreadCount } from "@/libs/hooks";

interface MainNavItem {
  href: string;
  label: string;
  icon: typeof Home;
  unreadCount?: number;
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
      href: "/bridge/files",
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

const moreNavItems = [
  {
    href: "/bridge/progress",
    label: "Progress",
  },
  {
    href: "/bridge/requests",
    label: "Requests",
  },
  {
    href: "/bridge/billing",
    label: "Billing",
  },
  {
    href: "/bridge/settings",
    label: "Settings",
  },
];

interface BridgeMobileNavProps {
  clientId: string;
}

export function BridgeMobileNav({ clientId }: BridgeMobileNavProps) {
  const pathname = usePathname();
  const { totalUnread } = useUnreadCount({
    userType: "client",
    clientId,
  });

  // Memoize nav items with unread count
  const mainNavItems = useMemo(() => getMainNavItems(totalUnread), [totalUnread]);

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
            {moreNavItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href}>{item.label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
