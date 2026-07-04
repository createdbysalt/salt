"use client";

import { useTransition } from "react";
import {
  Building2,
  Check,
  CircleDollarSign,
  Pencil,
  Sparkles,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";
import type { ICPSegment } from "../types";
import {
  confirmICPSegment,
  dismissICPSegment,
  deleteICPSegment,
} from "../actions/icp-segments";

type ICPSegmentCardProps = {
  segment: ICPSegment;
  canEdit: boolean;
  onEdit: () => void;
  onUpdate: (segment: ICPSegment | null) => void;
};

const COMPANY_SIZE_LABELS: Record<
  NonNullable<ICPSegment["targetCompanySize"]>,
  string
> = {
  solo: "Solo",
  "2-10": "2–10 people",
  "11-50": "11–50 people",
  "51-200": "51–200 people",
  "200+": "200+ people",
};

function SegmentMetaPill({
  icon: Icon,
  label,
}: {
  icon: typeof Building2;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground">
      <Icon className="size-3 shrink-0 opacity-70" />
      {label}
    </span>
  );
}

export function ICPSegmentCard({
  segment,
  canEdit,
  onEdit,
  onUpdate,
}: ICPSegmentCardProps) {
  const [pending, startTransition] = useTransition();
  const isProposed = segment.status === "proposed";

  const handleConfirm = () => {
    startTransition(async () => {
      const res = await confirmICPSegment(segment.id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      onUpdate({ ...segment, status: "active" });
      toast.success("ICP segment confirmed");
    });
  };

  const handleDismiss = () => {
    startTransition(async () => {
      const res = await dismissICPSegment(segment.id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      onUpdate(null);
      toast("ICP segment dismissed");
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteICPSegment(segment.id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      onUpdate(null);
      toast("ICP segment removed");
    });
  };

  const hasDetails =
    segment.painPoints.length > 0 || segment.desiredOutcomes.length > 0;
  const hasMeta =
    segment.budgetSignal ||
    segment.targetIndustry ||
    segment.targetCompanySize;

  return (
    <div
      className={cn(
        "group overflow-hidden rounded-2xl border shadow-sm transition-colors",
        isProposed
          ? "border-flame/30 bg-gradient-to-br from-card via-card to-flame/[0.06]"
          : "border-border/60 bg-gradient-to-br from-card via-card to-muted/20",
      )}
    >
      <div
        className={cn(
          "border-b border-border/40 px-4 py-3 sm:px-5",
          isProposed ? "bg-flame/[0.04]" : "bg-muted/20",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-xl",
                isProposed
                  ? "bg-flame/10 text-flame"
                  : "bg-primary/10 text-primary",
              )}
            >
              <Target className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-medium text-foreground">
                  {segment.name}
                </h3>
                {isProposed && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-flame/25 bg-flame/10 px-2 py-0.5 text-[10px] font-medium text-flame">
                    <Sparkles className="size-2.5" />
                    Salt proposed
                  </span>
                )}
              </div>
              {segment.description && (
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {segment.description}
                </p>
              )}
            </div>
          </div>

          {canEdit && !isProposed && (
            <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition">
              <button
                type="button"
                onClick={onEdit}
                disabled={pending}
                className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground disabled:opacity-50"
                aria-label="Edit segment"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                aria-label="Delete segment"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          )}
        </div>

        {hasMeta && (
          <div className="mt-3 flex flex-wrap gap-1.5 pl-12">
            {segment.budgetSignal && (
              <SegmentMetaPill
                icon={CircleDollarSign}
                label={segment.budgetSignal}
              />
            )}
            {segment.targetIndustry && (
              <SegmentMetaPill icon={Building2} label={segment.targetIndustry} />
            )}
            {segment.targetCompanySize && (
              <SegmentMetaPill
                icon={Users}
                label={COMPANY_SIZE_LABELS[segment.targetCompanySize]}
              />
            )}
          </div>
        )}
      </div>

      {hasDetails && (
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          {segment.painPoints.length > 0 && (
            <div className="rounded-xl border border-rose-500/15 bg-rose-500/[0.04] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-700/80 dark:text-rose-400/90">
                Pain points
              </p>
              <ul className="mt-2 space-y-1.5">
                {segment.painPoints.map((point, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[13px] leading-snug text-foreground/90"
                  >
                    <span
                      aria-hidden
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-500/60"
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {segment.desiredOutcomes.length > 0 && (
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700/80 dark:text-emerald-400/90">
                Desired outcomes
              </p>
              <ul className="mt-2 space-y-1.5">
                {segment.desiredOutcomes.map((outcome, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[13px] leading-snug text-foreground/90"
                  >
                    <span
                      aria-hidden
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500/60"
                    />
                    {outcome}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {isProposed && canEdit && (
        <div className="flex items-center gap-2 border-t border-border/40 px-4 py-3 sm:px-5">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            onClick={handleDismiss}
            disabled={pending}
          >
            <X className="size-3" />
            Dismiss
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleConfirm}
            disabled={pending}
          >
            <Check className="size-3" />
            Confirm segment
          </Button>
        </div>
      )}
    </div>
  );
}
