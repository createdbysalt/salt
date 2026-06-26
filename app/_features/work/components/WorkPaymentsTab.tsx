import Link from "next/link";
import { ArrowRight, ReceiptText } from "lucide-react";
import type { WorkDetailViewModel } from "@/app/_features/work/types";

export function WorkPaymentsTab({ work }: { work: WorkDetailViewModel }) {
  return (
    <div className="rounded-3xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
      <ReceiptText className="mx-auto mb-3 size-6 text-muted-foreground" strokeWidth={1.75} />
      <h3 className="font-display text-xl tracking-tight text-foreground">
        No work-specific payments yet
      </h3>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
        Invoices, retainers, and payment signals for {work.title} will appear here once
        billing context is linked.
      </p>
      <Link
        href="/billing"
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
      >
        Open Billing
        <ArrowRight className="size-3.5" strokeWidth={2.25} />
      </Link>
    </div>
  );
}
