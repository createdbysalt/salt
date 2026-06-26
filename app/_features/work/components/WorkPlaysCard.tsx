import Link from "next/link";
import { ArrowRight, Inbox, Sparkles } from "lucide-react";
import type { WorkDetailViewModel } from "@/app/_features/work/types";

export function WorkPlaysCard({ work }: { work: WorkDetailViewModel }) {
  const shortName = work.title.split(" ")[0] ?? "Work";

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="mb-5 space-y-3">
        <div className="flex items-start gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-foreground/8">
            <Sparkles className="size-4 text-foreground" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-xl leading-tight tracking-tight">
              Plays for {shortName}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Nothing in motion</p>
          </div>
        </div>
        <Link
          href="/plays"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          Open Plays
          <ArrowRight className="size-3.5 shrink-0" strokeWidth={2} />
        </Link>
      </div>

      <div className="grid place-items-center rounded-2xl border border-dashed border-border/60 p-8 text-center">
        <Inbox className="mb-2 size-5 text-muted-foreground" strokeWidth={1.75} />
        <p className="text-sm text-muted-foreground">
          No plays in approval, scheduled, or team queues.
        </p>
      </div>
    </section>
  );
}
