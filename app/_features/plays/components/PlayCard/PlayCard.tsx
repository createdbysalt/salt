"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Loader2,
  Maximize2,
  ShieldAlert,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Undo2,
  X,
} from "lucide-react";
import { cn } from "@repo/utils";
import type { PlayCardViewModel, PlayCardErrorState } from "../../play-card/types";
import { getRunPreconditionVerdict } from "../../actions/run-precondition-verdict";
import type { RunPreconditionVerdict } from "../../services/check-run-preconditions";
import {
  getSectionColorStyles,
  getSectionMeta,
  type PlaybookSection,
} from "../PlaybookSectionNav";
import { PlaybookConnectorLogos } from "../PlaybookConnectorLogos";
import { PlaybookStepDots } from "../PlaybookCardShared";
import { getSectionConnectorIds } from "../../lib/playbook-connectors";
import type { ConnectorCatalogId } from "@/app/_features/connectors/types";
import { PlayCardDetailModal } from "./PlayCardDetailModal";
import { DraftLetterHeader, PlayDraftPreview } from "./PlayDraftPreview";
import { buildPlayGlance } from "../../lib/play-headline";
import type { LucideIcon } from "lucide-react";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;
const SPRING = { type: "spring" as const, stiffness: 320, damping: 30, mass: 0.85 };

function formatFieldLabel(field: string): string {
  return field.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveSectionVisual(vm: PlayCardViewModel) {
  const section = vm.section;
  if (section) {
    const meta = getSectionMeta(section);
    return {
      Icon: meta.icon,
      label: meta.label,
      styles: getSectionColorStyles(section),
    };
  }

  // No section (shouldn't happen for v2-attributed runs): neutral Salt mark,
  // never a retired demo-player identity.
  return {
    Icon: Sparkles,
    label: vm.sectionLabel ?? vm.playerName ?? "Salt",
    styles: null,
  };
}

type SectionVisual = ReturnType<typeof resolveSectionVisual>;
/**
 * Left-edge washes for play cards — literal class strings so Tailwind v4
 * generates them (string-transformed classes are never emitted).
 * Playbook cards keep the top-right `gradient` from SECTION_COLOR_STYLES.
 */
const SECTION_GRADIENT_LEFT: Record<PlaybookSection, string | null> = {
  relationships:
    "bg-[radial-gradient(120%_90%_at_0%_50%,color-mix(in_oklab,var(--violet)_12%,transparent)_0%,transparent_65%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  work: "bg-[radial-gradient(120%_90%_at_0%_50%,color-mix(in_oklab,var(--sky)_12%,transparent)_0%,transparent_65%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  billing:
    "bg-[radial-gradient(120%_90%_at_0%_50%,color-mix(in_oklab,rgb(16_185_129)_11%,transparent)_0%,transparent_65%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  resources:
    "bg-[radial-gradient(120%_90%_at_0%_50%,color-mix(in_oklab,rgb(245_158_11)_11%,transparent)_0%,transparent_65%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  meetings:
    "bg-[radial-gradient(120%_90%_at_0%_50%,color-mix(in_oklab,var(--flame)_13%,transparent)_0%,transparent_65%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  communication:
    "bg-[radial-gradient(120%_90%_at_0%_50%,color-mix(in_oklab,rgb(6_182_212)_11%,transparent)_0%,transparent_65%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  me: "bg-[radial-gradient(120%_90%_at_0%_50%,color-mix(in_oklab,rgb(244_63_94)_11%,transparent)_0%,transparent_65%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  connections:
    "bg-[radial-gradient(120%_90%_at_0%_50%,color-mix(in_oklab,rgb(20_184_166)_11%,transparent)_0%,transparent_65%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  notes:
    "bg-[radial-gradient(120%_90%_at_0%_50%,color-mix(in_oklab,rgb(99_102_241)_11%,transparent)_0%,transparent_65%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  all: null,
};

/**
 * Primary CTA uses the aurora surface everywhere (queue card, detail modal,
 * HQ rail) — the signature Salt gradient, per DESIGN.md.
 */

/** Playbook-card shell: section gradient + ring, shared by queue + handled cards. */
function playCardShellClass(
  styles: SectionVisual["styles"],
  section: PlayCardViewModel["section"],
): string {
  return cn(
    "group relative overflow-hidden rounded-[24px] border border-border/50 transition-all duration-300",
    (section && SECTION_GRADIENT_LEFT[section]) ?? "glass-card",
    "hover:border-border hover:shadow-[0_20px_40px_-24px_color-mix(in_oklab,var(--foreground)_18%,transparent)]",
    styles?.ring ?? "ring-1 ring-foreground/8 hover:ring-foreground/14"
  );
}

export type { SectionVisual };
export { resolveSectionVisual, SECTION_GRADIENT_LEFT };

/** Playbook-card icon tile: 48px rounded-2xl, soft shadow, springy hover. */
export function PlayCardIconTile({ visual }: { visual: SectionVisual }) {
  const { Icon, styles } = visual;
  return (
    <motion.span
      whileHover={{ rotate: -6, scale: 1.08 }}
      transition={{ type: "spring", stiffness: 300, damping: 18 }}
      className={cn(
        "size-12 rounded-2xl grid place-items-center shrink-0",
        "shadow-[0_6px_18px_-6px_color-mix(in_oklab,var(--foreground)_22%,transparent)]",
        styles?.bg ?? "bg-muted"
      )}
    >
      <Icon
        className={cn("size-5", styles?.text ?? "text-muted-foreground")}
        strokeWidth={2}
      />
    </motion.span>
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

export function QueueIconActionButton({
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

/**
 * Primary CTA per output type (spec: verb matches the artifact).
 * Read-type artifacts open the detail popup first; send/apply stay one-tap.
 */
export function resolveCta(vm: PlayCardViewModel): { label: string; opensDetail: boolean } {
  switch (vm.outputType) {
    case "briefing":
    case "notification":
    case "finding":
      return { label: "Review", opensDetail: true };
    case "email_draft":
      return { label: "Send", opensDetail: false };
    case "memory_update":
      return { label: "Apply", opensDetail: false };
    default:
      if (vm.kind === "question") return { label: "Answer", opensDetail: true };
      return { label: "Approve", opensDetail: false };
  }
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
}: PlayCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [preparedSubject, setPreparedSubject] = useState<string | null>(null);
  const [gateVerdict, setGateVerdict] = useState<RunPreconditionVerdict | null>(null);
  const visual = resolveSectionVisual(vm);
  const emailSubject = preparedSubject ?? vm.acting?.emailSubject ?? null;

  // Gate preview: what approving will actually do (gates 2–4), fetched once
  // per paused play_run card. Fail-open — the gate itself still protects.
  const playRunId =
    vm.provenance.source === "play_run" ? vm.provenance.playRunId : null;
  useEffect(() => {
    if (!playRunId || !vm.primaryAction || vm.mode === "handled") return;
    let cancelled = false;
    void getRunPreconditionVerdict(playRunId).then((result) => {
      if (cancelled || !result.ok || !result.data) return;
      setGateVerdict(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [playRunId, vm.primaryAction, vm.mode]);

  const gateBlocked = gateVerdict?.kind.startsWith("blocked") ?? false;

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

  const openDetail = () => setIsDetailOpen(true);
  // Per-run logos (apps actually used) beat the section-default cluster.
  const logoIds = (vm.connectorIds?.length
    ? vm.connectorIds
    : getSectionConnectorIds(vm.section ?? null)) as ConnectorCatalogId[];
  const cta = resolveCta(vm);

  const glance = buildPlayGlance({
    headline: vm.headline,
    subject: vm.subject,
    targetLabel: vm.targetLabel,
    recipientLabel: vm.acting?.recipientLabel ?? vm.targetLabel,
    draftText: vm.acting?.draftBody.join("\n\n") ?? null,
    playbookSlug: vm.playbookSlug,
    playbookName: vm.playbookName,
    outputType: vm.outputType,
    triggerLabel: vm.triggerLabel,
    preview: vm.preview,
    valueEstimate: vm.valueEstimate,
    evidenceLabels: vm.evidence?.items.map((item) => item.label) ?? null,
  });
  const collapsedDetail =
    vm.kind === "question" && vm.question
      ? vm.question.prompt
      : glance.detail;

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
      className={cn(
        playCardShellClass(visual.styles, vm.section),
        "cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      )}
      tabIndex={0}
      role="listitem"
      aria-label={`${vm.playbookName ?? vm.sectionLabel ?? vm.playerName ?? "Salt"} play: ${glance.headline}`}
      onFocus={onFocus}
      onClick={openDetail}
    >
      {/* Expand affordance — top-right corner, icon only */}
      <button
        type="button"
        onClick={openDetail}
        aria-label="View details"
        className="absolute right-3.5 top-3.5 z-10 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:text-foreground focus:text-foreground"
      >
        <Maximize2 className="size-3.5" strokeWidth={2} />
      </button>

      {/* Glance layer */}
      <div className="flex flex-col gap-4 px-6 py-6 lg:px-7 lg:py-7">
        <div className="flex items-center gap-4">
        <PlayCardIconTile visual={visual} />

        <button
          type="button"
          onClick={openDetail}
          className="flex min-w-0 flex-1 flex-col items-start gap-1.5 text-left"
        >
          <div
            className={cn(
              "flex w-full min-w-0 items-center gap-2.5 text-[10px] uppercase tracking-[0.14em] font-bold",
              visual.styles?.text ?? "text-muted-foreground"
            )}
          >
            <span className="min-w-0 truncate">{vm.playbookName ?? visual.label}</span>
            {vm.stepPosition?.total ? (
              <PlaybookStepDots
                stepCount={vm.stepPosition.total}
                activeIndex={Math.min(vm.stepPosition.current - 1, vm.stepPosition.total - 1)}
                dotClass={visual.styles?.dot}
                label={`Step ${vm.stepPosition.current} of ${vm.stepPosition.total}`}
                className="shrink-0 normal-case tracking-normal"
              />
            ) : null}
          </div>

          <div className="flex w-full min-w-0 items-center gap-3">
            <h3 className="line-clamp-2 min-w-0 font-display text-[20px] leading-snug tracking-tight text-foreground">
              {glance.headline}
            </h3>
            {logoIds.length > 0 && (
              <PlaybookConnectorLogos ids={logoIds} className="hidden shrink-0 sm:flex" />
            )}
          </div>

          {collapsedDetail && collapsedDetail !== glance.headline ? (
            <p className="line-clamp-2 max-w-2xl text-[12px] leading-relaxed text-muted-foreground/60">
              {collapsedDetail}
            </p>
          ) : null}
        </button>
        </div>

        {/* Actions — bottom right */}
        <div className="flex justify-end">
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
                  if (cta.opensDetail) {
                    openDetail();
                  } else {
                    onPrimary(e.currentTarget);
                  }
                }}
                disabled={isPending || vm.error?.draftIncomplete || gateBlocked}
                title={gateBlocked ? gateVerdict?.summary : undefined}
                whileHover={gateBlocked ? undefined : { scale: 1.02, y: -1 }}
                whileTap={gateBlocked ? undefined : { scale: 0.97 }}
                transition={SPRING}
                className={cn(
                  "surface-aurora",
                  "relative ml-1 inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-xl px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-lift)] transition disabled:opacity-60",
                  gateBlocked && "cursor-not-allowed"
                )}
              >
                {isPending ? (
                  <Loader2 className="relative z-10 size-4 animate-spin" />
                ) : gateBlocked ? (
                  <ShieldAlert className="relative z-10 size-4" strokeWidth={2.25} />
                ) : (
                  <Sparkles className="relative z-10 size-4" strokeWidth={2.25} />
                )}
                <span className="relative z-10 max-w-[10rem] truncate sm:max-w-none">
                  {gateVerdict?.kind === "will_draft" ? "Create draft" : cta.label}
                </span>
              </motion.button>
            )}
          </div>

        </div>
        {gateVerdict && gateVerdict.kind !== "will_execute" && (
          <div className="flex justify-end">
            <p
              className={cn(
                "max-w-md text-right text-[11px] leading-snug",
                gateBlocked ? "text-amber-600" : "text-muted-foreground/70"
              )}
            >
              {gateVerdict.summary}
            </p>
          </div>
        )}
      </div>

      <PlayCardDetailModal
        vm={vm}
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        isPending={isPending}
        gateVerdict={gateVerdict}
        onPrimary={(source) => {
          setIsDetailOpen(false);
          onPrimary(source);
        }}
        onDismiss={() => {
          setIsDetailOpen(false);
          onDismiss();
        }}
        onEditWithSalt={() => {
          setIsDetailOpen(false);
          onEditWithSalt();
        }}
        draftText={draft.join("\n\n")}
        onDraftPrepared={(text, subject) => {
          onDraftChange(text);
          if (subject?.trim()) setPreparedSubject(subject.trim());
        }}
        renderSteps={() =>
          vm.chain ? <PlayChainRow chain={vm.chain} /> : null
        }
        renderBody={() => (
          <>
            {vm.error && <ErrorBanner error={vm.error} />}
            <PlayCardBody
              vm={vm}
              draft={draft}
              emailSubject={emailSubject}
              isEditing={isEditing}
              isPending={isPending}
              onStartEdit={onStartEdit}
              onStopEdit={onStopEdit}
              onDraftChange={onDraftChange}
              onAnswer={(value) => {
                setIsDetailOpen(false);
                onAnswer(value);
              }}
            />
          </>
        )}
      />
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
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const visual = resolveSectionVisual(vm);
  const handled = vm.handled!;
  const openDetail = () => setIsDetailOpen(true);
  // Per-run logos (apps actually used) beat the section-default cluster.
  const logoIds = (vm.connectorIds?.length
    ? vm.connectorIds
    : getSectionConnectorIds(vm.section ?? null)) as ConnectorCatalogId[];

  const detailLine = vm.targetLabel
    ? `${vm.targetPrefix} ${vm.targetLabel}`
    : (vm.preview ?? null);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
      transition={SPRING}
      className={cn(
        playCardShellClass(visual.styles, vm.section),
        "cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      )}
      tabIndex={0}
      role="listitem"
      aria-label={`${vm.playbookName ?? vm.sectionLabel ?? vm.playerName ?? "Salt"} handled play: ${handled.outcomeLabel}`}
      onClick={openDetail}
    >
      {/* Expand affordance — top-right corner, icon only */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openDetail();
        }}
        aria-label="View details"
        className="absolute right-3.5 top-3.5 z-10 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:text-foreground focus:text-foreground"
      >
        <Maximize2 className="size-3.5" strokeWidth={2} />
      </button>

      {/* Glance layer — identical anatomy to the needs-you card */}
      <div className="flex flex-col gap-4 px-6 py-6 lg:px-7 lg:py-7">
        <div className="flex items-center gap-4">
        <PlayCardIconTile visual={visual} />

        <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5 text-left">
          <p
            className={cn(
              "flex w-full min-w-0 items-center gap-2.5 text-[10px] uppercase tracking-[0.14em] font-bold",
              visual.styles?.text ?? "text-muted-foreground"
            )}
          >
            <span className="min-w-0 truncate">{vm.playbookName ?? visual.label}</span>
          </p>

          <div className="flex w-full min-w-0 items-center gap-3">
            <h3 className="line-clamp-2 min-w-0 font-display text-[20px] leading-snug tracking-tight text-foreground">
              {handled.outcomeLabel}
            </h3>
            {logoIds.length > 0 && (
              <PlaybookConnectorLogos ids={logoIds} className="hidden shrink-0 sm:flex" />
            )}
          </div>

          {detailLine && (
            <p className="line-clamp-2 max-w-2xl text-[12px] leading-relaxed text-muted-foreground/60">
              {detailLine}
            </p>
          )}
        </div>
        </div>

        {/* Actions — bottom right, same pill as the needs-you card */}
        <div className="flex justify-end">
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
        </div>
      </div>

      <PlayCardDetailModal
        vm={vm}
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        isPending={isPending}
        renderBody={() => null}
        onEditWithSalt={() => {
          setIsDetailOpen(false);
          onEditWithSalt();
        }}
        onUndo={
          onUndo
            ? () => {
                setIsDetailOpen(false);
                onUndo();
              }
            : undefined
        }
        onFeedback={onFeedback}
        feedbackGiven={feedbackGiven}
      />
    </motion.article>
  );
}

/**
 * Execution chain for paused runs: steps Salt already auto-ran, then the
 * action waiting on the user (or the connector that needs attention).
 */
function PlayChainRow({ chain }: { chain: NonNullable<PlayCardViewModel["chain"]> }) {
  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="list"
      aria-label="Play progress"
    >
      {chain.steps.map((step) => (
        <span
          key={step.id}
          role="listitem"
          className={cn(
            "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-medium",
            step.status === "done" &&
              "border-emerald-500/20 bg-emerald-500/5 text-emerald-600",
            step.status === "skipped" &&
              "border-border/50 bg-muted/40 text-muted-foreground/70 line-through",
            step.status === "failed" &&
              "border-red-500/20 bg-red-500/5 text-red-500",
          )}
        >
          {step.status === "done" && (
            <CheckCircle2 className="size-3" strokeWidth={2.25} />
          )}
          {step.status === "failed" && (
            <AlertTriangle className="size-3" strokeWidth={2.25} />
          )}
          {step.label}
        </span>
      ))}
      <span className="text-muted-foreground/40" aria-hidden="true">
        →
      </span>
      <span
        role="listitem"
        className={cn(
          "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold",
          chain.pending.blocked
            ? "border-amber-500/25 bg-amber-500/5 text-amber-600"
            : "border-foreground/15 bg-card text-foreground",
        )}
      >
        {chain.pending.blocked ? (
          <AlertTriangle className="size-3" strokeWidth={2.25} />
        ) : (
          <Sparkles className="size-3" strokeWidth={2.25} />
        )}
        {chain.pending.label}
      </span>
    </div>
  );
}

function PlayCardBody({
  vm,
  draft,
  emailSubject,
  isEditing,
  isPending,
  onStartEdit,
  onStopEdit,
  onDraftChange,
  onAnswer,
}: {
  vm: PlayCardViewModel;
  draft: string[];
  emailSubject?: string | null;
  isEditing: boolean;
  isPending: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onDraftChange: (text: string) => void;
  onAnswer: (value: string) => void;
}) {
  if (vm.kind === "acting" && vm.acting) {
    const letterSubject = emailSubject ?? vm.acting.emailSubject ?? null;
    const editAction = !isEditing ? (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onStartEdit();
        }}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
      >
        <Edit3 className="size-3" /> Edit
      </button>
    ) : (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onStopEdit();
        }}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground"
      >
        Done
      </button>
    );
    return (
      <div className="rounded-2xl border border-border/50 bg-card/80 p-4 lg:p-5">
        {isEditing ? (
          <div className="space-y-3">
            <DraftLetterHeader subject={letterSubject} action={editAction} />
            <textarea
              autoFocus
              value={draft.join("\n\n")}
              onChange={(event) => onDraftChange(event.target.value)}
              onBlur={onStopEdit}
              className="min-h-[140px] w-full resize-none bg-transparent text-[14.5px] leading-[1.5] text-foreground/90 outline-none [font-family:Arial,Helvetica,sans-serif]"
              rows={Math.max(6, draft.join("\n\n").split("\n").length + 1)}
            />
          </div>
        ) : (
          <div
            onClick={onStartEdit}
            className="cursor-text"
            title="Click to edit"
          >
            <PlayDraftPreview
              text={draft.join("\n\n")}
              subject={letterSubject}
              action={editAction}
            />
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

  // Risk/briefing text is the same content shown as the header summary
  // (risk.signal falls back to row.preview) — rendering both duplicates it.
  return null;
}
