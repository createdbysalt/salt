"use client";

import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { FindingWithContext } from "@/app/_features/capture/types/intelligence-findings";
import { undoHandledFinding } from "@/app/_features/capture/actions/intelligence-findings";
import { mapHandledFindingToCard } from "../play-card/map-handled-finding-to-card";
import { validatePlayCard } from "../play-card/validate-play-card";
import type { PlayCardViewModel } from "../play-card/types";
import { PlayCard } from "./PlayCard/PlayCard";

interface AutoHandledTimelineProps {
  findings: FindingWithContext[];
  emptyMessage?: string;
  emptyDescription?: string;
}

type GroupedCards = Array<{ label: string; cards: PlayCardViewModel[] }>;

export function AutoHandledTimeline({
  findings,
  emptyMessage = "Nothing auto-handled recently",
  emptyDescription = "Confident Keeper updates will appear here for quick review. Activity keeps the full all-time ledger.",
}: AutoHandledTimelineProps) {
  const [removed, setRemoved] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const grouped = useMemo<GroupedCards>(() => {
    const cards = findings
      .map(mapHandledFindingToCard)
      .filter((vm) => validatePlayCard(vm).ok && !removed[vm.id]);
    const groups = new Map<string, PlayCardViewModel[]>();
    for (const card of cards) {
      const label = formatDay(card.handled?.handledAt ?? new Date().toISOString());
      const current = groups.get(label) ?? [];
      current.push(card);
      groups.set(label, current);
    }
    return [...groups.entries()].map(([label, groupCards]) => ({ label, cards: groupCards }));
  }, [findings, removed]);

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

  if (grouped.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/50 py-16 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <CheckCircle2 className="size-5 text-muted-foreground" strokeWidth={2} />
        </div>
        <p className="text-sm font-medium text-foreground">{emptyMessage}</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <section className="space-y-6" aria-label="Auto-handled plays">
      {grouped.map((group) => (
        <div key={group.label} className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {group.label}
          </h3>
          <div className="space-y-2.5">
            {group.cards.map((vm) => (
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
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function formatDay(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}
