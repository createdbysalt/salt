"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import type { SourceKind } from "@/app/_lib/demo/people-demo-data";
import { relativeDays } from "@/app/_lib/demo/people-demo-data";
import { archiveItem, trashItem } from "@/app/_features/memory/actions/trash";
import type { TrashEntityType } from "@/app/_features/memory/types/trash";
import { SourceChip } from "./SourceChip";

const DIRECTORY_PATHS: Record<TrashEntityType, string> = {
  person: "/people",
  org: "/orgs",
  work: "/work",
  note: "/me",
};

export function TrustRow({
  source,
  lastUpdatedAt,
  entityName,
  entityType,
  entityId,
}: {
  source: SourceKind;
  lastUpdatedAt: string | null;
  entityName?: string;
  entityType?: TrashEntityType;
  entityId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const label = entityName ?? "Record";
  const canManage = Boolean(entityType && entityId);

  function handleArchive() {
    if (!entityType || !entityId) return;
    startTransition(async () => {
      const result = await archiveItem(entityType, entityId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`${label} archived`);
      router.push(DIRECTORY_PATHS[entityType]);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!entityType || !entityId) return;
    const confirmed = window.confirm(`Move ${label} to Trash?`);
    if (!confirmed) return;
    startTransition(async () => {
      const result = await trashItem(entityType, entityId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`${label} moved to Trash`);
      router.push(DIRECTORY_PATHS[entityType]);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/40 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <Clock className="size-3.5" strokeWidth={2} />
        Updated {relativeDays(lastUpdatedAt)}
      </span>
      <span className="text-border">·</span>
      <SourceChip source={source} />
      {canManage ? (
        <span className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            disabled={isPending}
            onClick={handleArchive}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition disabled:opacity-50"
          >
            <Archive className="size-3.5" strokeWidth={2} />
            Archive
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2.5 py-1 text-xs transition disabled:opacity-50",
              "text-muted-foreground hover:text-destructive hover:border-destructive/30"
            )}
          >
            <Trash2 className="size-3.5" strokeWidth={2} />
            Delete
          </button>
        </span>
      ) : null}
    </div>
  );
}
