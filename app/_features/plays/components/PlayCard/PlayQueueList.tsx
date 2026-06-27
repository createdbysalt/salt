"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  ApproveCelebration,
  useApproveCelebration,
} from "@/app/_features/plays/components/ApproveCelebration";
import { approvePlayRun, dismissPlayRun } from "@/app/_features/plays/actions";
import {
  actOnFinding,
  answerRelationshipQuestion,
  applyKeeperProfileFinding,
  applyMemoryPlan,
  dismissFinding,
  toggleFlagFinding,
} from "@/app/_features/capture/actions/intelligence-findings";
import type { PlayCardViewModel } from "../../play-card/types";
import { validatePlayCard } from "../../play-card/validate-play-card";
import { PlayCard } from "./PlayCard";

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

  const visible = useMemo(
    () => validCards.filter((vm) => (statuses[vm.id] ?? "idle") === "idle"),
    [validCards, statuses],
  );

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

    if (action.kind === "approve_send" && vm.provenance.source === "play_run") {
      fireCelebration(source);
      setStatuses((current) => ({ ...current, [vm.id]: "approved" }));
      void approvePlayRun(vm.provenance.playRunId);
      toast("Approved & sending");
      return;
    }

    if (vm.provenance.source === "finding") {
      const { findingId } = vm.provenance;
      setRowPending(vm.id, true);
      void (async () => {
        const result =
          vm.provenance.source === "finding" && vm.provenance.apply === "keeper_profile"
            ? await applyKeeperProfileFinding(findingId)
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
    if (vm.provenance.source !== "finding") {
      setStatuses((current) => ({ ...current, [vm.id]: "acted" }));
      toast(option ? `Saved ${option.label}` : "Saved");
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

  if (visible.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-10 text-center"
      >
        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-flame/10">
          <Sparkles className="size-5 text-flame" strokeWidth={2.25} />
        </div>
        <p className="font-display text-2xl tracking-tight">{emptyMessage}</p>
        <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div layout className="space-y-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((vm) => (
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
              onPrimary={() => handlePrimary(vm, null)}
              onDismiss={() => handleDismiss(vm)}
              onFlag={() => handleFlag(vm)}
              onSchedule={handleSchedule}
              onEditWithSalt={() => onEditWithSalt?.(vm)}
              onAnswer={(value) => handleAnswer(vm, value)}
            />
          ))}
        </AnimatePresence>
      </motion.div>
      <ApproveCelebration burst={burst} />
    </>
  );
}
