"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence } from "framer-motion";
import { Eye, Loader2 } from "lucide-react";
import { LearningRow } from "./LearningRow";
import { PlaysTabEmptyState } from "@/app/_features/plays/components/PlaysTabEmptyState";
import { ActivityPagination } from "./ActivityPagination";
import {
  DEFAULT_MEMORY_ACTIVITY_PAGE_SIZE,
  paginateItems,
  type MemoryActivityPageSize,
} from "../utils/activity-pagination";
import type {
  GroupedLearningEvidence,
  LearningField,
} from "../queries/learning-evidence";
import {
  confirmWatchingEvidence,
  dismissWatchingEvidence,
} from "../actions/learning-evidence";

/**
 * Memory → Activity → Watching.
 *
 * Everything Salt is still gathering confidence on, grouped per record.
 * Nudges ("That's right" / "Not this") teach the bar. Record candidates
 * never wait for approval here — crossing the evidence bar creates the
 * record automatically, and correction happens on the Handled lane.
 */

interface WatchingSectionProps {
  evidence: GroupedLearningEvidence[];
  workspaceId: string;
  onUpdate?: () => void;
  /** Changes when toolbar filters/search change — resets pagination. */
  resetKey?: string;
}

export function WatchingSection({
  evidence,
  workspaceId,
  onUpdate,
  resetKey,
}: WatchingSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<MemoryActivityPageSize>(
    DEFAULT_MEMORY_ACTIVITY_PAGE_SIZE,
  );

  // Any filter/search change restarts at the first page (Sources pattern).
  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize]);

  const watchingTotal = evidence.length;

  if (watchingTotal === 0) {
    return (
      <PlaysTabEmptyState
        icon={Eye}
        title="Salt is watching — nothing parked yet"
        description="As evidence builds from your connected accounts, things Salt is still gathering confidence on show up here with progress toward the bar. They resolve on their own."
      />
    );
  }

  const pagedEvidence = paginateItems(evidence, page, pageSize);
  const visibleEvidence = pagedEvidence.pageItems;

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

  return (
    <div className="relative space-y-6">
      {isPending && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {visibleEvidence.length > 0 && (
        <div className="space-y-3">
          <ul className="glass-card divide-y divide-border/40 overflow-hidden rounded-3xl">
            <AnimatePresence mode="popLayout">
              {visibleEvidence.map((item) => (
                <LearningRow
                  key={`${item.entityType}:${item.entityId}`}
                  evidence={item}
                  onAcceptAll={() => handleConfirmAll(item)}
                  onDismissAll={() => handleDismissAll(item)}
                  onAcceptField={(field, proposedValue) =>
                    handleConfirmField(item, field, proposedValue)
                  }
                  onDismissField={(field) => handleDismissField(item, field)}
                />
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}

      {watchingTotal > 0 && (
        <ActivityPagination
          page={pagedEvidence.page}
          pageSize={pageSize}
          totalCount={watchingTotal}
          itemLabel={watchingTotal === 1 ? "thing" : "things"}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}
