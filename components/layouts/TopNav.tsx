"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/libs/cn";
import { Box } from "lucide-react";

interface TopNavProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const tabs = [
  { label: "Agents", href: "/dashboard/agents" },
  { label: "Dashboard", href: "/dashboard" },
];

/**
 * TopNav - Fixed top header with centered tabs matching reference design
 */
export function TopNav({ user }: TopNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full items-center justify-between px-8">
      {/* Logo (far left) */}
      <div className="flex items-center">
        <Box className="h-6 w-6 text-foreground" />
      </div>

      {/* Centered Navigation Tabs */}
      <div className="flex items-center justify-center gap-10">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || 
            (tab.href !== "/dashboard" && pathname?.startsWith(tab.href));
          
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "text-sm transition-colors",
                isActive
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* User Avatar (far right) */}
      <div className="flex items-center">
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-foreground text-xs font-semibold hover:bg-zinc-600 transition-colors">
          {user?.name?.charAt(0)?.toUpperCase() || "AS"}
        </button>
      </div>
    </div>
  );
}

