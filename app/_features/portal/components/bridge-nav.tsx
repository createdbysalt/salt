"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/utils";
import {
  Home,
  TrendingUp,
  Clock,
  FolderOpen,
  MessageSquare,
  FileText,
  CreditCard,
  Settings
} from "lucide-react";
import { Badge } from "@/app/_components/ui/badge";
import { useUnreadCount } from "@/app/_features/messaging/hooks";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  exactMatch: boolean;
  disabled?: boolean;
  disabledReason?: string;
  unreadCount?: number;
}

function getNavItems(messagesUnreadCount: number): NavItem[] {
  return [
    {
      href: "/bridge",
      label: "Overview",
      icon: Home,
      exactMatch: true,
    },
    {
      href: "/bridge/intelligence",
      label: "Intelligence",
      icon: TrendingUp,
      exactMatch: false,
    },
    {
      href: "/bridge/progress",
      label: "Progress",
      icon: Clock,
      exactMatch: false,
    },
    {
      href: "/bridge/files",
      label: "Knowledge Base",
      icon: FolderOpen,
      exactMatch: false,
    },
    {
      href: "/bridge/messages",
      label: "Messages",
      icon: MessageSquare,
      exactMatch: false,
      unreadCount: messagesUnreadCount,
    },
    {
      href: "/bridge/requests",
      label: "Requests",
      icon: FileText,
      exactMatch: false,
    },
    {
      href: "/bridge/billing",
      label: "Billing",
      icon: CreditCard,
      exactMatch: false,
    },
    {
      href: "/bridge/settings",
      label: "Settings",
      icon: Settings,
      exactMatch: false,
    },
  ];
}

interface BridgeNavProps {
  clientId: string;
}

export function BridgeNav({ clientId }: BridgeNavProps) {
  const pathname = usePathname();
  const { totalUnread } = useUnreadCount({
    userType: "client",
    clientId,
  });

  // Memoize nav items with unread count
  const navItems = useMemo(() => getNavItems(totalUnread), [totalUnread]);

  const isActive = (href: string, exactMatch: boolean) => {
    if (exactMatch) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="flex h-full flex-col gap-1 p-4 bg-sidebar border-r border-border">
      {navItems.map((item) => {
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
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs font-semibold">
                {item.unreadCount > 99 ? "99+" : item.unreadCount}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
