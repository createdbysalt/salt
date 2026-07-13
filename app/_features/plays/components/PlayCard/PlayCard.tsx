"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Clock,
  Edit3,
  ExternalLink,
  HelpCircle,
  Loader2,
  Mail,
  CreditCard,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Undo2,
  X,
} from "lucide-react";
import { cn } from "@repo/utils";
import { playerById, TONE_SOFT } from "@/app/_lib/demo/plays-demo-data";
import type { PlayCardViewModel, PlayCardErrorState } from "../../play-card/types";
import {
  getSectionColorStyles,
  getSectionMeta,
  type PlaybookSection,
} from "../PlaybookSectionNav";
import type { LucideIcon } from "lucide-react";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;
const SPRING = { type: "spring" as const, stiffness: 320, damping: 30, mass: 0.85 };

function formatFieldLabel(field: string): string {
  return field.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveSectionVisual(vm: PlayCardViewModel) {
  const section = vm.section;
  if (section) {
    const scoped = section as Exclude<PlaybookSection, "all">;
    const meta = getSectionMeta(scoped);
    const styles = getSectionColorStyles(scoped);
    return {
      Icon: meta.icon,
      shellClass: cn(
        "grid size-10 shrink-0 place-items-center rounded-2xl",
        styles.bg,
        styles.text,
      ),
    };
  }

  const player = playerById(vm.playerSlug);
  return {
    Icon: player.icon,
    shellClass: cn(
      "grid size-10 shrink-0 place-items-center rounded-2xl",
      TONE_SOFT[player.tone],
    ),
  };
}

function outputBadge(vm: PlayCardViewModel): { label: string; className: string } | null {
  if (vm.layer === "learn" || vm.channel === "Memory") {
    return { label: "Memory", className: "border border-violet/20 bg-violet/5 text-violet" };
  }
  if (vm.layer === "act") {
    return { label: "Action", className: "border border-flame/20 bg-flame/5 text-flame" };
  }
  if (vm.channel) {
    return { label: vm.channel, className: "border border-border/50 bg-muted/40 text-muted-foreground" };
  }
  return null;
}

function ConfidenceChip({ value }: { value: number }) {
  return (
    <span className="inline-flex h-5 shrink-0 items-center rounded-full border border-border/50 bg-muted/50 px-2 text-[10px] font-medium tabular-nums text-muted-foreground">
      {value}%
    </span>
  );
}

function OutputTypeChip({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[10px] font-medium",
        className,
      )}
    >
      {label}
    </span>
  );
}

function ErrorBanner({ error }: { error: PlayCardErrorState }) {
  return (
    <div className="mb-3 flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-[12px] text-amber-600">
      <AlertTriangle className="size-4 shrink-0" strokeWidth={2} />
      <span className="font-medium">{error.message ?? "Action unavailable"}</span>
    </div>
  );
}

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

function resolveSourceLinkMeta(
  url: string,
  channel: string | null,
): { label: string; Icon: LucideIcon } {
  const host = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();

  if (host.includes("mail.google") || host.includes("gmail")) {
    return { label: "Gmail", Icon: Mail };
  }
  if (host.includes("stripe")) {
    return { label: "Stripe", Icon: CreditCard };
  }
  if (host.includes("calendar.google")) {
    return { label: "Calendar", Icon: Calendar };
  }
  if (channel === "Gmail" || channel === "Email") {
    return { label: "Gmail", Icon: Mail };
  }
  if (channel === "Stripe") {
    return { label: "Stripe", Icon: CreditCard };
  }
  return { label: "View source", Icon: ExternalLink };
}

function PlaySourceLink({ href, channel }: { href: string; channel: string | null }) {
  const { label, Icon } = resolveSourceLinkMeta(href, channel);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group/source ml-auto inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-border/50 bg-card/90 px-2.5 text-[11px] font-medium text-muted-foreground shadow-sm transition hover:border-sky/30 hover:bg-sky/5 hover:text-sky"
    >
      <Icon
        className="size-3.5 shrink-0 opacity-70 transition group-hover/source:opacity-100"
        strokeWidth={2}
      />
      <span>{label}</span>
      <ExternalLink
        className="size-3 shrink-0 opacity-35 transition group-hover/source:opacity-60"
        strokeWidth={2.25}
      />
    </a>
  );
}

function QueueIconActionButton({
  label,
  shortcut,
  onClick,
  disabled,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      onClick={onClick}
      disabled={disabled}
      className="group relative inline-flex size-9 items-center justify-center rounded-xl text-foreground/70 transition-all hover:bg-muted hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
      {shortcut ? (
        <span className="pointer-events-none absolute -bottom-0.5 right-0.5 grid size-3.5 place-items-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          {shortcut}
        </span>
      ) : null}
    </button>
  );
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
  onPrimary: (source: HTMLElement) => void;
  onDismiss: () => void;
  onFlag: () => void;
  onSchedule: () => void;
  onEditWithSalt: () => void;
  onAnswer: (value: string) => void;
  onUndo?: () => void;
  onFeedback?: (type: "positive" | "negative") => void;
  feedbackGiven?: "positive" | "negative" | null;
  cardRef?: (el: HTMLElement | null) => void;
  onFocus?: () => void;
  isBatchEligible?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
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
  onFeedback,
  feedbackGiven,
  cardRef,
  onFocus,
  isBatchEligible = false,
  isSelected = false,
  onToggleSelection,
}: PlayCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { Icon: SectionIcon, shellClass } = resolveSectionVisual(vm);
  const badge = outputBadge(vm);

  if (vm.mode === "handled" && vm.handled) {
    return (
      <HandledPlayCard
        vm={vm}
        isPending={isPending}
        onUndo={onUndo}
        onEditWithSalt={onEditWithSalt}
        onFeedback={onFeedback}
        feedbackGiven={feedbackGiven}
      />
    );
  }

  const toggleExpanded = () => setIsExpanded(!isExpanded);

  const collapsedDetail =
    vm.kind === "profile"
      ? null
      : vm.kind === "acting" && vm.acting
        ? `Draft to ${vm.acting.recipientLabel}`
        : vm.kind === "question" && vm.question
          ? vm.question.prompt
          : (vm.preview ?? "");

  return (
    <motion.article
      ref={cardRef}
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
      className="group glass-card relative overflow-hidden rounded-3xl border border-border/50 transition-colors hover:border-border/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      tabIndex={0}
      role="listitem"
      aria-label={`${vm.playbookName ?? vm.sectionLabel ?? vm.playerName} play: ${vm.subject}`}
      aria-expanded={isExpanded}
      onFocus={onFocus}
    >
      {/* Collapsed row */}
      <div className="flex items-center gap-3 p-4 lg:px-5">
        {isBatchEligible && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelection?.();
            }}
            aria-pressed={isSelected}
            aria-label={isSelected ? "Deselect for batch action" : "Select for batch action"}
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-lg transition",
              isSelected
                ? "text-foreground"
                : "text-muted-foreground/40 hover:text-muted-foreground",
            )}
          >
            {isSelected ? (
              <CheckSquare className="size-5" strokeWidth={2} />
            ) : (
              <Square className="size-5" strokeWidth={1.5} />
            )}
          </button>
        )}

        <span className={shellClass}>
          <SectionIcon className="size-4" strokeWidth={2} />
        </span>

        <button
          type="button"
          onClick={toggleExpanded}
          className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
        >
          <p className="w-full min-w-0 truncate text-[11px] font-medium text-muted-foreground">
            <span className="text-foreground/80">
              {vm.playbookName
                ? `${vm.playbookName} Play`
                : `${vm.sectionLabel ?? vm.playerName} Play`}
            </span>
          </p>

          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground sm:line-clamp-1">
            {vm.subject}
          </h3>

          {(vm.targetLabel || collapsedDetail) && (
            <p className="line-clamp-1 text-[12px] leading-relaxed text-muted-foreground">
              {vm.targetLabel && (
                <span>
                  {vm.targetPrefix} {vm.targetLabel}
                </span>
              )}
              {vm.targetLabel && collapsedDetail && (
                <span className="text-muted-foreground/50"> · </span>
              )}
              {collapsedDetail && (
                <span className="text-muted-foreground/70">{collapsedDetail}</span>
              )}
            </p>
          )}

          {(typeof vm.confidence === "number" || badge || typeof vm.ageMinutes === "number") && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {typeof vm.confidence === "number" && <ConfidenceChip value={vm.confidence} />}
              {badge && <OutputTypeChip label={badge.label} className={badge.className} />}
              {typeof vm.ageMinutes === "number" && (
                <span className="inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[10px] text-muted-foreground/70">
                  <Clock className="size-3" /> {ageLabel(vm.ageMinutes)}
                </span>
              )}
            </div>
          )}
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <div className="inline-flex items-center gap-1 rounded-2xl border border-border/50 bg-muted/60 p-1">
            {vm.canSchedule && (
              <QueueIconActionButton
                label="Schedule"
                shortcut="S"
                onClick={(e) => {
                  e.stopPropagation();
                  onSchedule();
                }}
              >
                <Calendar className="size-[18px]" strokeWidth={1.75} />
              </QueueIconActionButton>
            )}
            <QueueIconActionButton
              label="Dismiss"
              shortcut="D"
              disabled={isPending}
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
            >
              <X className="size-[18px]" strokeWidth={1.75} />
            </QueueIconActionButton>
            <QueueIconActionButton
              label="Edit with Salt"
              shortcut="E"
              onClick={(e) => {
                e.stopPropagation();
                onEditWithSalt();
              }}
            >
              <Edit3 className="size-[18px]" strokeWidth={1.75} />
            </QueueIconActionButton>
            {vm.primaryAction && (
              <motion.button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrimary(e.currentTarget);
                }}
                disabled={isPending || vm.error?.draftIncomplete}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
                transition={SPRING}
                className="surface-aurora relative ml-1 inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-xl px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-lift)] transition disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 className="relative z-10 size-4 animate-spin" />
                ) : (
                  <Sparkles className="relative z-10 size-4" strokeWidth={2.25} />
                )}
                <span className="relative z-10 max-w-[10rem] truncate sm:max-w-none">
                  {vm.primaryAction.label}
                </span>
              </motion.button>
            )}
          </div>

          <button
            type="button"
            onClick={toggleExpanded}
            aria-label={isExpanded ? "Collapse" : "Expand"}
            aria-expanded={isExpanded}
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground/60 transition hover:bg-muted/60 hover:text-foreground",
              isExpanded && "bg-muted/50 text-foreground",
            )}
          >
            <ChevronDown
              className={cn(
                "size-[18px] transition-transform duration-200",
                isExpanded && "rotate-180",
              )}
              strokeWidth={1.75}
            />
          </button>
        </div>
      </div>

      {/* Expanded panel */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-border/40 bg-muted/10 px-4 pb-4 pt-4 lg:px-5">
              {vm.error && <ErrorBanner error={vm.error} />}

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

              {(vm.sourceUrl ||
                vm.triggerLabel ||
                vm.confidenceExplanation ||
                vm.valueEstimate) && (
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border/30 pt-3">
                  {(vm.triggerLabel || vm.confidenceExplanation || vm.valueEstimate) && (
                    <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-muted-foreground">
                      {vm.triggerLabel && (
                        <span className="font-medium text-foreground/80">{vm.triggerLabel}</span>
                      )}
                      {vm.triggerLabel && vm.confidenceExplanation && (
                        <span className="text-muted-foreground/45"> · </span>
                      )}
                      {vm.confidenceExplanation && <span>{vm.confidenceExplanation}</span>}
                      {vm.valueEstimate && (
                        <>
                          {(vm.triggerLabel || vm.confidenceExplanation) && (
                            <span className="text-muted-foreground/45"> · </span>
                          )}
                          <span className="font-medium text-emerald-600">{vm.valueEstimate}</span>
                        </>
                      )}
                    </p>
                  )}
                  {vm.sourceUrl && (
                    <PlaySourceLink href={vm.sourceUrl} channel={vm.channel} />
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function HandledPlayCard({
  vm,
  isPending,
  onUndo,
  onEditWithSalt,
  onFeedback,
  feedbackGiven,
}: {
  vm: PlayCardViewModel;
  isPending: boolean;
  onUndo?: () => void;
  onEditWithSalt: () => void;
  onFeedback?: (type: "positive" | "negative") => void;
  feedbackGiven?: "positive" | "negative" | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { Icon: SectionIcon, shellClass } = resolveSectionVisual(vm);
  const badge = outputBadge(vm);
  const handled = vm.handled!;
  const whyAutoHandled = formatWhyAutoHandled(vm.confidence, vm.stakes);
  const toggleExpanded = () => setIsExpanded((open) => !open);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
      transition={SPRING}
      className="group glass-card relative overflow-hidden rounded-3xl border border-border/50 transition-colors hover:border-border/80"
      role="listitem"
      aria-label={`${vm.playbookName ?? vm.sectionLabel ?? vm.playerName} handled play: ${handled.outcomeLabel}`}
      aria-expanded={isExpanded}
    >
      <div className="flex items-center gap-3 p-4 lg:px-5">
        <span className={shellClass}>
          <SectionIcon className="size-4" strokeWidth={2} />
        </span>

        <button
          type="button"
          onClick={toggleExpanded}
          className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
        >
          <p className="w-full min-w-0 truncate text-[11px] font-medium text-muted-foreground">
            <span className="text-foreground/80">
              {vm.playbookName
                ? `${vm.playbookName} Play`
                : `${vm.sectionLabel ?? vm.playerName} Play`}
            </span>
          </p>

          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground sm:line-clamp-1">
            {handled.outcomeLabel}
          </h3>

          {vm.targetLabel && (
            <p className="line-clamp-1 text-[12px] leading-relaxed text-muted-foreground">
              {vm.targetPrefix} {vm.targetLabel}
            </p>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex h-5 items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 text-[10px] font-medium text-emerald-600">
              <CheckCircle2 className="size-3" strokeWidth={2} />
              Handled · {timeLabel(handled.handledAt)}
            </span>
            {typeof vm.confidence === "number" && <ConfidenceChip value={vm.confidence} />}
            {badge && <OutputTypeChip label={badge.label} className={badge.className} />}
          </div>
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <div className="inline-flex items-center gap-1 rounded-2xl border border-border/50 bg-muted/60 p-1">
            {onFeedback && !feedbackGiven && (
              <>
                <QueueIconActionButton
                  label="Helpful"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFeedback("positive");
                  }}
                >
                  <ThumbsUp className="size-[18px]" strokeWidth={1.75} />
                </QueueIconActionButton>
                <QueueIconActionButton
                  label="Not helpful"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFeedback("negative");
                  }}
                >
                  <ThumbsDown className="size-[18px]" strokeWidth={1.75} />
                </QueueIconActionButton>
              </>
            )}
            {feedbackGiven && (
              <span
                className={cn(
                  "inline-flex h-9 items-center gap-1 px-2 text-[10px] font-medium",
                  feedbackGiven === "positive" ? "text-emerald-600" : "text-red-500",
                )}
              >
                {feedbackGiven === "positive" ? (
                  <ThumbsUp className="size-3.5" strokeWidth={2} />
                ) : (
                  <ThumbsDown className="size-3.5" strokeWidth={2} />
                )}
              </span>
            )}
            <QueueIconActionButton
              label="Fix with Salt"
              shortcut="E"
              onClick={(e) => {
                e.stopPropagation();
                onEditWithSalt();
              }}
            >
              <Edit3 className="size-[18px]" strokeWidth={1.75} />
            </QueueIconActionButton>
            {onUndo && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUndo();
                }}
                disabled={isPending}
                className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 text-[13px] font-semibold text-foreground transition hover:bg-muted/50 disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Undo2 className="size-4" strokeWidth={2} />
                )}
                <span>Undo</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={toggleExpanded}
            aria-label={isExpanded ? "Collapse" : "Expand"}
            aria-expanded={isExpanded}
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground/60 transition hover:bg-muted/60 hover:text-foreground",
              isExpanded && "bg-muted/50 text-foreground",
            )}
          >
            <ChevronDown
              className={cn(
                "size-[18px] transition-transform duration-200",
                isExpanded && "rotate-180",
              )}
              strokeWidth={1.75}
            />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-border/40 bg-muted/10 px-4 pb-4 pt-4 lg:px-5">
              {whyAutoHandled && (
                <p className="flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground">
                  <HelpCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.5} />
                  <span>{whyAutoHandled}</span>
                </p>
              )}

              {vm.kind === "profile" && vm.profile && handled.changeLine && (
                <div className="rounded-2xl border border-border/50 bg-card/80 p-4 lg:p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Applied change
                  </p>
                  <p className="mt-2 text-[14px] font-medium text-foreground">{handled.changeLine}</p>
                </div>
              )}

              {!vm.profile && handled.changeLine && (
                <p className="text-[13px] leading-relaxed text-muted-foreground">{handled.changeLine}</p>
              )}

              {(vm.sourceUrl ||
                vm.triggerLabel ||
                vm.confidenceExplanation ||
                vm.valueEstimate) && (
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border/30 pt-3">
                  {(vm.triggerLabel || vm.confidenceExplanation || vm.valueEstimate) && (
                    <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-muted-foreground">
                      {vm.triggerLabel && (
                        <span className="font-medium text-foreground/80">{vm.triggerLabel}</span>
                      )}
                      {vm.triggerLabel && vm.confidenceExplanation && (
                        <span className="text-muted-foreground/45"> · </span>
                      )}
                      {vm.confidenceExplanation && <span>{vm.confidenceExplanation}</span>}
                      {vm.valueEstimate && (
                        <>
                          {(vm.triggerLabel || vm.confidenceExplanation) && (
                            <span className="text-muted-foreground/45"> · </span>
                          )}
                          <span className="font-medium text-emerald-600">{vm.valueEstimate}</span>
                        </>
                      )}
                    </p>
                  )}
                  {vm.sourceUrl && <PlaySourceLink href={vm.sourceUrl} channel={vm.channel} />}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function formatWhyAutoHandled(
  confidence: number | null,
  stakes: "low" | "medium" | "high" | null,
): string | null {
  if (confidence == null) return null;
  const stakesLabel = stakes === "low" ? "low-stakes" : stakes === "medium" ? "medium-stakes" : stakes === "high" ? "high-stakes" : "";
  if (confidence >= 90) {
    return `${confidence}% confidence${stakesLabel ? ` + ${stakesLabel} action` : ""} = auto-handled`;
  }
  if (confidence >= 70 && stakes !== "high") {
    return `${confidence}% confidence${stakesLabel ? ` + ${stakesLabel} action` : ""} = auto-handled`;
  }
  return `${confidence}% confidence${stakesLabel ? `, ${stakesLabel}` : ""}`;
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
      <div className="rounded-2xl border border-border/50 bg-card/80 p-4 lg:p-5">
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
      <div className="rounded-2xl border border-border/50 bg-card/80 p-4 lg:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Proposed change
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-[14px] text-muted-foreground">
            {formatFieldLabel(vm.profile.field)}
          </span>
          <span className="text-muted-foreground/40">→</span>
          <span className="text-[15px] font-semibold text-foreground">
            {vm.profile.proposedValue}
          </span>
        </div>
      </div>
    );
  }

  if (vm.kind === "question" && vm.question) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/80 p-4 lg:p-5">
        <p className="text-sm font-medium text-foreground">{vm.question.prompt}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {vm.question.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onAnswer(option.value)}
              disabled={isPending}
              className="inline-flex h-9 items-center rounded-full border border-border/60 bg-card px-3.5 text-[13px] font-medium transition hover:border-foreground/20 hover:bg-muted/50 disabled:opacity-60"
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
      <div className="rounded-2xl border border-border/50 bg-card/80 p-4 lg:p-5">
        <p className="text-[13px] leading-relaxed text-foreground/85">{vm.risk.signal}</p>
        {vm.risk.recommendation && (
          <p className="mt-2 text-[12px] font-medium text-muted-foreground">
            {vm.risk.recommendation}
          </p>
        )}
      </div>
    );
  }

  return vm.preview ? (
    <p className="text-[13px] leading-relaxed text-muted-foreground">{vm.preview}</p>
  ) : null;
}
