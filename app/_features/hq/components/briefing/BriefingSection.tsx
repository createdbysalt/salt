import { cn } from "@repo/utils";

type SectionVariant = "default" | "warning" | "success";

interface BriefingSectionProps {
  title: string;
  count?: number;
  summary?: string;
  variant?: SectionVariant;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

const variantConfig: Record<
  SectionVariant,
  { border: string; glow: string; badge: string; summary: string }
> = {
  default: {
    border: "border-primary/20",
    glow: "",
    badge: "bg-primary/10 text-primary",
    summary: "text-muted-foreground",
  },
  warning: {
    border: "border-warning/30",
    glow: "shadow-[0_0_30px_-10px_oklch(var(--warning)/0.15)]",
    badge: "bg-warning/10 text-warning",
    summary: "text-warning",
  },
  success: {
    border: "border-success/30",
    glow: "shadow-[0_0_30px_-10px_oklch(var(--success)/0.15)]",
    badge: "bg-success/10 text-success",
    summary: "text-success",
  },
};

export function BriefingSection({
  title,
  count,
  summary,
  variant = "default",
  children,
  className,
  id,
}: BriefingSectionProps) {
  const config = variantConfig[variant];

  return (
    <section id={id} className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
            {title}
          </h2>
          {count !== undefined && count > 0 && (
            <span
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums",
                config.badge
              )}
            >
              {count}
            </span>
          )}
        </div>
        {summary && (
          <span
            className={cn(
              "text-sm font-semibold tabular-nums tracking-tight",
              config.summary
            )}
          >
            {summary}
          </span>
        )}
      </div>

      {/* Content card with gradient border effect */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-card/50 backdrop-blur-sm transition-all duration-300",
          config.border,
          config.glow
        )}
      >
        {/* Subtle gradient overlay */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 opacity-30",
            variant === "warning" &&
              "bg-gradient-to-br from-amber-500/5 via-transparent to-transparent",
            variant === "success" &&
              "bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent"
          )}
        />

        <div className="relative">{children}</div>
      </div>
    </section>
  );
}
