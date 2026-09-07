"use client";

import * as React from "react";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";
import {
  acknowledgeSyncEvents,
  approveClassification,
  proposeClassifications,
  rejectClassification,
} from "../actions";
import type { ReviewQueueData, ReviewQueueTool } from "../queries";

const RISK_OPTIONS = ["read", "mutating", "destructive"] as const;
type Risk = (typeof RISK_OPTIONS)[number];

const RISK_CHIP: Record<Risk, string> = {
  read: "bg-muted text-foreground",
  mutating: "bg-[color-mix(in_oklch,var(--warning)_18%,transparent)] text-foreground",
  destructive:
    "bg-[color-mix(in_oklch,var(--destructive)_16%,transparent)] text-foreground",
};

interface RowState {
  risk: Risk;
  requiresConfirmation: boolean;
  busy: boolean;
}

export function ClassificationReviewQueue({ data }: { data: ReviewQueueData }) {
  const router = useRouter();
  const [proposing, setProposing] = React.useState(false);
  const [rowState, setRowState] = React.useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      data.tools.map((tool) => [
        tool.toolSlug,
        {
          risk: tool.proposedRisk ?? "mutating",
          requiresConfirmation: tool.proposedConfirmation ?? true,
          busy: false,
        },
      ]),
    ),
  );

  const setRow = (slug: string, patch: Partial<RowState>) =>
    setRowState((state) => ({
      ...state,
      [slug]: { ...state[slug], ...patch },
    }));

  const handlePropose = async () => {
    setProposing(true);
    const result = await proposeClassifications();
    setProposing(false);
    if (result.success) {
      toast.success(
        result.data.proposed > 0
          ? `Salt proposed ${result.data.proposed} classifications`
          : "Nothing unclassified to propose",
      );
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleApprove = async (tool: ReviewQueueTool) => {
    const state = rowState[tool.toolSlug];
    setRow(tool.toolSlug, { busy: true });
    const result = await approveClassification({
      toolSlug: tool.toolSlug,
      risk: state.risk,
      requiresHumanConfirmation: state.requiresConfirmation,
    });
    setRow(tool.toolSlug, { busy: false });
    if (result.success) {
      toast.success(`Approved ${tool.toolSlug}`);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleReject = async (tool: ReviewQueueTool) => {
    setRow(tool.toolSlug, { busy: true });
    const result = await rejectClassification(tool.toolSlug);
    setRow(tool.toolSlug, { busy: false });
    if (result.success) {
      toast.success(`Rejected ${tool.toolSlug}`);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleAcknowledge = async () => {
    const result = await acknowledgeSyncEvents();
    if (result.success) {
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="space-y-6">
      {data.syncEvents.length > 0 && (
        <section className="rounded-2xl border border-border/70 bg-card p-4 ring-soft">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium text-foreground">
                Catalog drift ({data.syncEvents.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Changes detected by the sync job — disabled tools reappear
                below for re-review.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleAcknowledge}>
              Acknowledge all
            </Button>
          </div>
          <ul className="mt-3 space-y-1">
            {data.syncEvents.slice(0, 8).map((event) => (
              <li key={event.id} className="text-xs text-muted-foreground">
                <span className="font-mono">{event.kind}</span> ·{" "}
                {event.subjectSlug}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {data.tools.length} awaiting a verdict · {data.approvedCount} approved
        </p>
        <Button onClick={handlePropose} disabled={proposing} size="sm">
          {proposing ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 size-4" />
          )}
          Propose next batch
        </Button>
      </section>

      {data.tools.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card px-6 py-14 text-center text-sm text-muted-foreground ring-soft">
          Queue is clear — every synced tool has a verdict.
        </div>
      ) : (
        <ul className="space-y-3">
          {data.tools.map((tool) => {
            const state = rowState[tool.toolSlug];
            if (!state) return null;
            return (
              <li
                key={tool.toolSlug}
                className="rounded-2xl border border-border/70 bg-card p-4 ring-soft"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-foreground">
                        {tool.toolSlug}
                      </span>
                      <span className="chip px-1.5 py-0 text-[10px]">
                        {tool.toolkitSlug}
                      </span>
                      <span className="chip px-1.5 py-0 text-[10px]">
                        {tool.status}
                      </span>
                    </div>
                    {tool.description && (
                      <p className="mt-1 max-w-xl text-xs text-muted-foreground">
                        {tool.description.slice(0, 220)}
                      </p>
                    )}
                    {tool.proposalReasoning && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium">Salt&apos;s reasoning:</span>{" "}
                        {tool.proposalReasoning}
                      </p>
                    )}
                    {tool.disabledReason && (
                      <p className="mt-1 text-xs text-destructive">
                        Disabled: {tool.disabledReason}
                      </p>
                    )}
                    {tool.affectedPlaybooks.length > 0 && (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        <span className="font-medium">Blocks:</span>{" "}
                        {tool.affectedPlaybooks
                          .map((playbook) => playbook.name)
                          .join(", ")}{" "}
                        {tool.affectedPlaybooks.length === 1
                          ? "playbook"
                          : "playbooks"}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <div className="flex rounded-full border border-border/70 p-0.5">
                      {RISK_OPTIONS.map((risk) => (
                        <button
                          key={risk}
                          type="button"
                          onClick={() => setRow(tool.toolSlug, { risk })}
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs transition",
                            state.risk === risk
                              ? RISK_CHIP[risk]
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {risk}
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={state.requiresConfirmation}
                        onChange={(event) =>
                          setRow(tool.toolSlug, {
                            requiresConfirmation: event.target.checked,
                          })
                        }
                        className="size-3.5"
                      />
                      Confirm each run
                    </label>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(tool)}
                      disabled={state.busy}
                    >
                      {state.busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReject(tool)}
                      disabled={state.busy}
                      aria-label={`Reject ${tool.toolSlug}`}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
