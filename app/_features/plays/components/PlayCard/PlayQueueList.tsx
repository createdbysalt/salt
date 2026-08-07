"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useReducedMotion } from "@/app/_lib/hooks";
import { toast } from "sonner";
import {
  ApproveCelebration,
  useApproveCelebration,
} from "@/app/_features/plays/components/ApproveCelebration";
import {
  approvePlayRun,
  dismissPlayRun,
  applyMemoryCarePlayRun,
  answerMemoryCareQuestionPlayRun,
} from "@/app/_features/plays/actions";
import {
  actOnFinding,
  answerRelationshipQuestion,
  applyMemoryCareProfileFinding,
  applyMemoryPlan,
  dismissFinding,
  toggleFlagFinding,
} from "@/app/_features/capture/actions/intelligence-findings";
import type { PlayCardViewModel } from "../../play-card/types";
import { validatePlayCard } from "../../play-card/validate-play-card";
import { PlayCard } from "./PlayCard";
import { PlaysTabEmptyState } from "../PlaysTabEmptyState";
import { BatchActionBar } from "./BatchActionBar";
import {
  trackPlayActioned,
  trackBatchActioned,
  trackQueueEmptyState,
} from "../../analytics/play-events";

type Status = "idle" | "approved" | "dismissed" | "scheduled" | "acted";

interface PlayQueueListProps {
  cards: PlayCardViewModel[];
  onEditWithSalt?: (vm: PlayCardViewModel) => void;
  emptyMessage?: string;
  emptyDescription?: string;
}

export function PlayQueueList({
  cards,
  onEditWithSalt,
  emptyMessage = "Queue clear.",
  emptyDescription = "Salt's drafting the next batch.",
}: PlayQueueListProps) {
  const validCards = useMemo(
    () => cards.filter((vm) => validatePlayCard(vm).ok),
    [cards],
  );

  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      cards.map((vm) => [
        vm.id,
        vm.provenance.source === "finding" ? vm.provenance.flagged : false,
      ]),
    ),
  );
  const { burst, fireCelebration } = useApproveCelebration();
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const prefersReducedMotion = useReducedMotion();

  // Batch selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchPending, setBatchPending] = useState(false);
  const [batchAction, setBatchAction] = useState<"approve" | "dismiss" | null>(null);

  const visible = useMemo(
    () => validCards.filter((vm) => (statuses[vm.id] ?? "idle") === "idle"),
    [validCards, statuses],
  );

  // Focus management: when a card is removed, move focus to next (or previous)
  const prevVisibleRef = useRef<string[]>([]);
  useEffect(() => {
    const prevIds = prevVisibleRef.current;
    const currentIds = visible.map((vm) => vm.id);

    if (focusedIndex >= 0 && prevIds.length > currentIds.length) {
      const removedId = prevIds.find((id) => !currentIds.includes(id));
      if (removedId) {
        const removedIndex = prevIds.indexOf(removedId);
        const newIndex = Math.min(removedIndex, currentIds.length - 1);
        if (newIndex >= 0 && currentIds[newIndex]) {
          const nextCard = cardRefs.current.get(currentIds[newIndex]);
          nextCard?.focus();
          setFocusedIndex(newIndex);
        }
      }
    }

    prevVisibleRef.current = currentIds;
  }, [visible, focusedIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (visible.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
        case "j": {
          e.preventDefault();
          const nextIndex = focusedIndex < visible.length - 1 ? focusedIndex + 1 : 0;
          const nextCard = cardRefs.current.get(visible[nextIndex].id);
          nextCard?.focus();
          setFocusedIndex(nextIndex);
          break;
        }
        case "ArrowUp":
        case "k": {
          e.preventDefault();
          const prevIndex = focusedIndex > 0 ? focusedIndex - 1 : visible.length - 1;
          const prevCard = cardRefs.current.get(visible[prevIndex].id);
          prevCard?.focus();
          setFocusedIndex(prevIndex);
          break;
        }
      }
    },
    [visible, focusedIndex],
  );

  const registerCardRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      cardRefs.current.set(id, el);
    } else {
      cardRefs.current.delete(id);
    }
  }, []);

  // Batch selection helpers
  const isBatchEligible = useCallback((vm: PlayCardViewModel) => {
    // email_draft is never batch-eligible — each email needs individual review
    if (vm.outputType === "email_draft" || vm.kind === "acting") return false;
    // Only memory_update with per_entity or batch approval
    return vm.approvalMode === "per_entity" || vm.approvalMode === "batch";
  }, []);

  const batchEligibleIds = useMemo(
    () => new Set(visible.filter(isBatchEligible).map((vm) => vm.id)),
    [visible, isBatchEligible],
  );

  const toggleSelection = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleBatchApprove = useCallback(async () => {
    if (selected.size === 0) return;
    setBatchPending(true);
    setBatchAction("approve");

    const selectedVms = visible.filter((vm) => selected.has(vm.id));
    const results = await Promise.allSettled(
      selectedVms.map(async (vm) => {
        if (vm.provenance.source === "play_run") {
          return applyMemoryCarePlayRun(vm.provenance.playRunId);
        } else if (vm.provenance.source === "finding") {
          if (vm.provenance.apply === "memory_care") {
            return applyMemoryCareProfileFinding(vm.provenance.findingId);
          }
          return actOnFinding(vm.provenance.findingId);
        }
        return { success: false };
      }),
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value?.success,
    ).length;
    const failed = results.length - successful;

    if (successful > 0) {
      setStatuses((current) => {
        const next = { ...current };
        selectedVms.forEach((vm) => {
          const result = results[selectedVms.indexOf(vm)];
          if (result.status === "fulfilled" && result.value?.success) {
            next[vm.id] = "acted";
          }
        });
        return next;
      });
      toast(`Approved ${successful} item${successful > 1 ? "s" : ""}`);

      // Track batch action
      const firstVm = selectedVms[0];
      trackBatchActioned({
        playbook_slug: firstVm?.playbookSlug ?? null,
        count: successful,
        action: "approve",
      });
    }

    if (failed > 0) {
      toast.error(`${failed} item${failed > 1 ? "s" : ""} couldn't be approved`);
    }

    clearSelection();
    setBatchPending(false);
    setBatchAction(null);
  }, [selected, visible, clearSelection]);

  const handleBatchDismiss = useCallback(async () => {
    if (selected.size === 0) return;
    setBatchPending(true);
    setBatchAction("dismiss");

    const selectedVms = visible.filter((vm) => selected.has(vm.id));
    await Promise.all(
      selectedVms.map((vm) => {
        if (vm.provenance.source === "play_run") {
          return dismissPlayRun(vm.provenance.playRunId);
        }
        return dismissFinding(vm.provenance.findingId);
      }),
    );

    setStatuses((current) => {
      const next = { ...current };
      selectedVms.forEach((vm) => {
        next[vm.id] = "dismissed";
      });
      return next;
    });

    toast(`Dismissed ${selectedVms.length} item${selectedVms.length > 1 ? "s" : ""}`);

    // Track batch action
    const firstVm = selectedVms[0];
    trackBatchActioned({
      playbook_slug: firstVm?.playbookSlug ?? null,
      count: selectedVms.length,
      action: "dismiss",
    });

    clearSelection();
    setBatchPending(false);
    setBatchAction(null);
  }, [selected, visible, clearSelection]);

  const getDraft = useCallback(
    (vm: PlayCardViewModel) => drafts[vm.id] ?? vm.acting?.draftBody ?? [],
    [drafts],
  );

  const updateDraft = (id: string, text: string) => {
    const paras = text
      .split(/\n{2,}/)
      .map((segment) => segment.trim())
      .filter(Boolean);
    setDrafts((current) => ({ ...current, [id]: paras.length ? paras : [text] }));
  };

  const setRowPending = (id: string, value: boolean) =>
    setPending((current) => ({ ...current, [id]: value }));

  const handlePrimary = (vm: PlayCardViewModel, source: HTMLElement | null) => {
    const action = vm.primaryAction;
    if (!action) return;

    if (source) fireCelebration(source);

    if (action.kind === "approve_send" && vm.provenance.source === "play_run") {
      const { playRunId } = vm.provenance;
      setStatuses((current) => ({ ...current, [vm.id]: "approved" }));
      void (async () => {
        const result = await approvePlayRun(playRunId);
        if (result.ok) {
          toast("Approved & sending");
        } else {
          // Approval was refused (e.g. ENTITLEMENT_EXHAUSTED — the play
          // bundle is used up). The run is blocked, not approved, so undo
          // the optimistic status and say why.
          setStatuses((current) => {
            const next = { ...current };
            delete next[vm.id];
            return next;
          });
          toast.error(result.message);
        }
      })();
      return;
    }

    // Memory Care profile play_run (Phase 2 path)
    if (action.kind === "apply_memory" && vm.provenance.source === "play_run") {
      const { playRunId } = vm.provenance;
      setRowPending(vm.id, true);
      void (async () => {
        const result = await applyMemoryCarePlayRun(playRunId);
        setRowPending(vm.id, false);
        if (result.success) {
          setStatuses((current) => ({ ...current, [vm.id]: "acted" }));
          toast(action.label);
        } else {
          toast.error(result.error ?? "Could not apply");
        }
      })();
      return;
    }

    if (vm.provenance.source === "finding") {
      const { findingId } = vm.provenance;
      setRowPending(vm.id, true);
      void (async () => {
        const result =
          vm.provenance.source === "finding" && vm.provenance.apply === "memory_care"
            ? await applyMemoryCareProfileFinding(findingId)
            : vm.provenance.source === "finding" && vm.provenance.apply === "memory_plan"
              ? await applyMemoryPlan(findingId)
              : await actOnFinding(findingId);
        setRowPending(vm.id, false);
        if (result.success) {
          setStatuses((current) => ({ ...current, [vm.id]: "acted" }));
          toast(action.label);
        } else {
          toast.error(result.error ?? "Could not apply");
        }
      })();
    }
  };

  const handleDismiss = (vm: PlayCardViewModel) => {
    setStatuses((current) => ({ ...current, [vm.id]: "dismissed" }));
    if (vm.provenance.source === "play_run") {
      void dismissPlayRun(vm.provenance.playRunId);
    } else {
      void dismissFinding(vm.provenance.findingId);
    }
    toast("Dismissed");
  };

  const handleFlag = (vm: PlayCardViewModel) => {
    if (vm.provenance.source !== "finding") return;
    const { findingId } = vm.provenance;
    setRowPending(vm.id, true);
    void (async () => {
      const result = await toggleFlagFinding(findingId);
      setRowPending(vm.id, false);
      if (result.success) {
        setFlagged((current) => ({ ...current, [vm.id]: result.flagged }));
      }
    })();
  };

  const handleSchedule = () => {
    toast("Scheduled", { description: "Pick a time" });
  };

  const handleAnswer = (vm: PlayCardViewModel, value: string) => {
    const option = vm.question?.options.find((candidate) => candidate.value === value);

    // Memory Care question play_run (Phase 2 path)
    if (vm.provenance.source === "play_run") {
      const { playRunId } = vm.provenance;
      setRowPending(vm.id, true);
      void (async () => {
        const result = await answerMemoryCareQuestionPlayRun(playRunId, value);
        setRowPending(vm.id, false);
        if (result.success) {
          setStatuses((current) => ({ ...current, [vm.id]: "acted" }));
          toast(option ? `Saved ${option.label}` : "Saved");
        } else {
          toast.error(result.error ?? "Couldn't save your answer");
        }
      })();
      return;
    }

    const { findingId } = vm.provenance;
    setRowPending(vm.id, true);
    void (async () => {
      const result = await answerRelationshipQuestion(findingId, value);
      setRowPending(vm.id, false);
      if (result.success) {
        setStatuses((current) => ({ ...current, [vm.id]: "acted" }));
        toast(option ? `Saved ${option.label}` : "Saved");
      } else {
        toast.error(result.error ?? "Couldn't save your answer");
      }
    })();
  };

  // Track empty state shown
  useEffect(() => {
    if (visible.length === 0) {
      trackQueueEmptyState({ tab: "needs_you" });
    }
  }, [visible.length]);

  if (visible.length === 0) {
    return (
      <PlaysTabEmptyState
        icon={Sparkles}
        title={emptyMessage}
        description={emptyDescription}
      />
    );
  }

  return (
    <MotionConfig reducedMotion={prefersReducedMotion ? "always" : "never"}>
      <motion.div
        ref={listRef}
        layout={!prefersReducedMotion}
        className="space-y-4"
        role="list"
        aria-label="Play queue"
        onKeyDown={handleKeyDown}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((vm, index) => (
            <PlayCard
              key={vm.id}
              vm={vm}
              draft={getDraft(vm)}
              isEditing={editingId === vm.id}
              isPending={Boolean(pending[vm.id])}
              flagged={Boolean(flagged[vm.id])}
              onStartEdit={() => setEditingId(vm.id)}
              onStopEdit={() => setEditingId(null)}
              onDraftChange={(text) => updateDraft(vm.id, text)}
              onPrimary={(source) => handlePrimary(vm, source)}
              onDismiss={() => handleDismiss(vm)}
              onFlag={() => handleFlag(vm)}
              onSchedule={handleSchedule}
              onEditWithSalt={() => onEditWithSalt?.(vm)}
              onAnswer={(value) => handleAnswer(vm, value)}
              cardRef={(el) => registerCardRef(vm.id, el)}
              onFocus={() => setFocusedIndex(index)}
              isBatchEligible={batchEligibleIds.has(vm.id)}
              isSelected={selected.has(vm.id)}
              onToggleSelection={() => toggleSelection(vm.id)}
            />
          ))}
        </AnimatePresence>
      </motion.div>
      <ApproveCelebration burst={burst} />
      <BatchActionBar
        selectedCount={selected.size}
        onApproveAll={handleBatchApprove}
        onDismissAll={handleBatchDismiss}
        onClearSelection={clearSelection}
        isPending={batchPending}
        pendingAction={batchAction}
      />
    </MotionConfig>
  );
}
