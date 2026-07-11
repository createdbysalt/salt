"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@repo/utils";
import {
  buildDeckCompletionEntries,
  deckHasOnlyMemoryResults,
  deckReviewItems,
  findNextIncompleteDeckIndex,
  type RecordDeckItem,
} from "../../record-deck-utils";
import type { UserAttachmentRef } from "../../file-draft-utils";
import { BillingDraftCard } from "./BillingDraftCard";
import { FileDraftCard } from "./FileDraftCard";
import { PlaybookDraftCard } from "./PlaybookDraftCard";
import { RecordDeckCompletionMessage } from "./RecordDeckCompletionMessage";

const SLIDE_EASE = [0.32, 0.72, 0, 1] as const;

type AskSaltRecordDeckProps = {
  items: RecordDeckItem[];
  attachments: UserAttachmentRef[];
};

function deckItemLabel(item: RecordDeckItem): string {
  switch (item.kind) {
    case "billing-draft":
      return item.draft.number;
    case "file-draft":
      return item.draft.fileName;
    case "memory-result":
      return item.result.title;
    case "playbook-draft":
      return item.draft.name;
    default:
      return "Record";
  }
}

export function AskSaltRecordDeck({ items, attachments }: AskSaltRecordDeckProps) {
  const reviewItems = useMemo(() => deckReviewItems(items), [items]);
  const memoryOnly = deckHasOnlyMemoryResults(items);

  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set());
  const [savedHrefs, setSavedHrefs] = useState<Map<string, string>>(() => new Map());
  const [activeIndex, setActiveIndex] = useState(0);

  const activeItem = reviewItems[activeIndex] ?? null;
  const completedReviewCount = reviewItems.filter((item) => completedIds.has(item.id)).length;
  const allReviewComplete =
    reviewItems.length === 0 || completedReviewCount === reviewItems.length;
  const showProgress = reviewItems.length > 1;

  const markComplete = useCallback(
    (id: string, href?: string) => {
      if (href) {
        setSavedHrefs((previous) => new Map(previous).set(id, href));
      }
      setCompletedIds((previous) => new Set(previous).add(id));
      setActiveIndex((current) => {
        const itemIndex = reviewItems.findIndex((item) => item.id === id);
        const baseIndex = itemIndex >= 0 ? itemIndex : current;
        return findNextIncompleteDeckIndex(reviewItems, new Set([...completedIds, id]), baseIndex);
      });
    },
    [completedIds, reviewItems],
  );

  const goToIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= reviewItems.length) return;
      setActiveIndex(index);
    },
    [reviewItems.length],
  );

  const completionEntries = useMemo(
    () => buildDeckCompletionEntries(items, savedHrefs),
    [items, savedHrefs],
  );

  if (items.length === 0) return null;

  if (memoryOnly || allReviewComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: SLIDE_EASE }}
        data-testid="ask-salt-record-deck-complete"
      >
        <RecordDeckCompletionMessage entries={completionEntries} />
      </motion.div>
    );
  }

  return (
    <div className="space-y-2" data-testid="ask-salt-record-deck">
      {showProgress ? (
        <div
          className="flex items-center justify-between gap-2 px-0.5"
          data-testid="record-deck-progress"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Reviewing {Math.min(activeIndex + 1, reviewItems.length)} of {reviewItems.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous record"
              disabled={activeIndex === 0}
              onClick={() => goToIndex(activeIndex - 1)}
              className="inline-flex size-7 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="size-4" strokeWidth={2.25} />
            </button>
            <button
              type="button"
              aria-label="Next record"
              disabled={activeIndex >= reviewItems.length - 1}
              onClick={() => goToIndex(activeIndex + 1)}
              className="inline-flex size-7 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="size-4" strokeWidth={2.25} />
            </button>
          </div>
        </div>
      ) : null}

      {showProgress ? (
        <div className="flex flex-wrap gap-1.5 px-0.5">
          {reviewItems.map((item, index) => {
            const isComplete = completedIds.has(item.id);
            const isActive = index === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={`Review ${deckItemLabel(item)}`}
                onClick={() => goToIndex(index)}
                className={cn(
                  "inline-flex size-2.5 rounded-full transition",
                  isComplete && "bg-emerald-500",
                  !isComplete && isActive && "bg-foreground",
                  !isComplete && !isActive && "bg-border",
                )}
              />
            );
          })}
        </div>
      ) : null}

      <div className="relative overflow-hidden">
        {activeItem ? (
          <motion.div
            key={activeItem.id}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.28, ease: SLIDE_EASE }}
          >
            {activeItem.kind === "billing-draft" ? (
              <BillingDraftCard
                draft={activeItem.draft}
                navigateOnSave={false}
                onComplete={(href) => markComplete(activeItem.id, href)}
              />
            ) : null}
            {activeItem.kind === "file-draft" ? (
              <FileDraftCard
                draft={activeItem.draft}
                attachments={attachments}
                navigateOnSave={false}
                onComplete={(href) => markComplete(activeItem.id, href)}
              />
            ) : null}
            {activeItem.kind === "playbook-draft" ? (
              <PlaybookDraftCard
                draft={activeItem.draft}
                navigateOnSave={false}
                onComplete={(href) => markComplete(activeItem.id, href)}
              />
            ) : null}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
