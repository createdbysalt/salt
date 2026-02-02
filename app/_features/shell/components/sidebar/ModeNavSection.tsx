"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { cn } from "@repo/utils";
import { Button } from "@/app/_components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip";
import type { NavSection } from "../../types/navigation";

interface ModeNavSectionProps {
  section: NavSection;
  collapsed: boolean;
}

/**
 * Mode navigation section component
 * Shows a single nav item that links to the section home
 * The multi-view tabs appear on the page content, not in the sidebar
 *
 * Structure:
 * ┌─────────────────────────────┐
 * │ 🧠 Intelligence       [⚙️]  │  ← Links to /strategy
 * └─────────────────────────────┘
 */
export function ModeNavSection({ section, collapsed }: ModeNavSectionProps) {
  const pathname = usePathname();
  const Icon = section.icon;

  // The section home is the first view's href
  const sectionHref = section.views[0]?.href || "#";

  // Check if we're anywhere in this section
  const isActive = section.views.some(
    (view) => pathname === view.href || pathname.startsWith(`${view.href}/`)
  );

  // Disabled section
  if (section.disabled) {
    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center px-2 py-3 opacity-50 cursor-not-allowed">
              <Icon className="h-5 w-5 text-sidebar-icon" strokeWidth={1.75} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{section.label}</p>
            {section.disabledReason && (
              <p className="text-xs text-muted-foreground mt-1">
                {section.disabledReason}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <div className="opacity-50 cursor-not-allowed px-3">
        <div className="flex items-center gap-2 py-2">
          <Icon className="h-4 w-4 text-sidebar-icon" strokeWidth={1.75} />
          <span className="text-[13px] font-medium text-sidebar-foreground">
            {section.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground pl-6">
          {section.disabledReason || "Coming soon"}
        </p>
      </div>
    );
  }

  // Collapsed view - just show icon
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={sectionHref}
            className={cn(
              "flex items-center justify-center px-2 py-3 rounded-md transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/30"
            )}
          >
            <Icon className={cn(
              "h-5 w-5",
              isActive ? "text-sidebar-accent-foreground" : "text-sidebar-icon"
            )} strokeWidth={1.75} />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{section.label}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Expanded view - section header with optional settings icon
  return (
    <div className="px-3">
      <div
        className={cn(
          "flex items-center justify-between py-2.5 px-3 rounded-md transition-colors group",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/30"
        )}
      >
        <Link
          href={sectionHref}
          className="flex items-center gap-2 flex-1"
        >
          <Icon className={cn(
            "h-4 w-4",
            isActive ? "text-sidebar-accent-foreground" : "text-sidebar-icon"
          )} strokeWidth={1.75} />
          <span className={cn(
            "text-[13px] font-medium",
            isActive ? "text-sidebar-foreground" : "text-sidebar-foreground/80"
          )}>
            {section.label}
          </span>
        </Link>
        {section.settingsHref && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-sidebar-foreground/50 hover:text-sidebar-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                asChild
              >
                <Link href={section.settingsHref}>
                  <Settings className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{section.label} Settings</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
