"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Eye, Loader2 } from "lucide-react";
import { LearningCard } from "./LearningCard";
import { PlaysTabEmptyState } from "./PlaysTabEmptyState";
import type { GroupedLearningEvidence } from "../queries/learning-evidence";
import { acceptLearningEvidence, dismissLearningEvidence } from "../actions/learning-evidence";

interface LearningTabProps {
  evidence: GroupedLearningEvidence[];
  workspaceId: string;
  onUpdate?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;

export function LearningTab({
  evidence,
  workspaceId,
  onUpdate,
  emptyTitle = "Nothing to watch yet",
  emptyDescription = "Salt is observing your connected accounts. When it starts building confidence about people or organizations, they'll appear here.",
  pageSize = DEFAULT_PAGE_SIZE,
}: LearningTabProps) {
  const [isPending, startTransition] = useTransition();
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const totalCount = evidence.length;
  const hasMore = visibleCount < totalCount;
  const visibleEvidence = evidence.slice(0, visibleCount);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + pageSize, totalCount));
      setIsLoadingMore(false);
    }, 150);
  };

  const handleAccept = (fieldPath: string, proposedValue: string, evidenceIds: string[]) => {
    startTransition(async () => {
      await acceptLearningEvidence({
        workspaceId,
        fieldPath,
        proposedValue,
        evidenceIds,
      });
      onUpdate?.();
    });
  };

  const handleDismiss = (fieldPath: string, evidenceIds: string[]) => {
    startTransition(async () => {
      await dismissLearningEvidence({
        workspaceId,
        evidenceIds,
      });
      onUpdate?.();
    });
  };

  if (evidence.length === 0) {
    return (
      <PlaysTabEmptyState
        icon={Eye}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="relative space-y-3">
      {isPending && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

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
              onAccept={(fieldPath, proposedValue, evidenceIds) =>
                handleAccept(fieldPath, proposedValue, evidenceIds)
              }
              onDismiss={(fieldPath, evidenceIds) =>
                handleDismiss(fieldPath, evidenceIds)
              }
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
  );
}
