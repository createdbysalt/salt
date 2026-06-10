"use client";

import { useCallback, useEffect, useRef, useState, type Ref } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
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
  type HqQueuePlay,
} from "@/app/_lib/demo/hq-play-queue";
import type { HqQueuePlayView } from "@/app/_features/plays/types";
import {
  approvePlayRun,
  dismissPlayRun,
} from "@/app/_features/plays/actions";
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
const STACK_CARD_MIN_HEIGHT = 280;

type Status = "idle" | "approved" | "skipped";

function stackMotion(stackIndex: number) {
  return {
    y: stackIndex * STACK_PEEK_Y,
    scale: 1 - stackIndex * 0.012,
    opacity: 1,
  };
}

function SourceStack({
  channel,
  channels,
}: {
  channel: HqQueueChannel;
  channels?: HqQueueChannel[];
}) {
  const stack = channels ?? [channel];
  const label = stack.map((key) => HQ_QUEUE_CHANNEL[key].label).join(" · ");

  return (
    <span
      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border/50 bg-muted/70 pl-1 pr-2.5"
      title={`Salt → ${label}`}
    >
      <span className="flex -space-x-1.5">
        <span className="grid size-5 place-items-center overflow-hidden rounded-full bg-card ring-1 ring-border/60">
          <img src={SALT_ICON_PATH} alt="Salt" className="size-3.5" />
        </span>
        {stack.map((key) => {
          const { Icon, color } = HQ_QUEUE_CHANNEL[key];
          return (
            <span
              key={key}
              className="grid size-5 place-items-center rounded-full bg-card ring-1 ring-border/60"
            >
              <Icon className="size-3" style={{ color }} />
            </span>
          );
        })}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
    </span>
  );
}

export function PlayQueue({ initialPlays }: { initialPlays: HqQueuePlayView[] }) {
  const [plays] = useState<HqQueuePlay[]>(initialPlays);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [combo, setCombo] = useState(0);
  const [comboKey, setComboKey] = useState(0);
  const comboTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const approveBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const { burst, fireCelebration } = useApproveCelebration();
  const reduceMotion = useReducedMotion();

  const visible = plays.filter((play) => {
    const status = statuses[play.id];
    return status !== "approved" && status !== "skipped";
  });

  const act = useCallback(
    (id: string, action: "approved" | "skipped", source?: HTMLElement | null) => {
    setStatuses((current) => (current[id] ? current : { ...current, [id]: action }));

    if (action === "approved") {
      void approvePlayRun(id);
      fireCelebration(source ?? approveBtnRefs.current.get(id) ?? null);
      setCombo((current) => {
        const next = current + 1;
        setComboKey((key) => key + 1);
        return next;
      });
      if (comboTimer.current) clearTimeout(comboTimer.current);
      comboTimer.current = setTimeout(() => setCombo(0), 4000);
      toast.success("Approved", {
        description: "Salt will finish this on Plays after you confirm.",
      });
      return;
    }

    void dismissPlayRun(id);
    setCombo(0);
    toast("Dismissed", { description: "Removed from your HQ queue." });
  },
    [fireCelebration]
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
        act(current.id, "approved", approveBtnRefs.current.get(current.id) ?? null);
      } else if (key === "d" || key === "x" || key === "backspace") {
        event.preventDefault();
        act(current.id, "skipped");
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, act]);

  const totalDone = Object.keys(statuses).length;
  const stackedPlays = visible.slice(0, STACK_MAX_VISIBLE);
  const stackDepth = Math.max(0, stackedPlays.length - 1);
  const hiddenQueueCount = Math.max(0, visible.length - STACK_MAX_VISIBLE);

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
            <span id="play-queue-heading" className="chip flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-flame" strokeWidth={2.5} />
              Plays ready
            </span>
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
            <span className="kbd ml-2">S</span> schedule
            <span className="kbd ml-2">D</span> dismiss
          </div>
          <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground tabular-nums">
            {totalDone}/{plays.length} <ArrowUpRight className="size-3.5" />
          </span>
        </div>
      </header>

      <div
        className="relative w-full"
        style={{
          minHeight:
            visible.length === 0
              ? undefined
              : STACK_CARD_MIN_HEIGHT + stackDepth * STACK_PEEK_Y,
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {stackedPlays.map((play, stackIndex) => {
            const isTop = stackIndex === 0;
            const status = statuses[play.id];
            const exitX = status === "approved" ? 120 : status === "skipped" ? -120 : 0;
            const player = getHqQueuePlayer(play.playerId);
            const PlayerIcon = player.icon;
            const stackStyle = stackMotion(stackIndex);

            return (
              <motion.article
                key={play.id}
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
                  "group absolute inset-x-0 top-0 overflow-hidden rounded-3xl border border-border/50 bg-card shadow-[var(--shadow-card)]",
                  isTop ? "focus-card p-5 lg:p-6" : "pointer-events-none"
                )}
                style={{
                  zIndex: STACK_MAX_VISIBLE - stackIndex,
                  transformOrigin: "top center",
                  transition: "box-shadow 300ms cubic-bezier(0.32,0.72,0,1)",
                  ...(isTop ? { minHeight: STACK_CARD_MIN_HEIGHT } : undefined),
                }}
                aria-hidden={!isTop}
              >
                {isTop ? (
                  <>
                    <div className="relative mb-4 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn(
                            "grid size-9 shrink-0 place-items-center rounded-2xl",
                            HQ_QUEUE_TONE_SOFT[player.tone]
                          )}
                        >
                          <PlayerIcon className="size-[16px]" strokeWidth={2} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 text-[13px] leading-tight">
                            <span className="font-semibold tracking-tight">{player.name}</span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-muted-foreground">{play.playbook}</span>
                          </div>
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="size-3" /> {play.eta}
                          </p>
                        </div>
                      </div>
                      <SourceStack channel={play.channel} channels={play.channels} />
                    </div>

                    <div className="relative">
                      <h3 className="text-[17px] font-semibold leading-snug tracking-tight">
                        {play.title}
                      </h3>
                      <p className="mt-1.5 text-[12px] text-muted-foreground">To {play.recipient}</p>
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {play.preview}
                      </p>
                    </div>

                    <footer className="relative mt-5 flex flex-wrap items-center justify-between gap-3">
                      <Link
                        href="/plays"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
                      >
                        Open in Plays <ArrowUpRight className="size-3" />
                      </Link>
                      <div className="ml-auto inline-flex items-center gap-1 rounded-2xl border border-border/50 bg-muted/60 p-1">
                        <IconActionButton
                          label="Schedule"
                          shortcut="S"
                          onClick={() =>
                            toast("Scheduled", {
                              description: `${play.title} — pick a time on Plays`,
                            })
                          }
                        >
                          <Calendar className="size-[18px]" strokeWidth={1.75} />
                        </IconActionButton>
                        <IconActionButton
                          label="Dismiss"
                          shortcut="D"
                          onClick={() => act(play.id, "skipped")}
                        >
                          <X className="size-[18px]" strokeWidth={1.75} />
                        </IconActionButton>
                        <IconActionButton
                          label="Edit"
                          shortcut="E"
                          onClick={() =>
                            toast("Edit with Salt", {
                              description: "Opens in Plays for full editing",
                            })
                          }
                        >
                          <Edit3 className="size-[18px]" strokeWidth={1.75} />
                        </IconActionButton>
                        <motion.button
                          type="button"
                          ref={(el) => {
                            if (el) approveBtnRefs.current.set(play.id, el);
                            else approveBtnRefs.current.delete(play.id);
                          }}
                          onClick={(event) => act(play.id, "approved", event.currentTarget)}
                          whileHover={!reduceMotion ? { scale: 1.02, y: -1 } : undefined}
                          whileTap={!reduceMotion ? { scale: 0.96 } : undefined}
                          transition={SPRING}
                          className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-xl bg-foreground px-4 text-[13px] font-semibold text-background transition hover:opacity-90"
                          aria-label="Approve and send"
                        >
                          <CheckCircle2 className="size-4" strokeWidth={2} />
                          Approve &amp; send
                        </motion.button>
                      </div>
                    </footer>
                  </>
                ) : (
                  <div
                    className="bg-card"
                    style={{ minHeight: STACK_CARD_MIN_HEIGHT }}
                    aria-hidden
                  />
                )}
              </motion.article>
            );
          })}
        </AnimatePresence>

        {hiddenQueueCount > 0 && (
          <p className="absolute bottom-0 left-1 px-1 text-[11px] font-medium text-muted-foreground">
            +{hiddenQueueCount} more in queue
          </p>
        )}

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
            <p className="font-display text-2xl tracking-tight">Inbox zero, momentum max.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Streak +1 · Salt&apos;s drafting tomorrow&apos;s queue.
            </p>
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
