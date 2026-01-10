"use client";

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

const mainNavItems = [
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
    disabled: true,
  },
];

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
    disabled: true,
  },
  {
    href: "/bridge/settings",
    label: "Settings",
  },
];

export function BridgeMobileNav() {
  const pathname = usePathname();

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

          if (item.disabled) {
            return (
              <button
                key={item.href}
                disabled
                className="flex flex-col items-center justify-center flex-1 gap-1 opacity-50"
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 gap-1 transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
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
              <DropdownMenuItem
                key={item.href}
                disabled={item.disabled}
                asChild={!item.disabled}
              >
                {item.disabled ? (
                  <div className="flex items-center justify-between">
                    <span>{item.label}</span>
                    <span className="text-xs">🚧</span>
                  </div>
                ) : (
                  <Link href={item.href}>{item.label}</Link>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
