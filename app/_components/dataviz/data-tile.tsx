import * as React from "react";
import { cn } from "@repo/utils";

export type DataTileVariant = "surface" | "tintBlue" | "tintViolet" | "deepEmerald" | "ink";

interface DataTileProps {
  variant?: DataTileVariant;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  metric?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<DataTileVariant, string> = {
  surface: "bg-[rgb(var(--dv-surface))] text-[rgb(var(--dv-surface-foreground))]",
  tintBlue: "bg-[rgb(var(--dv-tint-blue))] text-[rgb(var(--dv-tint-blue-foreground))]",
  tintViolet: "bg-[rgb(var(--dv-tint-violet))] text-[rgb(var(--dv-tint-violet-foreground))]",
  deepEmerald: "bg-[rgb(var(--dv-deep-emerald))] text-[rgb(var(--dv-deep-emerald-foreground))]",
  ink: "bg-[rgb(var(--dv-ink))] text-[rgb(var(--dv-ink-foreground))]",
};

/**
 * DataTile - Bento-style data visualization tile shell
 * Provides consistent radius, padding, shadow, and header layout
 */
export function DataTile({
  variant = "surface",
  title,
  subtitle,
  metric,
  action,
  children,
  className,
}: DataTileProps) {
  const hasHeader = title || subtitle || metric || action;

  return (
    <div
      className={cn(
        "rounded-[var(--dv-radius)] p-[var(--dv-pad)]",
        "shadow-[var(--dv-shadow)]",
        variantStyles[variant],
        className
      )}
    >
      {hasHeader && (
        <div className="mb-6 flex items-start justify-between">
          <div className="space-y-1">
            {title && (
              <h3 className={cn(
                "text-xs font-medium uppercase tracking-wide",
                variant === "deepEmerald" ? "text-[rgb(var(--dv-deep-emerald-foreground))]" : "opacity-60"
              )}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className={cn(
                "text-[10px]",
                variant === "deepEmerald" 
                  ? "text-[rgb(var(--dv-deep-emerald-muted))]" 
                  : "opacity-40"
              )}>
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {metric && (
              <div className="text-right text-3xl font-bold">
                {metric}
              </div>
            )}
            {action && <div>{action}</div>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

