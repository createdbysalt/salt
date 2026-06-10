"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@repo/utils";

type Props = {
  title?: string;
  description?: string;
  className?: string;
};

export function MockContentEmptyState({
  title = "Nothing here yet",
  description = "Connect your accounts or add records — Salt will surface what matters here.",
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/40 px-8 py-16 text-center",
        className,
      )}
    >
      <div className="grid size-12 place-items-center rounded-2xl bg-muted/80 text-muted-foreground">
        <Sparkles className="size-5" strokeWidth={1.75} />
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
