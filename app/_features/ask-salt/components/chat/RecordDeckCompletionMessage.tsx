"use client";

import { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@repo/utils";
import { toast } from "sonner";
import { undoMemoryRecord } from "@/app/_features/ask-salt/actions";
import {
  buildDeckCompletionIntro,
  type RecordDeckCompletionEntry,
} from "../../record-deck-utils";
import { MemoryRecordCompletionCard } from "./MemoryRecordCompletionCard";
import { MessageContent } from "./message";

const SLIDE_EASE = [0.32, 0.72, 0, 1] as const;

type RecordDeckCompletionMessageProps = {
  entries: RecordDeckCompletionEntry[];
};

export function RecordDeckCompletionMessage({ entries }: RecordDeckCompletionMessageProps) {
  const [undoneIds, setUndoneIds] = useState<Set<string>>(() => new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
  const [isPending, startTransition] = useTransition();

  const intro = buildDeckCompletionIntro(entries);
  const visibleEntries = entries.filter((entry) => !undoneIds.has(entry.id));
  const showSlider = visibleEntries.length > 1;
  const activeEntry = visibleEntries[activeIndex] ?? null;

  useEffect(() => {
    setActiveIndex((current) =>
      Math.min(current, Math.max(0, visibleEntries.length - 1)),
    );
  }, [visibleEntries.length]);

  const goToIndex = (index: number) => {
    if (index < 0 || index >= visibleEntries.length) return;
    setSlideDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
  };

  const handleUndo = (entry: RecordDeckCompletionEntry) => {
    if (!entry.undo || isPending) return;

    startTransition(async () => {
      const result = await undoMemoryRecord({
        entityId: entry.undo!.entityId,
        resultKind: entry.undo!.resultKind,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setUndoneIds((previous) => new Set(previous).add(entry.id));
      toast.success(`Removed from ${entry.memoryLabel}`);
    });
  };

  if (visibleEntries.length === 0) {
    return (
      <MessageContent
        className="rounded-2xl rounded-bl-md border border-border/55 bg-muted/45 px-3.5 py-2.5 text-[13px] leading-relaxed"
        data-testid="record-deck-completion-message"
      >
        <p className="text-muted-foreground">Record removed.</p>
      </MessageContent>
    );
  }

  return (
    <MessageContent
      className="rounded-2xl rounded-bl-md border border-border/55 bg-muted/45 px-3.5 py-3 text-[13px] leading-relaxed"
      data-testid="record-deck-completion-message"
    >
      <div className="space-y-3.5">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/12">
            <CheckCircle2 className="size-3.5 text-emerald-600" strokeWidth={2.5} />
          </span>
          <p className="min-w-0 flex-1 font-medium text-foreground">{intro}</p>
        </div>

        <div data-testid="memory-record-completion-carousel">
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              {activeEntry ? (
                <motion.div
                  key={activeEntry.id}
                  initial={{ opacity: 0, x: slideDirection * 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: slideDirection * -20 }}
                  transition={{ duration: 0.24, ease: SLIDE_EASE }}
                >
                  <MemoryRecordCompletionCard
                    entry={activeEntry}
                    onUndo={() => handleUndo(activeEntry)}
                    undoPending={isPending}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {showSlider ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                aria-label="Previous record"
                disabled={activeIndex === 0}
                onClick={() => goToIndex(activeIndex - 1)}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground shadow-sm transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronLeft className="size-4" strokeWidth={2.25} />
              </button>

              <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                <div className="flex items-center gap-1.5">
                  {visibleEntries.map((entry, index) => (
                    <button
                      key={entry.id}
                      type="button"
                      aria-label={`View ${entry.linkLabel}`}
                      onClick={() => goToIndex(index)}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        index === activeIndex
                          ? "w-5 bg-foreground"
                          : "w-1.5 bg-border hover:bg-foreground/35",
                      )}
                    />
                  ))}
                </div>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {activeIndex + 1}/{visibleEntries.length}
                </span>
              </div>

              <button
                type="button"
                aria-label="Next record"
                disabled={activeIndex >= visibleEntries.length - 1}
                onClick={() => goToIndex(activeIndex + 1)}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground shadow-sm transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronRight className="size-4" strokeWidth={2.25} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </MessageContent>
  );
}
