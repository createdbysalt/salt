import { Archive, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import type { SourceKind } from "@/app/_lib/demo/people-demo-data";
import { relativeDays } from "@/app/_lib/demo/people-demo-data";
import { SourceChip } from "./SourceChip";

export function TrustRow({
  source,
  lastUpdatedAt,
  entityName,
}: {
  source: SourceKind;
  lastUpdatedAt: string;
  entityName?: string;
}) {
  const label = entityName ?? "Record";

  return (
    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/40 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <Clock className="size-3.5" strokeWidth={2} />
        Updated {relativeDays(lastUpdatedAt)}
      </span>
      <span className="text-border">·</span>
      <SourceChip source={source} />
      <span className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => toast(`${label} archived`)}
          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition"
        >
          <Archive className="size-3.5" strokeWidth={2} />
          Archive
        </button>
        <button
          type="button"
          onClick={() => toast.error(`${label} deleted`)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2.5 py-1 text-xs transition",
            "text-muted-foreground hover:text-destructive hover:border-destructive/30"
          )}
        >
          <Trash2 className="size-3.5" strokeWidth={2} />
          Delete
        </button>
      </span>
    </div>
  );
}
