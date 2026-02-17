"use client";

import { useRouter } from "next/navigation";
import { useTransition, useEffect } from "react";
import { motion } from "framer-motion";
import { Target, Briefcase, Rocket } from "lucide-react";
import { cn } from "@repo/utils";
import { useDashboardModeContext } from "../contexts/DashboardModeContext";
import { studioRoutes, strategyRoutes, serveRoutes } from "../routes";
import type { DashboardMode, ModeConfig } from "../types/mode";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip";

const modes: ModeConfig[] = [
  {
    id: "studio",
    label: "Studio",
    icon: Briefcase,
    shortcut: "⌘1",
    shortcutKey: "1",
    description: "Projects, clients, and daily work",
    href: studioRoutes.home,
  },
  {
    id: "strategy",
    label: "Strategy",
    icon: Target,
    shortcut: "⌘2",
    shortcutKey: "2",
    description: "Intelligence, reports, and audits",
    href: strategyRoutes.home,
  },
  {
    id: "serve",
    label: "Serve",
    icon: Rocket,
    shortcut: "⌘3",
    shortcutKey: "3",
    description: "Portal config and client experience",
    href: serveRoutes.home,
  },
];

interface ModeSwitcherProps {
  collapsed?: boolean;
}

/**
 * ModeSwitcher - Claude Desktop-inspired horizontal segmented control
 *
 * Expanded: Horizontal tabs in a pill container
 * Collapsed: Vertical icon stack
 *
 * When switching modes, navigates to the mode's home route:
 * - Studio → /studio (⌘1)
 * - Strategy → /strategy (⌘2)
 * - Serve → /serve (⌘3)
 */
export function ModeSwitcher({ collapsed = false }: ModeSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { activeMode, setMode, isLoaded } = useDashboardModeContext();

  // Prefetch all mode routes for instant navigation
  useEffect(() => {
    modes.forEach((mode) => {
      if (mode.href) {
        router.prefetch(mode.href);
      }
    });
  }, [router]);

  const handleModeSwitch = (mode: ModeConfig) => {
    // Update mode immediately for instant visual feedback
    setMode(mode.id);
    // Navigate in a transition to avoid blocking the UI
    const href = mode.href;
    if (href) {
      startTransition(() => {
        router.push(href);
      });
    }
  };

  if (!isLoaded) {
    return (
      <div
        className={cn(
          "rounded-lg bg-sidebar-accent/30 animate-pulse",
          collapsed ? "h-[108px] w-10" : "h-10"
        )}
      />
    );
  }

  // Collapsed mode: vertical icon stack
  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <div className="flex flex-col items-center gap-1">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = activeMode === mode.id;

            return (
              <Tooltip key={mode.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleModeSwitch(mode)}
                    className={cn(
                      "flex items-center justify-center w-full py-3 rounded-md transition-all",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
                    )}
                  >
                    <Icon className="h-[22px] w-[22px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="flex items-center gap-2">
                  <span>{mode.label}</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground bg-muted border border-border rounded">
                    {mode.shortcut}
                  </kbd>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    );
  }

  // Expanded mode: horizontal segmented control with sliding indicator
  const activeIndex = modes.findIndex((m) => m.id === activeMode);

  return (
    <div
      className="relative flex p-1.5 rounded-lg"
      style={{
        backgroundColor: '#3d3d3d', // Subtle elevated dark gray (like Claude's warm gray container)
      }}
    >
      {/* Sliding indicator - Framer Motion spring animation */}
      <motion.div
        className="absolute rounded-md pointer-events-none"
        style={{
          width: `calc((100% - 12px) / 3)`,
          height: `calc(100% - 12px)`,
          top: '6px',
          left: '6px',
          backgroundColor: '#1a1a1a',
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
        }}
        animate={{
          x: `${activeIndex * 100}%`,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 35,
        }}
      />

      {/* Tab buttons */}
      {modes.map((mode) => {
        const isActive = activeMode === mode.id;

        return (
          <button
            key={mode.id}
            onClick={() => handleModeSwitch(mode)}
            className="relative z-10 flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200"
            style={{
              color: isActive ? '#ffffff' : '#b3b3b3',
            }}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Get all mode configs (useful for command palette, etc.)
 */
export function getModeConfigs(): ModeConfig[] {
  return modes;
}
