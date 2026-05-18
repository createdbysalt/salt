"use client";

import * as React from "react";
import { cn } from "@repo/utils";

interface Tab {
  label: React.ReactNode;
  value: string;
  disabled?: boolean;
}

interface PageBannerProps {
  /** Mono uppercase eyebrow text (e.g., "SATURDAY, MAY 16") */
  eyebrow?: string;
  title: string;
  /** Subtitle/description below title (string) */
  subtitle?: string;
  /** Subtitle as ReactNode for rich content (icons, etc.) - takes precedence over subtitle */
  subtitleContent?: React.ReactNode;
  /** @deprecated Use subtitle instead */
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
  /** Tabs rendered at bottom with border divider */
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
  /** Remove bottom border (ignored if tabs are present) */
  noBorder?: boolean;
  /** Extend border to full viewport width (edge-to-edge) */
  fullWidthDivider?: boolean;
  /** Size variant: "hero" (32px) for dashboard greetings, "default" (24px) for standard pages */
  size?: "default" | "hero";
}

/**
 * Sliding tabs with animated indicator
 */
function SlidingTabs({
  tabs,
  activeTab,
  onTabChange,
  fullWidthDivider,
}: {
  tabs: Tab[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
  fullWidthDivider?: boolean;
}) {
  const tabRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = React.useState({ left: 0, width: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Update indicator position when active tab changes
  React.useEffect(() => {
    if (!activeTab) return;
    const activeButton = tabRefs.current.get(activeTab);
    const container = containerRef.current;
    if (activeButton && container) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      setIndicator({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
    }
  }, [activeTab]);

  return (
    <div className="mt-8 relative">
      {/* Tabs row */}
      <div ref={containerRef} className="flex items-center relative">
        {tabs.map((tab, index) => (
          <button
            key={tab.value}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.value, el);
            }}
            type="button"
            onClick={() => !tab.disabled && onTabChange?.(tab.value)}
            disabled={tab.disabled}
            className={cn(
              "relative py-3 text-xs font-normal transition-colors",
              index === 0 ? "pr-3" : "px-3",
              tab.value === activeTab
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
              tab.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {tab.label}
          </button>
        ))}
        {/* Sliding indicator */}
        <span
          className="absolute bottom-0 h-[2px] bg-foreground transition-all duration-200 ease-out"
          style={{
            left: indicator.left,
            width: indicator.width,
          }}
        />
      </div>
      {/* Border line - extends full width if requested */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-px bg-border",
          fullWidthDivider && "-left-12 -right-12"
        )}
      />
    </div>
  );
}

/**
 * Page banner with eyebrow, title, subtitle, tabs, and actions.
 *
 * @example Basic
 * <PageBanner title="Projects" subtitle="Manage your active projects" />
 *
 * @example With eyebrow and tabs (Ramp-inspired)
 * <PageBanner
 *   eyebrow="SATURDAY, MAY 16"
 *   title="Good morning, Gabriella"
 *   subtitle="3 things worth your attention today."
 *   tabs={[
 *     { label: "Today", value: "today" },
 *     { label: "This Week", value: "week" },
 *     { label: "This Month", value: "month" },
 *   ]}
 *   activeTab="today"
 *   onTabChange={setTab}
 *   actions={<Button>New</Button>}
 * />
 */
export function PageBanner({
  eyebrow,
  title,
  subtitle,
  subtitleContent,
  description,
  actions,
  breadcrumbs,
  className,
  tabs,
  activeTab,
  onTabChange,
  noBorder = false,
  fullWidthDivider = false,
  size = "default",
}: PageBannerProps) {
  const displaySubtitle = subtitleContent ?? subtitle ?? description;
  const hasTabs = tabs && tabs.length > 0;
  const showBorder = hasTabs || !noBorder;

  const isHero = size === "hero";

  return (
    <div className={cn("mb-6", className)}>
      {/* Breadcrumbs (legacy support) */}
      {breadcrumbs && (
        <div className="text-sm text-muted-foreground mb-2">{breadcrumbs}</div>
      )}

      {/* Main banner row: eyebrow/title/subtitle + actions */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {/* Eyebrow: salt-eyebrow class (11px, weight 500, tracking 0.08em) */}
          {eyebrow && (
            <p className={cn("salt-eyebrow", isHero ? "mb-4" : "mb-2")}>{eyebrow}</p>
          )}

          {/* Title: hero (32px, medium) or default H1 (24px, semibold) */}
          <h1
            className={cn(
              "tracking-tight text-foreground",
              isHero
                ? "text-[32px] leading-[1.15] font-medium"
                : "text-2xl font-semibold"
            )}
          >
            {title}
          </h1>

          {/* Subtitle */}
          {displaySubtitle && (
            <div className={cn(
              "text-muted-foreground max-w-2xl",
              isHero ? "mt-3 text-xs" : "mt-2 text-sm"
            )}>
              {displaySubtitle}
            </div>
          )}
        </div>

        {/* Actions slot */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>

      {/* Tabs with border divider */}
      {hasTabs && (
        <SlidingTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
          fullWidthDivider={fullWidthDivider}
        />
      )}

      {/* Border divider (only if no tabs and border requested) */}
      {!hasTabs && showBorder && (
        <div className={cn("mt-4 relative")}>
          <div className={cn("h-px bg-border", fullWidthDivider && "-mx-12")} />
        </div>
      )}
    </div>
  );
}

/**
 * Get time-based greeting.
 * - Before 12:00 → "Good morning"
 * - 12:00–17:00 → "Good afternoon"
 * - After 17:00 → "Good evening"
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Format date for eyebrow display.
 * Returns "SATURDAY, MAY 16" format.
 */
export function formatEyebrowDate(date: Date = new Date()): string {
  return date
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();
}
