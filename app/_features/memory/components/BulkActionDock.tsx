import type { CSSProperties, ReactNode } from "react";
import { cn } from "@repo/utils";

/** Centers a floating bulk-action bar in the main content column (not the full viewport). */
export function BulkActionDock({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-4 sm:bottom-6 z-30 left-1/2 w-[calc(100%-2rem)] max-w-max -translate-x-1/2 sm:w-auto",
        "sm:left-[calc(50%+var(--sidebar-offset,0px)/2-var(--ask-panel-offset,0px)/2)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function bulkActionDockPanelClassName() {
  return "pointer-events-auto inline-flex max-w-full flex-wrap items-center gap-2 p-1.5 pl-4 bg-card/95 backdrop-blur-md border border-border/60 rounded-full shadow-[0_12px_32px_-8px_rgba(0,0,0,0.25)]";
}

/** Layout CSS vars for shells that host fixed bulk-action docks. */
export function memoryPanelLayoutStyle(askOpen: boolean): CSSProperties {
  return {
    "--ask-panel-offset": askOpen ? "var(--ask-shift)" : "0px",
  } as CSSProperties;
}

export const memoryPanelLayoutClassName =
  "[--ask-shift:0px] sm:[--ask-shift:420px] [--sidebar-offset:0px] md:[--sidebar-offset:248px]";
