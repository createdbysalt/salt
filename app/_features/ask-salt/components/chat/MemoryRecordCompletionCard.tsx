"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  Building2,
  Calendar,
  FileText,
  Loader2,
  Play,
  StickyNote,
  User,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { RecordDeckCompletionEntry } from "../../record-deck-utils";
import { cn } from "@repo/utils";

type MemoryRecordCompletionCardProps = {
  entry: RecordDeckCompletionEntry;
  onUndo?: () => void;
  undoPending?: boolean;
};

const RECORD_KIND_META: Record<
  NonNullable<RecordDeckCompletionEntry["recordKind"]>,
  { icon: LucideIcon; label: string }
> = {
  person: { icon: User, label: "People" },
  org: { icon: Building2, label: "Organizations" },
  work: { icon: Briefcase, label: "Work" },
  note: { icon: StickyNote, label: "Notes" },
  blocker: { icon: AlertTriangle, label: "Blockers" },
  meeting: { icon: Calendar, label: "Meetings" },
  billing: { icon: WalletCards, label: "Billing" },
  file: { icon: FileText, label: "Files" },
  playbook: { icon: Play, label: "Playbooks" },
};

export function MemoryRecordCompletionCard({
  entry,
  onUndo,
  undoPending = false,
}: MemoryRecordCompletionCardProps) {
  const meta = entry.recordKind
    ? RECORD_KIND_META[entry.recordKind]
    : { icon: Briefcase, label: entry.memoryLabel };
  const Icon = meta.icon;

  return (
    <article
      className="w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)]"
      data-testid="memory-record-completion-card"
    >
      <div className="surface-aurora relative px-4 py-4 text-white sm:px-5 sm:py-4">
        <div className="relative z-10 min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
            <Icon className="size-3.5 shrink-0" strokeWidth={2.25} />
            {meta.label}
          </div>
          <p className="mt-2.5 break-words font-display text-[1.35rem] leading-tight tracking-tight text-white">
            {entry.linkLabel}
          </p>
          {entry.subtitle ? (
            <p
              className={cn(
                "mt-1.5 text-sm text-white/75",
                entry.recordKind === "note"
                  ? "line-clamp-3 whitespace-normal"
                  : "break-words",
              )}
            >
              {entry.subtitle}
            </p>
          ) : (
            <p className="mt-1.5 text-sm text-white/75">Added to Memory</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border/50 px-4 py-3.5">
        {entry.href ? (
          <Link
            href={entry.href}
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-medium text-background transition hover:bg-foreground/90"
          >
            Open in {meta.label}
            <ArrowUpRight className="size-3.5 shrink-0" strokeWidth={2.25} />
          </Link>
        ) : (
          <span className="inline-flex h-10 w-full items-center justify-center rounded-full border border-border/60 px-4 text-sm font-medium text-muted-foreground">
            Saved
          </span>
        )}
        {entry.undo && onUndo ? (
          <button
            type="button"
            disabled={undoPending}
            onClick={onUndo}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-sm font-medium text-muted-foreground transition hover:bg-muted/60 hover:text-foreground disabled:opacity-50"
          >
            {undoPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Undo
          </button>
        ) : null}
      </div>
    </article>
  );
}
