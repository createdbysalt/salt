"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/utils";
import {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  Mail,
  Palette,
} from "lucide-react";

interface SidebarNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
}

const navItems: SidebarNavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Clients",
    href: "/dashboard/clients",
    icon: Users,
  },
  {
    title: "Style Guide",
    href: "/dashboard/style-guide",
    icon: Palette,
    section: "Development",
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    section: "Account",
  },
  {
    title: "Docs",
    href: "/dashboard/docs",
    icon: FileText,
    section: "Account",
  },
  {
    title: "Contact",
    href: "/dashboard/contact",
    icon: Mail,
    section: "Account",
  },
];

interface DashboardSidebarProps {
  user?: {
    email?: string;
    user_metadata?: {
      full_name?: string;
    };
  };
}

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname();

  // Group items by section
  const sections: { [key: string]: SidebarNavItem[] } = {
    main: [],
    Development: [],
    Account: [],
  };

  navItems.forEach((item) => {
    const section = item.section || "main";
    if (!sections[section]) {
      sections[section] = [];
    }
    sections[section].push(item);
  });

  return (
    <aside className="fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)] w-64 border-r bg-background">
      <div className="flex h-full flex-col gap-2 p-4">
        {/* User Profile Section */}
        {user && (
          <div className="mb-4 pb-4 border-b">
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">
                {user.user_metadata?.full_name || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-6">
          {/* Main section */}
          {sections.main.length > 0 && (
            <div className="space-y-1">
              {sections.main.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Development section */}
          {sections.Development.length > 0 && (
            <div className="space-y-1">
              <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Development
              </h3>
              {sections.Development.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Account section */}
          {sections.Account.length > 0 && (
            <div className="space-y-1">
              <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Account
              </h3>
              {sections.Account.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>
      </div>
    </aside>
  );
}

