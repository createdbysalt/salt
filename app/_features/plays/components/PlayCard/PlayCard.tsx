"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Loader2,
  Sparkles,
  Star,
  Undo2,
  X,
} from "lucide-react";
import { cn } from "@repo/utils";
import { playerById, TONE_SOFT } from "@/app/_lib/demo/plays-demo-data";
import type { PlayCardViewModel } from "../../play-card/types";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;
const SPRING = { type: "spring" as const, stiffness: 320, damping: 30, mass: 0.85 };

function ageLabel(min: number): string {
  if (min < 60) return `${min}m ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const d = Math.round(hrs / 24);
  return `${d}d ago`;
}

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export interface PlayCardProps {
  vm: PlayCardViewModel;
  draft: string[];
  isEditing: boolean;
  isPending: boolean;
  flagged: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onDraftChange: (text: string) => void;
  onPrimary: () => void;
  onDismiss: () => void;
  onFlag: () => void;
  onSchedule: () => void;
  onEditWithSalt: () => void;
  onAnswer: (value: string) => void;
  onUndo?: () => void;
}

export function PlayCard({
  vm,
  draft,
  isEditing,
  isPending,
  flagged,
  onStartEdit,
  onStopEdit,
  onDraftChange,
  onPrimary,
  onDismiss,
  onFlag,
  onSchedule,
  onEditWithSalt,
  onAnswer,
  onUndo,
}: PlayCardProps) {
  const player = playerById(vm.playerSlug);
  const PlayerIcon = player.icon;

  if (vm.mode === "handled" && vm.handled) {
    return (
      <HandledPlayCard
        vm={vm}
        isPending={isPending}
        onUndo={onUndo}
        onEditWithSalt={onEditWithSalt}
      />
    );
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        x: 60,
        scale: 0.96,
        filter: "blur(4px)",
        transition: { duration: 0.3, ease: APPLE_EASE },
      }}
      transition={SPRING}
      className="group glass-card relative overflow-hidden rounded-3xl p-5 lg:p-6"
    >
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-2xl",
              TONE_SOFT[player.tone],
            )}
          >
            <PlayerIcon className="size-[18px]" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-[13px] leading-tight">
              <span className="font-semibold tracking-tight">{vm.playerName}</span>
              {vm.playbookName && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{vm.playbookName}</span>
                </>
              )}
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              {typeof vm.ageMinutes === "number" && (
                <>
                  <Clock className="size-3" /> {ageLabel(vm.ageMinutes)}
                </>
              )}
              {vm.triggerLabel && (
                <>
                  {typeof vm.ageMinutes === "number" && (
                    <span className="text-muted-foreground/60">·</span>
                  )}
                  <span>{vm.triggerLabel}</span>
                </>
              )}
              {typeof vm.confidence === "number" && (
                <>
                  <span className="text-muted-foreground/60">·</span>
                  <span className="tabular-nums">{vm.confidence}% confidence</span>
                </>
              )}
            </p>
          </div>
        </div>
        {vm.channel && <span className="chip shrink-0">{vm.channel}</span>}
      </div>

      {/* Subject + target */}
      <div>
        <h3 className="text-[17px] font-semibold leading-snug tracking-tight">{vm.subject}</h3>
        {vm.targetLabel && (
          <p className="mt-1 text-[12px] text-muted-foreground">
            {vm.targetPrefix} {vm.targetLabel}
          </p>
        )}
      </div>

      {/* Body slot */}
      <PlayCardBody
        vm={vm}
        draft={draft}
        isEditing={isEditing}
        isPending={isPending}
        onStartEdit={onStartEdit}
        onStopEdit={onStopEdit}
        onDraftChange={onDraftChange}
        onAnswer={onAnswer}
      />

      {/* Footer */}
      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {vm.sourceUrl ? (
          <a
            href={vm.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground transition hover:text-foreground"
          >
            <ExternalLink className="size-3.5" strokeWidth={1.75} /> Open source
          </a>
        ) : (
          <span className="text-[11px] text-muted-foreground/50">
            {vm.playbookName ?? player.name}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {vm.canSchedule && (
            <button
              type="button"
              onClick={onSchedule}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium text-muted-foreground transition hover:bg-muted"
            >
              <Calendar className="size-4" strokeWidth={1.75} /> Schedule
            </button>
          )}
          {vm.canFlag && (
            <button
              type="button"
              onClick={onFlag}
              disabled={isPending}
              aria-pressed={flagged}
              aria-label={flagged ? "Unflag" : "Flag for follow-up"}
              title={flagged ? "Unflag" : "Flag for follow-up"}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-xl transition hover:bg-muted disabled:opacity-60",
                flagged ? "text-flame" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Star className="size-[18px]" strokeWidth={1.75} fill={flagged ? "currentColor" : "none"} />
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            disabled={isPending}
            aria-label="Dismiss"
            title="Dismiss"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-60"
          >
            <X className="size-4" strokeWidth={1.75} /> Dismiss
          </button>
          <button
            type="button"
            onClick={onEditWithSalt}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-[13px] font-medium transition hover:bg-muted"
          >
            <Sparkles className="size-4 text-flame" strokeWidth={2} /> Edit with Salt
          </button>
          {vm.primaryAction && (
            <button
              type="button"
              onClick={onPrimary}
              disabled={isPending}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-foreground px-4 text-[13px] font-semibold text-background transition hover:opacity-90 disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" strokeWidth={2} />
              )}
              {vm.primaryAction.label}
            </button>
          )}
        </div>
      </footer>
    </motion.article>
  );
}

function HandledPlayCard({
  vm,
  isPending,
  onUndo,
  onEditWithSalt,
}: {
  vm: PlayCardViewModel;
  isPending: boolean;
  onUndo?: () => void;
  onEditWithSalt: () => void;
}) {
  const player = playerById(vm.playerSlug);
  const PlayerIcon = player.icon;
  const handled = vm.handled!;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
      transition={SPRING}
      className="group rounded-2xl border border-border/60 bg-card/70 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-xl",
              TONE_SOFT[player.tone],
            )}
          >
            <PlayerIcon className="size-4" strokeWidth={2} />
          </span>
          <div className="flex flex-wrap items-center gap-1.5 text-[12px] leading-tight">
            <span className="font-semibold tracking-tight">{player.name}</span>
            {vm.playbookName && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{vm.playbookName}</span>
              </>
            )}
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-emerald-600">
          <CheckCircle2 className="size-3.5" strokeWidth={2} /> Handled
          <span className="text-muted-foreground/60">· {timeLabel(handled.handledAt)}</span>
        </span>
      </div>

      <div className="mt-2.5 pl-[42px]">
        <p className="text-[14px] font-medium leading-snug text-foreground">
          {handled.outcomeLabel}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
          {vm.targetLabel && (
            <span>
              {vm.targetPrefix} {vm.targetLabel}
            </span>
          )}
          {handled.changeLine && (
            <>
              {vm.targetLabel && <span className="text-muted-foreground/60">·</span>}
              <span className="text-foreground/70">{handled.changeLine}</span>
            </>
          )}
          {typeof vm.confidence === "number" && (
            <>
              <span className="text-muted-foreground/60">·</span>
              <span className="tabular-nums">{vm.confidence}% confidence</span>
            </>
          )}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 pl-[42px]">
        {vm.sourceUrl ? (
          <a
            href={vm.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground transition hover:text-foreground"
          >
            <ExternalLink className="size-3.5" strokeWidth={1.75} /> Open source
          </a>
        ) : (
          <span aria-hidden />
        )}
        <div className="flex items-center gap-1">
          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              disabled={isPending}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Undo2 className="size-3.5" strokeWidth={2} />
              )}
              Undo
            </button>
          )}
          <button
            type="button"
            onClick={onEditWithSalt}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Sparkles className="size-3.5 text-flame" strokeWidth={2} /> Fix with Salt
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function PlayCardBody({
  vm,
  draft,
  isEditing,
  isPending,
  onStartEdit,
  onStopEdit,
  onDraftChange,
  onAnswer,
}: {
  vm: PlayCardViewModel;
  draft: string[];
  isEditing: boolean;
  isPending: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onDraftChange: (text: string) => void;
  onAnswer: (value: string) => void;
}) {
  if (vm.kind === "acting" && vm.acting) {
    return (
      <div className="mt-4 rounded-2xl border border-border/60 bg-card/60 p-4 lg:p-5">
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Draft to {vm.acting.recipientLabel}
          </p>
          {!isEditing ? (
            <button
              type="button"
              onClick={onStartEdit}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
            >
              <Edit3 className="size-3" /> Edit
            </button>
          ) : (
            <button
              type="button"
              onClick={onStopEdit}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground"
            >
              Done
            </button>
          )}
        </div>
        {isEditing ? (
          <textarea
            autoFocus
            value={draft.join("\n\n")}
            onChange={(event) => onDraftChange(event.target.value)}
            onBlur={onStopEdit}
            className="min-h-[140px] w-full resize-none bg-transparent text-[14px] leading-relaxed text-foreground/90 outline-none"
            rows={Math.max(6, draft.join("\n\n").split("\n").length + 1)}
          />
        ) : (
          <div
            onClick={onStartEdit}
            className="cursor-text space-y-3 text-[14px] leading-relaxed text-foreground/90"
            title="Click to edit"
          >
            {draft.map((para, index) => (
              <p key={index}>{para}</p>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (vm.kind === "profile" && vm.profile) {
    return (
      <div className="mt-4 rounded-2xl border border-border/60 bg-card/60 p-4 lg:p-5">
        {vm.preview && (
          <p className="text-sm leading-relaxed text-muted-foreground">{vm.preview}</p>
        )}
      </div>
    );
  }

  if (vm.kind === "question" && vm.question) {
    return (
      <div className="mt-4 rounded-2xl border border-border/60 bg-card/60 p-4 lg:p-5">
        <p className="text-sm font-medium text-foreground">{vm.question.prompt}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {vm.question.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onAnswer(option.value)}
              disabled={isPending}
              className="inline-flex h-9 items-center rounded-full border border-border bg-card px-3.5 text-[13px] font-medium transition hover:border-foreground/30 hover:bg-muted disabled:opacity-60"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (vm.kind === "risk" && vm.risk) {
    return (
      <div className="mt-4 rounded-2xl border border-border/60 bg-card/60 p-4 lg:p-5">
        <p className="text-sm leading-relaxed text-muted-foreground">{vm.risk.signal}</p>
      </div>
    );
  }

  // routing / fallback
  return vm.preview ? (
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{vm.preview}</p>
  ) : null;
}
