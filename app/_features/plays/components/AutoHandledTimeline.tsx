"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { FindingWithContext } from "@/app/_features/capture/types/intelligence-findings";
import { undoHandledFinding } from "@/app/_features/capture/actions/intelligence-findings";
import { markAutoHandledSeen, submitPlayFeedback, type PlayFeedback } from "../actions";
import { mapHandledFindingToCard } from "../play-card/map-handled-finding-to-card";
import { validatePlayCard } from "../play-card/validate-play-card";
import type { PlayCardViewModel } from "../play-card/types";
import { PlayCard } from "./PlayCard/PlayCard";
import { PlaysTabEmptyState } from "./PlaysTabEmptyState";

interface AutoHandledTimelineProps {
  findings: FindingWithContext[];
  cards?: PlayCardViewModel[];
  emptyMessage?: string;
  emptyDescription?: string;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 50;

export function AutoHandledTimeline({
  findings,
  cards,
  emptyMessage = "Nothing auto-handled recently",
  emptyDescription = "Confident Memory updates will appear here for quick review. Activity keeps the full all-time ledger.",
  pageSize = DEFAULT_PAGE_SIZE,
}: AutoHandledTimelineProps) {
  const [removed, setRemoved] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<Record<string, PlayFeedback | null>>({});
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const markedSeenRef = useRef(false);

  // Mark items as seen after user has had time to view them (Phase 3 watermark)
  useEffect(() => {
    if (findings.length === 0 || markedSeenRef.current) return;

    const timer = setTimeout(() => {
      markedSeenRef.current = true;
      void markAutoHandledSeen();
    }, 2000); // 2 second delay so user can see items before they're marked

    return () => clearTimeout(timer);
  }, [findings.length]);

  const allCards = useMemo(() => {
    const sourceCards = cards ?? findings.map(mapHandledFindingToCard);
    return sourceCards
      .filter((vm) => validatePlayCard(vm).ok && !removed[vm.id]);
  }, [cards, findings, removed]);

  const totalCount = allCards.length;
  const hasMore = visibleCount < totalCount;

  const visibleCards = useMemo(
    () => allCards.slice(0, visibleCount),
    [allCards, visibleCount],
  );

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + pageSize, totalCount));
      setIsLoadingMore(false);
    }, 150);
  };

  const handleUndo = (vm: PlayCardViewModel) => {
    if (vm.provenance.source !== "finding") return;
    const { findingId } = vm.provenance;
    setPending((current) => ({ ...current, [vm.id]: true }));
    void (async () => {
      const result = await undoHandledFinding(findingId);
      setPending((current) => ({ ...current, [vm.id]: false }));
      if (result.success) {
        setRemoved((current) => ({ ...current, [vm.id]: true }));
        toast("Undone");
      } else {
        toast.error(result.error ?? "Couldn't undo");
      }
    })();
  };

  const handleCorrect = (vm: PlayCardViewModel) => {
    window.dispatchEvent(
      new CustomEvent("salt:open-ask-salt", {
        detail: {
          prompt: `Correct this handled update — ${vm.handled?.outcomeLabel ?? vm.subject}`,
          mode: "ask" as const,
          context: vm.askSalt,
          autoSubmit: false,
        },
      }),
    );
  };

  const handleFeedback = (vm: PlayCardViewModel, type: PlayFeedback) => {
    const playRunId = vm.provenance.source === "play_run"
      ? vm.provenance.playRunId
      : vm.provenance.source === "finding"
        ? vm.provenance.findingId
        : null;
    if (!playRunId) return;

    setFeedback((current) => ({ ...current, [vm.id]: type }));
    void (async () => {
      const result = await submitPlayFeedback(playRunId, type);
      if (!result.success) {
        setFeedback((current) => ({ ...current, [vm.id]: null }));
        toast.error(result.error ?? "Couldn't submit feedback");
      }
    })();
  };

  if (visibleCards.length === 0) {
    return (
      <PlaysTabEmptyState
        icon={CheckCircle2}
        title={emptyMessage}
        description={emptyDescription}
      />
    );
  }

  return (
    <section className="space-y-6" aria-label="Auto-handled plays">
      <div className="space-y-2.5">
        {visibleCards.map((vm) => (
          <PlayCard
            key={vm.id}
            vm={vm}
            draft={[]}
            isEditing={false}
            isPending={Boolean(pending[vm.id])}
            flagged={false}
            onStartEdit={() => {}}
            onStopEdit={() => {}}
            onDraftChange={() => {}}
            onPrimary={() => {}}
            onDismiss={() => {}}
            onFlag={() => {}}
            onSchedule={() => {}}
            onEditWithSalt={() => handleCorrect(vm)}
            onAnswer={() => {}}
            onUndo={() => handleUndo(vm)}
            onFeedback={(type) => handleFeedback(vm, type)}
            feedbackGiven={feedback[vm.id]}
          />
        ))}
      </div>

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
    </section>
  );
}
