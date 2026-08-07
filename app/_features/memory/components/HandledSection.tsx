"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Undo2 } from "lucide-react";
import { PlaysTabEmptyState } from "@/app/_features/plays/components/PlaysTabEmptyState";
import type { HandledWrite } from "../queries/handled-items";
import type { AdmissionItem } from "../queries/admission-decisions";
import { markHandledWriteWrong } from "../actions/handled-items";

/**
 * Memory → Filter → Handled.
 *
 * The audit trail: what Salt already applied to your records, why, and what
 * it let in. Correction-over-approval — anything wrong gets rolled back and
 * taught from with one click.
 */

interface HandledSectionProps {
  writes: HandledWrite[];
  letIn: AdmissionItem[];
  onUpdate?: () => void;
}

const CAPABILITY_LABELS: Record<string, string> = {
  "memory-records": "Memory Care · Records",
  "memory-hygiene": "Memory Care · Hygiene",
  "memory-connections": "Memory Care · Connections",
  "memory-notes": "Memory Care · Notes",
  "memory-care": "Memory Care",
  "people-records": "Memory Care · Records",
  "org-records": "Memory Care · Records",
  "work-records": "Memory Care · Records",
  "meeting-records": "Memory Care · Records",
  "file-records": "Memory Care · Records",
  "billing-records": "Memory Care · Records",
};

function capabilityLabel(slug: string | null): string {
  if (!slug) return "Memory Care";
  return (
    CAPABILITY_LABELS[slug] ??
    slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function HandledWriteRow({
  write,
  onUpdate,
}: {
  write: HandledWrite;
  onUpdate?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [corrected, setCorrected] = useState(false);

  const handleWrong = () => {
    startTransition(async () => {
      const result = await markHandledWriteWrong(write.learningId);
      if (result.success) {
        setCorrected(true);
        toast.success("Rolled back — Salt will learn from this");
        onUpdate?.();
      } else {
        toast.error(result.error ?? "Couldn't roll this back");
      }
    });
  };

  return (
    <li className="rounded-xl border border-border/60 bg-card px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-foreground">
            <span className="font-medium">{write.entityLabel}</span>
            <span className="text-muted-foreground"> · </span>
            <span className="text-muted-foreground">{write.fieldLabel}</span>
            <span className="text-muted-foreground"> → </span>
            <span className="font-medium">{write.newValue}</span>
          </p>
          {write.oldValue ? (
            <p className="text-xs text-muted-foreground">
              Was: <span className="line-through">{write.oldValue}</span>
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {write.evidenceSummary}
            <span className="text-muted-foreground/50"> · </span>
            {capabilityLabel(write.capabilitySlug)}
            <span className="text-muted-foreground/50"> · </span>
            {formatTimeAgo(write.createdAt)}
          </p>
        </div>
        {corrected ? (
          <span className="inline-flex h-8 shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
            <Undo2 className="size-3.5" strokeWidth={1.75} />
            Rolled back
          </span>
        ) : (
          <button
            type="button"
            onClick={handleWrong}
            disabled={isPending}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-border/60 px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            That's wrong
          </button>
        )}
      </div>
    </li>
  );
}

export function HandledSection({
  writes,
  letIn,
  onUpdate,
}: HandledSectionProps) {
  if (writes.length === 0 && letIn.length === 0) {
    return (
      <PlaysTabEmptyState
        icon={CheckCircle2}
        title="Nothing handled yet"
        description="When Salt applies a change to your records, it shows up here — what changed, why, and a one-click way to correct it."
      />
    );
  }

  return (
    <div className="space-y-6">
      {writes.length > 0 && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Applied to your records
            </h3>
            <p className="text-[13px] text-muted-foreground">
              Changes Salt made on its own, with the evidence behind each one.
            </p>
          </div>
          <ul className="space-y-2">
            {writes.map((write) => (
              <HandledWriteRow
                key={write.learningId}
                write={write}
                onUpdate={onUpdate}
              />
            ))}
          </ul>
        </section>
      )}

      {letIn.length > 0 && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Let in</h3>
            <p className="text-[13px] text-muted-foreground">
              Captures Salt admitted into your world this week.
            </p>
          </div>
          <ul className="space-y-2">
            {letIn.map((item) => (
              <li
                key={item.captureId}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.title ?? "Untitled capture"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.fromLabel ?? item.sourceType.replace(/_/g, " ")}
                    <span className="text-muted-foreground/50"> · </span>
                    {formatTimeAgo(item.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
