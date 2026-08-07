"use client";

import { useCallback, useEffect, useRef, useState, type Ref } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import {
  ArrowUpRight,
  Clock,
  Edit3,
  Flame,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import {
  getHqQueuePlayer,
  HQ_QUEUE_CHANNEL,
  HQ_QUEUE_TONE_SOFT,
  type HqQueueChannel,
} from "@/app/_lib/demo/hq-play-queue";
import type { PlayCardViewModel } from "@/app/_features/plays/play-card/types";
import {
  approvePlayRun,
  applyKeeperPlayRun,
  dismissPlayRun,
  editPlayRun,
} from "@/app/_features/plays/actions";
import {
  actOnFinding,
  applyKeeperProfileFinding,
  applyMemoryPlan,
  dismissFinding,
} from "@/app/_features/capture/actions/intelligence-findings";
import {
  ApproveCelebration,
  useApproveCelebration,
} from "@/app/_features/plays/components/ApproveCelebration";

const SALT_ICON_PATH = "/landing/salt-icon.svg";
const APPLE_EASE = [0.32, 0.72, 0, 1] as const;
const SPRING = { type: "spring" as const, stiffness: 380, damping: 32, mass: 0.8 };
const SOFT_SPRING = { type: "spring" as const, stiffness: 260, damping: 28, mass: 0.9 };
const STACK_PEEK_Y = 6;
const STACK_MAX_VISIBLE = 4;
/** Fixed height so every card in the stack peeks at the same size. */
const STACK_CARD_HEIGHT = 340;

type Status = "idle" | "approved" | "skipped";

function stackMotion(stackIndex: number) {
  return {
    y: stackIndex * STACK_PEEK_Y,
    scale: 1 - stackIndex * 0.012,
    opacity: 1,
  };
}

function mapQueueChannel(channel: string | null): HqQueueChannel {
  const allowed: HqQueueChannel[] = ["Gmail", "Slack", "Notion", "Memory", "Stripe"];
  if (channel && allowed.includes(channel as HqQueueChannel)) {
    return channel as HqQueueChannel;
  }
  return "Memory";
}

function formatEta(vm: PlayCardViewModel): string {
  if (vm.ageMinutes != null) {
    return `${vm.ageMinutes}m ago`;
  }
  return "Ready to review";
}

function formatRecipient(vm: PlayCardViewModel): string {
  if (!vm.targetLabel) return "Ready to review";
  return `${vm.targetPrefix} ${vm.targetLabel}`;
}

/** Salt → connector(s) — the clearest signal for which apps this play touches. */
function ConnectionStack({
  channel,
  channels,
}: {
  channel: HqQueueChannel;
  channels?: HqQueueChannel[];
}) {
  const stack = channels?.length ? channels : [channel];
  const label = stack.map((key) => HQ_QUEUE_CHANNEL[key].label).join(" · ");

  return (
    <span
      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-2xl border border-border/60 bg-muted/50 py-1 pl-1.5 pr-3"
      title={`Salt → ${label}`}
      aria-label={`Connects through ${label}`}
    >
      <span className="flex -space-x-1.5">
        <span className="grid size-6 place-items-center overflow-hidden rounded-full bg-card ring-1 ring-border/70">
          <img src={SALT_ICON_PATH} alt="" className="size-3.5" />
        </span>
        {stack.map((key) => {
          const { Icon, color } = HQ_QUEUE_CHANNEL[key];
          return (
            <span
              key={key}
              className="grid size-6 place-items-center rounded-full bg-card ring-1 ring-border/70"
            >
              <Icon className="size-3.5" style={{ color }} aria-hidden />
            </span>
          );
        })}
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Via
        </span>
        <span className="truncate text-[12px] font-semibold tracking-tight text-foreground">
          {label}
        </span>
      </span>
    </span>
  );
}

function collapsedDetail(vm: PlayCardViewModel): string | null {
  if (vm.kind === "acting" && vm.acting) {
    return `Draft to ${vm.acting.recipientLabel}`;
  }
  if (vm.kind === "question" && vm.question) {
    return vm.question.prompt;
  }
  return vm.preview;
}

function sourceActionLabel(channel: HqQueueChannel): string {
  return channel === "Gmail" ? "Open live Gmail" : `Open in ${HQ_QUEUE_CHANNEL[channel].label}`;
}

type PlayQueueProps = {
  initialCards: PlayCardViewModel[];
  /** Preformatted time saved this week (e.g. "2h 40m"), null when nothing yet. */
  timeSavedLabel?: string | null;
};

export function PlayQueue({ initialCards, timeSavedLabel = null }: PlayQueueProps) {
  const router = useRouter();
  const [cards] = useState(initialCards);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [combo, setCombo] = useState(0);
  const [comboKey, setComboKey] = useState(0);
  const comboTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const approveBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const draftRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const { burst, fireCelebration } = useApproveCelebration();
  const reduceMotion = useReducedMotion();

  const visible = cards.filter((card) => {
    const status = statuses[card.id];
    return status !== "approved" && status !== "skipped";
  });

  const draftTextFor = useCallback(
    (vm: PlayCardViewModel) =>
      drafts[vm.id] ?? vm.acting?.draftBody.join("\n\n") ?? vm.preview ?? "",
    [drafts],
  );

  const handlePrimary = useCallback(
    (vm: PlayCardViewModel, source?: HTMLElement | null) => {
      const action = vm.primaryAction;
      if (!action) return;

      setStatuses((current) => (current[vm.id] ? current : { ...current, [vm.id]: "approved" }));
      if (source) fireCelebration(source);

      if (action.kind === "approve_send" && vm.provenance.source === "play_run") {
        const { playRunId } = vm.provenance;
        const draftText = drafts[vm.id];
        void (async () => {
          if (draftText !== undefined) {
            const editResult = await editPlayRun(playRunId, draftText);
            if (!editResult.ok) {
              toast.error(editResult.message ?? "Could not save draft edits");
              setStatuses((current) => {
                const next = { ...current };
                delete next[vm.id];
                return next;
              });
              return;
            }
          }
          await approvePlayRun(playRunId);
          router.refresh();
        })();
        setCombo((current) => {
          const next = current + 1;
          setComboKey((key) => key + 1);
          return next;
        });
        if (comboTimer.current) clearTimeout(comboTimer.current);
        comboTimer.current = setTimeout(() => setCombo(0), 4000);
        toast.success(action.label, {
          description: "Salt will finish this on Plays after you confirm.",
        });
        return;
      }

      if (action.kind === "apply_memory" && vm.provenance.source === "play_run") {
        const { playRunId } = vm.provenance;
        void (async () => {
          const result = await applyKeeperPlayRun(playRunId);
          if (result.success) {
            toast.success(action.label);
            router.refresh();
          } else {
            toast.error(result.error ?? "Could not apply");
            setStatuses((current) => {
              const next = { ...current };
              delete next[vm.id];
              return next;
            });
          }
        })();
        return;
      }

      if (vm.provenance.source === "finding") {
        const { findingId, apply } = vm.provenance;
        void (async () => {
          const result =
            apply === "keeper_profile"
              ? await applyKeeperProfileFinding(findingId)
              : apply === "memory_plan"
                ? await applyMemoryPlan(findingId)
                : await actOnFinding(findingId);
          if (result.success) {
            setCombo((current) => {
              const next = current + 1;
              setComboKey((key) => key + 1);
              return next;
            });
            if (comboTimer.current) clearTimeout(comboTimer.current);
            comboTimer.current = setTimeout(() => setCombo(0), 4000);
            toast.success(action.label);
            router.refresh();
          } else {
            toast.error(result.error ?? "Could not apply");
            setStatuses((current) => {
              const next = { ...current };
              delete next[vm.id];
              return next;
            });
          }
        })();
      }
    },
    [drafts, fireCelebration, router],
  );

  const act = useCallback(
    (vm: PlayCardViewModel, action: "approved" | "skipped", source?: HTMLElement | null) => {
      if (action === "approved") {
        handlePrimary(vm, source);
        return;
      }

      setStatuses((current) => (current[vm.id] ? current : { ...current, [vm.id]: action }));

      if (vm.provenance.source === "play_run") {
        const { playRunId } = vm.provenance;
        void dismissPlayRun(playRunId).then(() => router.refresh());
      } else {
        const { findingId } = vm.provenance;
        void dismissFinding(findingId).then(() => router.refresh());
      }

      setCombo(0);
      toast("Dismissed", { description: "Removed from your HQ queue." });
    },
    [handlePrimary, router],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (!visible.length) return;

      const current = visible[0];
      const key = event.key.toLowerCase();

      if (key === "a" || key === "enter") {
        event.preventDefault();
        act(current, "approved", approveBtnRefs.current.get(current.id) ?? null);
      } else if (key === "d" || key === "x" || key === "backspace") {
        event.preventDefault();
        act(current, "skipped");
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, act]);

  const totalDone = Object.keys(statuses).length;
  const stackedCards = visible.slice(0, STACK_MAX_VISIBLE);
  const stackDepth = Math.max(0, stackedCards.length - 1);
  const stackMinHeight = STACK_CARD_HEIGHT + stackDepth * STACK_PEEK_Y;

  const emptyVariants: Variants = reduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 16, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
      };

  return (
    <section id="play-queue" aria-labelledby="play-queue-heading" className="relative space-y-3">
      <AnimatePresence>
        {combo >= 2 && (
          <motion.div
            key={comboKey}
            initial={{ opacity: 0, y: 16, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.9 }}
            transition={{ ...SPRING, stiffness: 500, damping: 24 }}
            className="pointer-events-none fixed left-1/2 top-24 z-50 -translate-x-1/2"
          >
            <div className="surface-aurora flex items-center gap-2 rounded-full px-5 py-2.5 shadow-[var(--shadow-lift)]">
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="relative z-10"
              >
                <Flame className="size-4 text-white" />
              </motion.div>
              <span className="relative z-10 font-display text-xl tabular-nums text-white">
                {combo}x
              </span>
              <span className="relative z-10 text-[11px] font-semibold uppercase tracking-widest text-white/90">
                on fire
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex items-end justify-between px-1">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="size-[18px]" strokeWidth={1.75} />
              <h3 id="play-queue-heading" className="font-semibold tracking-tight">
                Needs you
              </h3>
            </div>
            <AnimatePresence>
              {combo > 0 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.6, x: -6 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={SPRING}
                  className="chip [&]:bg-flame/15 [&]:text-flame"
                >
                  <Zap className="size-3" /> {combo}x combo
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 text-[11px] text-muted-foreground md:flex">
            <span className="kbd">A</span> approve
            <span className="kbd ml-2">D</span> dismiss
          </div>
          <Link
            href="/plays?filter=needs_you"
            aria-label="Open Needs You plays"
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground tabular-nums"
          >
            {totalDone}/{cards.length} <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </header>

      <div
        className="relative w-full"
        style={{
          minHeight: visible.length === 0 ? undefined : stackMinHeight,
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {stackedCards.map((card, stackIndex) => {
            const isTop = stackIndex === 0;
            const status = statuses[card.id];
            const exitX = status === "approved" ? 120 : status === "skipped" ? -120 : 0;
            const player = getHqQueuePlayer(card.playerSlug);
            const PlayerIcon = player.icon;
            const stackStyle = stackMotion(stackIndex);
            const channel = mapQueueChannel(card.channel);
            const channelMeta = HQ_QUEUE_CHANNEL[channel];
            const ChannelIcon = channelMeta.Icon;
            const primaryLabel = card.primaryAction?.label ?? "Approve";
            const detail = collapsedDetail(card);
            const whatLine = `${primaryLabel} in ${channelMeta.label}`;
            const whyLine = card.triggerLabel ?? detail ?? card.preview ?? "Ready for review.";
            const draftText = draftTextFor(card);
            const playbookLine = card.playbookName
              ? `${card.playbookName} Play`
              : `${card.sectionLabel ?? player.name} Play`;

            return (
              <motion.article
                key={card.id}
                layout
                initial={
                  reduceMotion
                    ? stackStyle
                    : { ...stackStyle, opacity: 0, y: stackStyle.y + 16, scale: stackStyle.scale * 0.98 }
                }
                animate={stackStyle}
                exit={
                  isTop
                    ? {
                        opacity: 0,
                        x: exitX,
                        y: stackStyle.y - 8,
                        scale: 0.92,
                        filter: "blur(4px)",
                        transition: { duration: 0.35, ease: APPLE_EASE },
                      }
                    : { opacity: 0, transition: { duration: 0.2 } }
                }
                transition={SOFT_SPRING}
                whileHover={
                  isTop && !reduceMotion ? { y: stackStyle.y - 2, scale: stackStyle.scale } : undefined
                }
                className={cn(
                  "group absolute inset-x-0 top-0 flex flex-col overflow-hidden rounded-3xl border border-border/50 bg-card shadow-[var(--shadow-card)] transition-colors",
                  isTop
                    ? "hover:border-border/80 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                    : "pointer-events-none"
                )}
                style={{
                  height: STACK_CARD_HEIGHT,
                  zIndex: STACK_MAX_VISIBLE - stackIndex,
                  transformOrigin: "top center",
                  transition: "box-shadow 300ms cubic-bezier(0.32,0.72,0,1)",
                }}
                aria-hidden={!isTop}
              >
                <div className="flex shrink-0 items-center gap-3 bg-card p-4 lg:px-5">
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-2xl",
                      HQ_QUEUE_TONE_SOFT[player.tone]
                    )}
                  >
                    <PlayerIcon className="size-4" strokeWidth={2} />
                  </span>

                  <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
                    <p className="w-full min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      <span className="text-foreground/80">{playbookLine}</span>
                    </p>

                    <h3 className="line-clamp-1 text-[18px] font-semibold leading-tight tracking-tight text-foreground">
                      {whatLine}
                    </h3>

                    {(card.subject || card.targetLabel) && (
                      <p className="line-clamp-1 text-[13px] leading-relaxed text-foreground/75">
                        <span className="font-medium text-foreground">{card.subject}</span>
                        {card.targetLabel && (
                          <span className="text-muted-foreground">
                            {" "}
                            · {card.targetPrefix} {card.targetLabel}
                          </span>
                        )}
                      </p>
                    )}

                    {typeof card.ageMinutes === "number" && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[10px] text-muted-foreground/70">
                          <Clock className="size-3" /> {formatEta(card)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <div className="inline-flex items-center gap-1 rounded-2xl border border-border/50 bg-muted/60 p-1">
                      <IconActionButton
                        label="Dismiss"
                        shortcut="D"
                        onClick={() => act(card, "skipped")}
                      >
                        <X className="size-[18px]" strokeWidth={1.75} />
                      </IconActionButton>
                      <IconActionButton
                        label="Edit with Salt"
                        shortcut="E"
                        onClick={() => draftRefs.current.get(card.id)?.focus()}
                      >
                        <Edit3 className="size-[18px]" strokeWidth={1.75} />
                      </IconActionButton>
                      <motion.button
                        type="button"
                        ref={(el) => {
                          if (!isTop) return;
                          if (el) approveBtnRefs.current.set(card.id, el);
                          else approveBtnRefs.current.delete(card.id);
                        }}
                        onClick={(event) => act(card, "approved", event.currentTarget)}
                        whileHover={
                          isTop && !reduceMotion ? { scale: 1.02, y: -1 } : undefined
                        }
                        whileTap={isTop && !reduceMotion ? { scale: 0.97 } : undefined}
                        transition={SPRING}
                        className="surface-aurora relative ml-1 inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-xl px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-lift)] transition"
                        aria-label={primaryLabel}
                        tabIndex={isTop ? 0 : -1}
                      >
                        <Sparkles className="relative z-10 size-4" strokeWidth={2.25} />
                        <span className="relative z-10 max-w-[10rem] truncate sm:max-w-none">
                          {primaryLabel}
                        </span>
                      </motion.button>
                    </div>
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col justify-between space-y-3 border-t border-border/40 bg-muted/40 px-4 pb-4 pt-4 lg:px-5">
                  <div className="grid min-h-0 flex-1 gap-3 sm:grid-cols-[minmax(0,1.45fr)_minmax(220px,0.8fr)]">
                    <div className="flex min-h-0 flex-col rounded-2xl border border-border/40 bg-card/90 px-3 py-2.5">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                          Draft to send
                        </p>
                        <span className="text-[10px] font-medium text-muted-foreground">
                          Editable
                        </span>
                      </div>
                      <textarea
                        ref={(el) => {
                          if (!isTop) return;
                          if (el) draftRefs.current.set(card.id, el);
                          else draftRefs.current.delete(card.id);
                        }}
                        value={draftText}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [card.id]: event.target.value,
                          }))
                        }
                        tabIndex={isTop ? 0 : -1}
                        rows={4}
                        className="min-h-0 flex-1 resize-none bg-transparent text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50"
                        placeholder="Salt will place the draft here before sending."
                        aria-label="Draft to send"
                      />
                    </div>
                    <div className="flex min-h-0 flex-col justify-between rounded-2xl border border-border/40 bg-card/90 px-3 py-2.5">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                          Why now
                        </p>
                        <p className="mt-1 line-clamp-4 text-[13px] leading-relaxed text-foreground/80">
                          {whyLine}
                        </p>
                      </div>
                      <p className="mt-3 text-[11px] font-medium text-muted-foreground">
                        Salt will {primaryLabel.toLowerCase()} through {channelMeta.label}.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {card.sourceUrl ? (
                      <a
                        href={card.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        tabIndex={isTop ? 0 : -1}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/50 bg-card px-2.5 text-[11px] font-semibold text-foreground transition hover:border-sky/30 hover:bg-sky/5 hover:text-sky"
                      >
                        <ChannelIcon
                          className="size-3.5"
                          style={{ color: channelMeta.color }}
                          aria-hidden
                        />
                        {sourceActionLabel(channel)}
                        <ArrowUpRight className="size-3" />
                      </a>
                    ) : (
                      <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 text-[11px] font-semibold text-foreground shadow-sm">
                        <ChannelIcon
                          className="size-3.5"
                          style={{ color: channelMeta.color }}
                          aria-hidden
                        />
                        Sends via {channelMeta.label}
                      </span>
                    )}
                    <Link
                      href="/plays"
                      tabIndex={isTop ? 0 : -1}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
                    >
                      Open in Plays <ArrowUpRight className="size-3" />
                    </Link>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>

        {visible.length === 0 && (
          <motion.div
            variants={emptyVariants}
            initial="initial"
            animate="animate"
            transition={{ ...SOFT_SPRING, delay: 0.2 }}
            className="glass-card rounded-3xl p-10 text-center"
          >
            <motion.div
              initial={{ scale: 0.4, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...SPRING, delay: 0.35 }}
              className="surface-aurora mx-auto mb-4 grid size-14 place-items-center rounded-2xl"
            >
              <Sparkles className="relative z-10 size-6 text-white" strokeWidth={2.25} />
            </motion.div>
            <p className="font-display text-2xl tracking-tight">Inbox zero, hours back.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {timeSavedLabel
                ? `${timeSavedLabel} back this week · Salt's drafting tomorrow's queue.`
                : "Queue clear on Plays — Salt's drafting tomorrow's queue."}
            </p>
            <Link
              href="/plays"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground underline hover:no-underline"
            >
              Open Plays queue <ArrowUpRight className="size-3.5" />
            </Link>
          </motion.div>
        )}
      </div>

      <ApproveCelebration burst={burst} />
    </section>
  );
}

function IconActionButton({
  children,
  label,
  shortcut,
  ref,
  ...rest
}: {
  children: React.ReactNode;
  label: string;
  shortcut: string;
  ref?: Ref<HTMLButtonElement>;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={`${label} (${shortcut})`}
      {...rest}
      className="group relative inline-flex size-9 items-center justify-center rounded-xl text-foreground/70 transition-all hover:bg-muted hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
      <span className="pointer-events-none absolute -bottom-0.5 right-0.5 grid size-3.5 place-items-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        {shortcut}
      </span>
    </button>
  );
}
