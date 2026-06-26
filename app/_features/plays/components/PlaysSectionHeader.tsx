import type { ReactNode } from "react";

export function PlaysSectionHeader({
  eyebrow,
  title,
  count,
  description,
  action,
  meta,
  tone = "dark",
}: {
  eyebrow?: string;
  title: string;
  count?: number;
  description?: string;
  action?: ReactNode;
  meta?: ReactNode;
  tone?: "light" | "dark";
}) {
  const isLight = tone === "light";
  const eyebrowColor = isLight ? "text-white" : "text-foreground";
  const titleColor = isLight ? "text-white" : "text-foreground";
  const countColor = isLight ? "text-white/60" : "text-foreground/50";
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="space-y-3 min-w-0">
        {eyebrow ? (
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-flame animate-pulse-glow" />
            <span className={`text-[10px] font-bold tracking-[0.22em] uppercase ${eyebrowColor}`}>
              {eyebrow}
            </span>
          </div>
        ) : null}
        <h2 className={`font-display font-semibold text-3xl sm:text-4xl md:text-5xl lg:text-[58px] leading-[1.02] ${titleColor}`}>
          {title}
          {typeof count === "number" && (
            <span className={`ml-2 sm:ml-3 text-2xl sm:text-3xl lg:text-4xl tabular-nums align-baseline font-medium ${countColor}`}>
              {count}
            </span>
          )}
        </h2>
        {description && (
          <p className="max-w-xl text-sm sm:text-base text-muted-foreground leading-[1.55] pt-0.5">{description}</p>
        )}
      </div>
      {(action || meta) && (
        <div className="flex items-center gap-3 sm:mb-1 w-full sm:w-auto shrink-0">
          {meta}
          {action}
        </div>
      )}
    </header>
  );
}
