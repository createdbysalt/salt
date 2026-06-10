import { cn } from "@repo/utils";
import type { Signal } from "@/app/_lib/demo/people-demo-data";

const TONE: Record<Signal["kind"], string> = {
  payment_due: "bg-destructive/10 text-destructive border-destructive/30",
  quiet: "bg-muted text-muted-foreground border-border/60",
  active_work: "bg-sky/15 text-foreground/80 border-sky/30",
  meeting_soon: "bg-violet/15 text-foreground/80 border-violet/30",
  renewal_risk: "bg-flame/15 text-flame border-flame/30",
};

export function SignalPill({ signal, className }: { signal: Signal; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        TONE[signal.kind],
        className
      )}
    >
      {signal.label}
    </span>
  );
}
