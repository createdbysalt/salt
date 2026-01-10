"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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
import { Badge } from "@/components/ui/badge";

const navItems = [
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
    disabled: true,
    disabledReason: "Coming Q1-Q2 2026",
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

export function BridgeNav() {
  const pathname = usePathname();

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
                🚧
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
          </Link>
        );
      })}
    </nav>
  );
}


