"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, TrendingUp, FolderOpen, Activity } from "lucide-react";

interface ProjectTabsProps {
  projectId: string;
}

const tabs = [
  {
    name: "Overview",
    href: "",
    icon: LayoutDashboard,
  },
  {
    name: "Intelligence",
    href: "/intelligence",
    icon: TrendingUp,
  },
  {
    name: "Files",
    href: "/files",
    icon: FolderOpen,
  },
  {
    name: "Activity",
    href: "/activity",
    icon: Activity,
  },
];

export function ProjectTabs({ projectId }: ProjectTabsProps) {
  const pathname = usePathname();
  const basePath = `/dashboard/projects/${projectId}`;

  const isActive = (tabHref: string) => {
    if (tabHref === "") {
      return pathname === basePath;
    }
    return pathname === `${basePath}${tabHref}`;
  };

  return (
    <div className="border-b border-border">
      <nav className="flex gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href);

          return (
            <Link
              key={tab.name}
              href={`${basePath}${tab.href}`}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
