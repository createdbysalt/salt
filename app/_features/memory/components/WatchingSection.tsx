"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronDown, Eye, Loader2 } from "lucide-react";
import { LearningCard } from "./LearningCard";
import { PlaysTabEmptyState } from "@/app/_features/plays/components/PlaysTabEmptyState";
import type {
  GroupedLearningEvidence,
  LearningField,
} from "../queries/learning-evidence";
import type { AdmissionItem } from "../queries/admission-decisions";
import {
  confirmWatchingEvidence,
  dismissWatchingEvidence,
} from "../actions/learning-evidence";
import {
  keepCaptureOut,
  letCaptureIn,
} from "../actions/admission-decisions";

/**
 * Memory → Filter → Watching.
 *
 * Everything Salt is still gathering confidence on: pending evidence grouped
 * per record (with progress toward the bar) plus capture candidates. Nudges
 * ("That's right" / "Not this") teach the bar — nothing here is an approval
 * queue.
 */

interface WatchingSectionProps {
  evidence: GroupedLearningEvidence[];
  candidates: AdmissionItem[];
  workspaceId: string;
  onUpdate?: () => void;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;

function formatSourceLabel(sourceType: string): string {
  return sourceType.replace(/_/g, " ");
}

export function WatchingSection({
  evidence,
  candidates,
  workspaceId,
  onUpdate,
  pageSize = DEFAULT_PAGE_SIZE,
}: WatchingSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const totalCount = evidence.length;
  const hasMore = visibleCount < totalCount;
  const visibleEvidence = evidence.slice(0, visibleCount);
  const watchingTotal = evidence.length + candidates.length;

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + pageSize, totalCount));
      setIsLoadingMore(false);
    }, 150);
  };

  const confirmField = (
    item: GroupedLearningEvidence,
    field: LearningField,
    proposedValue: string,
  ) =>
    confirmWatchingEvidence({
      workspaceId,
      entityType: item.entityType,
      entityId: item.entityId,
      fieldPath: field.fieldPath,
      proposedValue,
      evidenceIds: field.evidenceIds,
    });

  const handleConfirmField = (
    item: GroupedLearningEvidence,
    field: LearningField,
    proposedValue: string,
  ) => {
    startTransition(async () => {
      await confirmField(item, field, proposedValue);
      onUpdate?.();
    });
  };

  const handleDismissField = (
    item: GroupedLearningEvidence,
    field: LearningField,
  ) => {
    startTransition(async () => {
      await dismissWatchingEvidence({
        workspaceId,
        evidenceIds: field.evidenceIds,
        entityType: item.entityType,
        entityId: item.entityId,
        fieldPath: field.fieldPath,
        proposedValue: field.proposedValue,
      });
      onUpdate?.();
    });
  };

  const handleConfirmAll = (item: GroupedLearningEvidence) => {
    startTransition(async () => {
      for (const field of item.fields) {
        await confirmField(item, field, field.proposedValue);
      }
      onUpdate?.();
    });
  };

  const handleDismissAll = (item: GroupedLearningEvidence) => {
    startTransition(async () => {
      for (const field of item.fields) {
        await dismissWatchingEvidence({
          workspaceId,
          evidenceIds: field.evidenceIds,
          entityType: item.entityType,
          entityId: item.entityId,
          fieldPath: field.fieldPath,
          proposedValue: field.proposedValue,
        });
      }
      onUpdate?.();
    });
  };

  const handleLetIn = (captureId: string) => {
    startTransition(async () => {
      await letCaptureIn(captureId, workspaceId);
      onUpdate?.();
    });
  };

  const handleKeepOut = (captureId: string) => {
    startTransition(async () => {
      await keepCaptureOut(captureId, workspaceId);
      onUpdate?.();
    });
  };

  if (evidence.length === 0 && candidates.length === 0) {
    return (
      <PlaysTabEmptyState
        icon={Eye}
        title="Salt is watching — nothing parked yet"
        description="As evidence builds from your connected accounts, things Salt is still gathering confidence on show up here with progress toward the bar. They resolve on their own."
      />
    );
  }

  return (
    <div className="relative space-y-6">
      {isPending && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <p className="text-[13px] text-muted-foreground">
        Salt is watching {watchingTotal}{" "}
        {watchingTotal === 1 ? "thing" : "things"} — they resolve on their own
        as evidence builds. Nudges teach the bar; nothing here is a chore.
      </p>

      {evidence.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {visibleEvidence.map((item) => (
              <motion.div
                key={`${item.entityType}:${item.entityId}`}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <LearningCard
                  evidence={item}
                  onAcceptAll={() => handleConfirmAll(item)}
                  onDismissAll={() => handleDismissAll(item)}
                  onAcceptField={(field, proposedValue) =>
                    handleConfirmField(item, field, proposedValue)
                  }
                  onDismissField={(field) => handleDismissField(item, field)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-muted/60 px-4 text-[13px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-60"
              >
                {isLoadingMore ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
                Load more ({totalCount - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {candidates.length > 0 && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              New captures
            </h3>
            <p className="text-[13px] text-muted-foreground">
              Salt scored these as worth watching. Let one in to start
              learning, or keep it out — both teach the bar.
            </p>
          </div>
          <ul className="space-y-2">
            {candidates.map((item) => (
              <li
                key={item.captureId}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.title ?? "Untitled capture"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.fromLabel ?? formatSourceLabel(item.sourceType)}
                    {item.confidence != null
                      ? ` · ${Math.round(item.confidence)}% confident`
                      : ""}
                    {item.reason ? ` — ${item.reason}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleKeepOut(item.captureId)}
                    disabled={isPending}
                    className="inline-flex h-8 items-center rounded-lg border border-border/60 px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-60"
                  >
                    Keep it out
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLetIn(item.captureId)}
                    disabled={isPending}
                    className="inline-flex h-8 items-center gap-1 rounded-lg bg-foreground px-3 text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-60"
                  >
                    Let it in
                    <ArrowRight className="size-3.5" strokeWidth={2} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
