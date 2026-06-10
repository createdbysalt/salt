import { Download, Sparkles, User } from "lucide-react";
import { cn } from "@repo/utils";
import type { SourceKind } from "@/app/_lib/demo/people-demo-data";

const META: Record<SourceKind, { label: string; icon: typeof Sparkles; className: string }> = {
  user: { label: "You", icon: User, className: "text-foreground/70 bg-muted border-border/60" },
  imported: {
    label: "Imported",
    icon: Download,
    className: "text-foreground/70 bg-muted border-border/60",
  },
  salt_inferred: {
    label: "Salt",
    icon: Sparkles,
    className: "text-flame bg-flame/10 border-flame/30",
  },
};

export function SourceChip({ source, className }: { source: SourceKind; className?: string }) {
  const m = META[source];
  const Icon = m.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        m.className,
        className
      )}
    >
      <Icon className="size-2.5" strokeWidth={2.25} />
      {m.label}
    </span>
  );
}
