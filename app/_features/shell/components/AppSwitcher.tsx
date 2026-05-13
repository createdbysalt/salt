"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@repo/utils";
import {
  ChevronDown,
  Check,
  Home,
  Users,
  Briefcase,
  Banknote,
  TrendingUp,
  Globe,
  Gem,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui";

// ============================================================================
// APP DEFINITIONS
// ============================================================================

export type AppId = "hq" | "relationships" | "work" | "billing" | "sales" | "websites" | "branding";

interface AppDefinition {
  id: AppId;
  label: string;
  logo: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  available: boolean;
}

const APPS: AppDefinition[] = [
  {
    id: "hq",
    label: "hq",
    logo: "/app-logos/hq.svg",
    icon: Home,
    href: "/hq",
    available: true,
  },
  {
    id: "relationships",
    label: "relationships",
    logo: "/app-logos/relationships.svg",
    icon: Users,
    href: "/relationships",
    available: true,
  },
  {
    id: "work",
    label: "work",
    logo: "/app-logos/work.svg",
    icon: Briefcase,
    href: "/work",
    available: true,
  },
  {
    id: "billing",
    label: "billing",
    logo: "/app-logos/billing.svg",
    icon: Banknote,
    href: "/billing",
    available: true,
  },
  {
    id: "sales",
    label: "sales",
    logo: "/app-logos/sales.svg",
    icon: TrendingUp,
    href: "/sales",
    available: true,
  },
  {
    id: "websites",
    label: "websites",
    logo: "/app-logos/website.svg",
    icon: Globe,
    href: "/websites",
    available: false,
  },
  {
    id: "branding",
    label: "branding",
    logo: "/app-logos/branding.svg",
    icon: Gem,
    href: "/branding",
    available: false,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getCurrentApp(pathname: string): AppDefinition {
  if (pathname.startsWith("/relationships") || pathname.startsWith("/clients")) {
    return APPS.find((app) => app.id === "relationships")!;
  }
  if (pathname.startsWith("/work")) {
    return APPS.find((app) => app.id === "work")!;
  }
  if (pathname.startsWith("/billing")) {
    return APPS.find((app) => app.id === "billing")!;
  }
  if (pathname.startsWith("/sales") || pathname.startsWith("/strategy")) {
    return APPS.find((app) => app.id === "sales")!;
  }
  if (pathname.startsWith("/websites") || pathname.startsWith("/serve")) {
    return APPS.find((app) => app.id === "websites")!;
  }
  if (pathname.startsWith("/branding")) {
    return APPS.find((app) => app.id === "branding")!;
  }
  return APPS.find((app) => app.id === "hq")!;
}

// ============================================================================
// ICON BADGE COMPONENT
// ============================================================================

function AppIconBadge({
  icon: Icon,
  size = "default",
  variant = "default"
}: {
  icon: React.ComponentType<{ className?: string }>;
  size?: "default" | "sm";
  variant?: "default" | "active";
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg",
        variant === "active"
          ? "bg-white/90 dark:bg-white/15 ring-1 ring-white/20"
          : "bg-foreground/[0.08] dark:bg-foreground/[0.12] ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.08]",
        size === "sm" ? "size-7" : "size-8"
      )}
    >
      <Icon
        className={cn(
          variant === "active"
            ? "text-foreground/90 dark:text-white/80"
            : "text-foreground/70 dark:text-foreground/80",
          size === "sm" ? "size-3.5" : "size-4"
        )}
      />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface AppSwitcherProps {
  className?: string;
  onAppChange?: (appId: AppId) => void;
}

export function AppSwitcher({ className, onAppChange }: AppSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const currentApp = getCurrentApp(pathname);

  const handleAppChange = (app: AppDefinition) => {
    if (app.available) {
      onAppChange?.(app.id);
      router.push(app.href);
    }
  };

  const hqApp = APPS.find((app) => app.id === "hq")!;
  const otherApps = APPS.filter((app) => app.id !== "hq");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "flex items-center gap-2.5 px-2 py-1.5 h-auto",
            "hover:bg-sidebar-accent",
            className
          )}
        >
          <AppIconBadge icon={currentApp.icon} variant="active" />
          <img
            src={currentApp.logo}
            alt={currentApp.label}
            className="h-6 w-auto dark:invert-0 invert"
          />
          <ChevronDown className="h-4 w-4 text-muted-foreground ml-0.5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-64"
      >
        {/* HQ at top */}
        <DropdownMenuItem
          onClick={() => handleAppChange(hqApp)}
          className="flex items-center gap-3 py-2.5 px-2.5 cursor-pointer"
        >
          <AppIconBadge icon={hqApp.icon} size="sm" />
          <img
            src={hqApp.logo}
            alt={hqApp.label}
            className="h-5 w-auto dark:invert-0 invert"
          />
          {currentApp.id === hqApp.id && (
            <Check className="h-4 w-4 ml-auto text-foreground/60" />
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Other apps */}
        {otherApps.map((app) => (
          <DropdownMenuItem
            key={app.id}
            onClick={() => handleAppChange(app)}
            disabled={!app.available}
            className={cn(
              "flex items-center gap-3 py-2.5 px-2.5",
              app.available ? "cursor-pointer" : "cursor-not-allowed opacity-40"
            )}
          >
            <AppIconBadge icon={app.icon} size="sm" />
            <img
              src={app.logo}
              alt={app.label}
              className="h-5 w-auto dark:invert-0 invert"
            />
            {!app.available && (
              <span className="ml-auto text-[10px] font-medium tracking-wide uppercase text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded">
                Soon
              </span>
            )}
            {currentApp.id === app.id && (
              <Check className="h-4 w-4 ml-auto text-foreground/60" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
