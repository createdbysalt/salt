"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  Flame,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import type { PlayCardViewModel } from "@/app/_features/plays/play-card/types";
import {
  approvePlayRun,
  applyMemoryCarePlayRun,
  dismissPlayRun,
  editPlayRun,
} from "@/app/_features/plays/actions";
import {
  actOnFinding,
  applyMemoryCareProfileFinding,
  applyMemoryPlan,
  dismissFinding,
} from "@/app/_features/capture/actions/intelligence-findings";
import {
  ApproveCelebration,
  useApproveCelebration,
} from "@/app/_features/plays/components/ApproveCelebration";
import { PlayCard } from "@/app/_features/plays/components/PlayCard/PlayCard";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;
const SPRING = { type: "spring" as const, stiffness: 380, damping: 32, mass: 0.8 };
const SOFT_SPRING = { type: "spring" as const, stiffness: 260, damping: 28, mass: 0.9 };
const STACK_PEEK_Y = 6;
const STACK_MAX_VISIBLE = 4;
/** Fallback face height until the top card has been measured. */
const STACK_CARD_HEIGHT = 260;

type Status = "idle" | "approved" | "skipped";

function stackMotion(stackIndex: number) {
  return {
    y: stackIndex * STACK_PEEK_Y,
    scale: 1 - stackIndex * 0.012,
    opacity: 1,
  };
}

function openAskSaltEdit(vm: PlayCardViewModel) {
  window.dispatchEvent(
    new CustomEvent("salt:open-ask-salt", {
      detail: {
        prompt: "Edit this Play before it sends — ",
        mode: "ask" as const,
        context: vm.askSalt,
        autoSubmit: false,
      },
    })
  );
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const [comboKey, setComboKey] = useState(0);
  const comboTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { burst, fireCelebration } = useApproveCelebration();
  const reduceMotion = useReducedMotion();

  const visible = cards.filter((card) => {
    const status = statuses[card.id];
    return status !== "approved" && status !== "skipped";
  });

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
          const approveResult = await approvePlayRun(playRunId);
          if (!approveResult.ok) {
            // Refused at admission (e.g. ENTITLEMENT_EXHAUSTED — bundle used
            // up). Undo the optimistic approval and surface the reason.
            toast.error(approveResult.message);
            setStatuses((current) => {
              const next = { ...current };
              delete next[vm.id];
              return next;
            });
            router.refresh();
            return;
          }
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
          router.refresh();
        })();
        return;
      }

      if (action.kind === "apply_memory" && vm.provenance.source === "play_run") {
        const { playRunId } = vm.provenance;
        void (async () => {
          const result = await applyMemoryCarePlayRun(playRunId);
          if (result.ok) {
            toast.success(action.label);
            router.refresh();
          } else {
            toast.error(result.message ?? "Could not apply");
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
            apply === "memory_care"
              ? await applyMemoryCareProfileFinding(findingId)
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
        act(current, "approved");
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

  // Measure the top card's real height so the silhouettes behind it and the
  // container reserve exactly that — otherwise behind-cards peek out below
  // (or get swallowed) whenever the top card deviates from the estimate.
  const [topCardHeight, setTopCardHeight] = useState<number>(STACK_CARD_HEIGHT);
  const topCardMeasureRef = useRef<HTMLDivElement | null>(null);
  const topCardId = stackedCards[0]?.id;

  useEffect(() => {
    const el = topCardMeasureRef.current;
    if (!el) return;
    const update = () => {
      if (el.offsetHeight > 0) setTopCardHeight(el.offsetHeight);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [topCardId]);

  const stackMinHeight = topCardHeight + stackDepth * STACK_PEEK_Y;

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
            const stackStyle = stackMotion(stackIndex);
            const cardDraft = (
              drafts[card.id] ??
              card.acting?.draftBody.join("\n\n") ??
              ""
            )
              .split(/\n{2,}/)
              .map((p) => p.trim())
              .filter(Boolean);

            return (
              <motion.div
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
                  "absolute inset-x-0 top-0",
                  !isTop && "pointer-events-none"
                )}
                style={{
                  zIndex: STACK_MAX_VISIBLE - stackIndex,
                  transformOrigin: "top center",
                }}
                aria-hidden={!isTop}
              >
                {isTop ? (
                  <div ref={topCardMeasureRef}>
                    <PlayCard
                      vm={card}
                      draft={cardDraft}
                      isEditing={editingId === card.id}
                      isPending={false}
                      flagged={false}
                      onStartEdit={() => setEditingId(card.id)}
                      onStopEdit={() => setEditingId(null)}
                      onDraftChange={(text) =>
                        setDrafts((current) => ({ ...current, [card.id]: text }))
                      }
                      onPrimary={(source) => act(card, "approved", source)}
                      onDismiss={() => act(card, "skipped")}
                      onFlag={() => {}}
                      onSchedule={() => {}}
                      onEditWithSalt={() => openAskSaltEdit(card)}
                      onAnswer={() => {}}
                    />
                  </div>
                ) : (
                  /* Deck shell — cards behind the top render as an empty card
                     silhouette matched to the top card's measured height so
                     the deck peeks evenly and no content bleeds past it. */
                  <div
                    className="rounded-[24px] border border-border/50 bg-card"
                    style={{ height: topCardHeight }}
                  />
                )}
              </motion.div>
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
