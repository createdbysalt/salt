"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Eye,
  Loader2,
  UserPlus,
} from "lucide-react";
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
import type { RecordCandidate } from "../queries/record-candidates";
import {
  confirmWatchingEvidence,
  dismissWatchingEvidence,
} from "../actions/learning-evidence";
import {
  addRecordCandidate,
  dismissRecordCandidate,
} from "../actions/record-candidates";

/**
 * Memory → Activity → Watching.
 *
 * Everything Salt is still gathering confidence on: pending evidence grouped
 * per record (with progress toward the bar) plus new-record proposals.
 * Nudges ("That's right" / "Not this") teach the bar — nothing here is an
 * approval queue.
 */

interface WatchingSectionProps {
  evidence: GroupedLearningEvidence[];
  recordCandidates?: RecordCandidate[];
  workspaceId: string;
  onUpdate?: () => void;
  /** Changes when toolbar filters/search change — resets pagination. */
  resetKey?: string;
}

/** "Add Sarah Chen as a contact" — the record noun per entity type. */
const RECORD_NOUNS: Record<RecordCandidate["entityType"], string> = {
  person: "contact",
  organization: "organization",
  work: "project",
  billing: "billing record",
  meeting: "meeting",
  file: "file",
};

export function WatchingSection({
  evidence,
  recordCandidates = [],
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

  const watchingTotal = evidence.length + recordCandidates.length;

  if (watchingTotal === 0) {
    return (
      <PlaysTabEmptyState
        icon={Eye}
        title="Salt is watching — nothing parked yet"
        description="As evidence builds from your connected accounts, things Salt is still gathering confidence on show up here with progress toward the bar. They resolve on their own."
      />
    );
  }

  // One page number slices both lanes — a lane with no rows on the current
  // page hides itself rather than rendering an empty card.
  const pagedEvidence = paginateItems(evidence, page, pageSize);
  const pagedRecords = paginateItems(recordCandidates, page, pageSize);
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

  const handleAddRecord = (evidenceId: string) => {
    startTransition(async () => {
      await addRecordCandidate(evidenceId, workspaceId);
      onUpdate?.();
    });
  };

  const handleDismissRecord = (evidenceId: string) => {
    startTransition(async () => {
      await dismissRecordCandidate(evidenceId, workspaceId);
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

      {pagedRecords.pageItems.length > 0 && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              New records
            </h3>
            <p className="text-[13px] text-muted-foreground">
              Salt thinks these belong in Memory. Add one now, or let the
              evidence keep building — it creates itself past the bar.
            </p>
          </div>
          <ul className="glass-card divide-y divide-border/40 overflow-hidden rounded-3xl">
            {pagedRecords.pageItems.map((item) => (
              <li key={item.evidenceId} className="group">
                <div className="grid grid-cols-[36px_1fr_auto] items-center gap-3 px-4 py-3.5 transition hover:bg-muted/40">
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                    <UserPlus className="size-3.5" strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium leading-tight text-foreground">
                      Add {item.displayName} as a{" "}
                      {RECORD_NOUNS[item.entityType]}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {item.identifier !== item.displayName
                        ? `${item.identifier} · `
                        : ""}
                      {item.confidencePercent}% confident · {item.signalCount}{" "}
                      {item.signalCount === 1 ? "signal" : "signals"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDismissRecord(item.evidenceId)}
                      disabled={isPending}
                      className="inline-flex h-8 items-center rounded-lg border border-border/60 px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-60"
                    >
                      Not this
                    </button>
                    {item.canCreate && (
                      <button
                        type="button"
                        onClick={() => handleAddRecord(item.evidenceId)}
                        disabled={isPending}
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-foreground px-3 text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-60"
                      >
                        Add to Memory
                        <ArrowRight className="size-3.5" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ActivityPagination
        page={pagedEvidence.page}
        pageSize={pageSize}
        totalCount={watchingTotal}
        itemLabel={watchingTotal === 1 ? "thing" : "things"}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
