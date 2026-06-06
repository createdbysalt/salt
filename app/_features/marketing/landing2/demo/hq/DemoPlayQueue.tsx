import { useEffect, useRef, useState, useCallback, type Ref } from "react";
import { CheckCircle2, X, Sparkles, ArrowUpRight, Clock, Flame, Zap, Brain, Calendar, Edit3 } from "lucide-react";
import type { IconType } from "react-icons";
import { SiGmail, SiSlack, SiNotion, SiStripe } from "react-icons/si";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@repo/utils";
import { playerById, TONE_SOFT, type PlayerId } from "../demo-plays-data";

const SALT_ICON_PATH = "/landing/salt-icon.svg";

type Play = {
  id: string;
  playerId: PlayerId;
  playbook: string;
  title: string;
  preview: string;
  recipient: string;
  channel: ChannelKey;
  channels?: ChannelKey[];
  eta: string;
  confidence: number;
};

type ChannelKey = "Gmail" | "Slack" | "Notion" | "Memory" | "Stripe";

const CHANNEL: Record<ChannelKey, { Icon: IconType | typeof Brain; color: string; label: string }> = {
  Gmail: { Icon: SiGmail, color: "#EA4335", label: "Gmail" },
  Slack: { Icon: SiSlack, color: "#4A154B", label: "Slack" },
  Notion: { Icon: SiNotion, color: "currentColor", label: "Notion" },
  Memory: { Icon: Brain, color: "#6B7280", label: "Memory" },
  Stripe: { Icon: SiStripe, color: "#635BFF", label: "Stripe" },
};

const initialPlays: Play[] = [
  {
    id: "1",
    playerId: "billing",
    playbook: "Invoice nudge",
    title: "Send payment reminder to Brightline Legal",
    preview: "Hi Marcus, just a gentle nudge on invoice #2026-05-018 for $4,200, due today. Happy to hop on a quick call if it's easier...",
    recipient: "Marcus Hale · Brightline Legal",
    channel: "Gmail",
    eta: "12s to send",
    confidence: 96,
  },
  {
    id: "2",
    playerId: "follow-up",
    playbook: "Check-in",
    title: "Send kickoff recap to Cedar Studio",
    preview: "Quick recap of yesterday's scope call — next steps, timeline, and the add-on structure Ari asked about...",
    recipient: "Ari Chen · Cedar Studio",
    channel: "Gmail",
    eta: "8s to send",
    confidence: 94,
  },
  {
    id: "3",
    playerId: "scope",
    playbook: "Scope drift",
    title: "Reply to Cedar's scope request",
    preview: "Two extra landing pages would be a separate engagement. Drafted a $3,800 add-on with a 10-day timeline...",
    recipient: "Ari Chen · Cedar Studio",
    channel: "Gmail",
    channels: ["Stripe", "Gmail"],
    eta: "30s to review",
    confidence: 92,
  },
  {
    id: "4",
    playerId: "brief",
    playbook: "Project kickoff",
    title: "Prep brief for Atlas Coaching kickoff",
    preview: "One-pager ready: discovery summary, three risks, recommended agenda. Theo signed last week's contract, opening with the goals he flagged...",
    recipient: "Theo Grant · Atlas Coaching",
    channel: "Notion",
    eta: "45s to read",
    confidence: 89,
  },
];

type Status = "idle" | "approved" | "skipped";

export type PlayQueueDemoState = {
  approvedIds: string[];
  burstId: string | null;
  billingApproveRef?: Ref<HTMLButtonElement>;
  middleApproveRef?: Ref<HTMLButtonElement>;
  scopeEditRef?: Ref<HTMLButtonElement>;
  /** Mobile landing demo — hide keyboard hints so header stays chip + counter only. */
  compactHeader?: boolean;
};

// Apple's signature easing
const APPLE_EASE = [0.32, 0.72, 0, 1] as const;
const SPRING = { type: "spring" as const, stiffness: 380, damping: 32, mass: 0.8 };
const SOFT_SPRING = { type: "spring" as const, stiffness: 260, damping: 28, mass: 0.9 };

function SourceStack({
  channel,
  channels,
}: {
  channel: ChannelKey;
  channels?: ChannelKey[];
}) {
  const stack = channels ?? [channel];
  const label = stack.map((key) => CHANNEL[key].label).join(" · ");

  return (
    <span
      className="inline-flex items-center gap-1.5 h-7 pl-1 pr-2.5 rounded-full bg-muted/70 border border-border/50"
      title={`Salt → ${label}`}
    >
      <span className="flex -space-x-1.5">
        <span className="size-5 rounded-full bg-card grid place-items-center ring-1 ring-border/60 overflow-hidden">
          <img src={SALT_ICON_PATH} alt="Salt" className="size-3.5" />
        </span>
        {stack.map((key) => {
          const { Icon, color } = CHANNEL[key];
          return (
            <span
              key={key}
              className="size-5 rounded-full bg-card grid place-items-center ring-1 ring-border/60"
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

export function PlayQueue({
  readOnly = false,
  demo,
}: {
  readOnly?: boolean;
  demo?: PlayQueueDemoState;
}) {
  const [plays] = useState(initialPlays);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [focusIdx, setFocusIdx] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboKey, setComboKey] = useState(0);
  const [burstId, setBurstId] = useState<string | null>(null);
  const isDemo = demo !== undefined;
  const comboTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();

  const playStatus = (id: string): Status | undefined => {
    if (demo?.approvedIds.includes(id)) return "approved";
    return statuses[id];
  };

  const visible = plays.filter((p) => {
    const status = playStatus(p.id);
    return status !== "approved" && status !== "skipped";
  });

  const activeBurstId = demo?.burstId ?? burstId;

  const act = useCallback(
    (id: string, action: "approved" | "skipped") => {
      setStatuses((s) => (s[id] ? s : { ...s, [id]: action }));
      if (action === "approved") {
        setBurstId(id);
        setTimeout(() => setBurstId((b) => (b === id ? null : b)), 700);
        setCombo((c) => {
          const next = c + 1;
          setComboKey((k) => k + 1);
          return next;
        });
        if (comboTimer.current) clearTimeout(comboTimer.current);
        comboTimer.current = setTimeout(() => setCombo(0), 4000);
      } else {
        setCombo(0);
      }
    },
    [],
  );

  useEffect(() => {
    if (readOnly || isDemo) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!visible.length) return;
      const current = visible[Math.min(focusIdx, visible.length - 1)];
      const key = e.key.toLowerCase();
      if (key === "a" || key === "enter") {
        e.preventDefault();
        act(current.id, "approved");
      } else if (key === "d" || key === "x" || key === "backspace") {
        e.preventDefault();
        act(current.id, "skipped");
      } else if (key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusIdx((i) => Math.min(i + 1, visible.length - 1));
      } else if (key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusIdx((i) => Math.max(i - 1, 0));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, focusIdx, act, readOnly, isDemo]);

  useEffect(() => {
    if (focusIdx > visible.length - 1) setFocusIdx(Math.max(0, visible.length - 1));
  }, [visible.length, focusIdx]);

  const totalDone = Object.keys(statuses).length;

  return (
    <section className="space-y-3 relative">
      {/* Combo overlay */}
      <AnimatePresence>
        {!readOnly && combo >= 2 && (
          <motion.div
            key={comboKey}
            initial={{ opacity: 0, y: 16, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.9 }}
            transition={{ ...SPRING, stiffness: 500, damping: 24 }}
            className="pointer-events-none fixed top-24 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="surface-aurora rounded-full px-5 py-2.5 shadow-[var(--shadow-lift)] flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="relative z-10"
              >
                <Flame className="size-4 text-white" />
              </motion.div>
              <span className="relative z-10 font-display text-xl text-white tabular-nums">{combo}x</span>
              <span className="relative z-10 text-[11px] uppercase tracking-widest text-white/90 font-semibold">on fire</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex items-end justify-between px-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="chip flex items-center gap-1.5">
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
          {!demo?.compactHeader && (
            <div
              className={
                isDemo
                  ? "flex items-center gap-1.5 text-[11px] text-muted-foreground"
                  : "hidden items-center gap-1.5 text-[11px] text-muted-foreground md:flex"
              }
            >
              <span className="kbd">A</span> approve
              <span className="kbd ml-2">S</span> schedule
              <span className="kbd ml-2">D</span> dismiss
              <span className="kbd ml-2">↑↓</span> nav
            </div>
          )}
          {readOnly ? (
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              {totalDone}/{plays.length} <ArrowUpRight className="size-3.5" />
            </span>
          ) : (
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              {totalDone}/{plays.length} <ArrowUpRight className="size-3.5" />
            </span>
          )}
        </div>
      </header>

      <motion.div layout className="space-y-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((p, idxInVisible) => {
            const isFocused = idxInVisible === Math.min(focusIdx, visible.length - 1);
            const status = playStatus(p.id);
            const exitX = status === "approved" ? 80 : status === "skipped" ? -80 : 0;
            const player = playerById(p.playerId);
            const PlayerIcon = player.icon;
            return (
              <motion.article
                key={p.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{
                  opacity: 0,
                  x: exitX,
                  scale: 0.94,
                  filter: "blur(4px)",
                  transition: { duration: 0.35, ease: APPLE_EASE },
                }}
                transition={SOFT_SPRING}
                onMouseEnter={readOnly ? undefined : () => setFocusIdx(idxInVisible)}
                whileHover={reduceMotion ? undefined : { y: -2 }}
                className={cn(
                  "group glass-card relative overflow-hidden rounded-3xl",
                  isDemo ? "p-6" : "p-5 lg:p-6",
                  isFocused && "focus-card",
                )}
                style={{ transition: "box-shadow 300ms cubic-bezier(0.32,0.72,0,1)" }}
              >
                {/* Approve burst */}
                <AnimatePresence>
                  {activeBurstId === p.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.3 }}
                      animate={{ opacity: [0, 0.6, 0], scale: [0.3, 1.8, 2.4] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.7, ease: APPLE_EASE }}
                      className="pointer-events-none absolute inset-0 grid place-items-center"
                    >
                      <div className="size-24 rounded-full bg-[oklch(0.78_0.18_145)]/40 blur-2xl" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Header: Player attribution + source stack */}
                <div className="flex items-start justify-between gap-3 mb-4 relative">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn("size-9 rounded-2xl grid place-items-center shrink-0", TONE_SOFT[player.tone])}>
                      <PlayerIcon className="size-[16px]" strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap text-[13px] leading-tight">
                        <span className="font-semibold tracking-tight">{player.name}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">{p.playbook}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="size-3" /> {p.eta}
                      </p>
                    </div>
                  </div>
                  <SourceStack channel={p.channel} channels={p.channels} />
                </div>

                <div className="relative">
                  <h3 className="text-[17px] font-semibold tracking-tight leading-snug">{p.title}</h3>
                  <p className="mt-1.5 text-[12px] text-muted-foreground">To {p.recipient}</p>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2">{p.preview}</p>
                </div>

                {/* Footer actions — match Plays focus card */}
                <footer className="mt-5 flex items-center justify-between gap-3 flex-wrap relative">
                  {readOnly ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                      Open in Plays <ArrowUpRight className="size-3" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                      Open in Plays <ArrowUpRight className="size-3" />
                    </span>
                  )}
                  <div className="ml-auto inline-flex items-center gap-1 p-1 rounded-2xl bg-muted/60 border border-border/50">
                    <IconActionButton
                      label="Schedule"
                      shortcut="S"
                      disabled={readOnly}
                      onClick={undefined}
                    >
                      <Calendar className="size-[18px]" strokeWidth={1.75} />
                    </IconActionButton>
                    <IconActionButton
                      label="Dismiss"
                      shortcut="D"
                      disabled={readOnly}
                      onClick={readOnly ? undefined : () => act(p.id, "skipped")}
                    >
                      <X className="size-[18px]" strokeWidth={1.75} />
                    </IconActionButton>
                    <IconActionButton
                      ref={p.playerId === "scope" ? demo?.scopeEditRef : undefined}
                      label="Edit"
                      shortcut="E"
                      disabled={readOnly || isDemo}
                      onClick={undefined}
                    >
                      <Edit3 className="size-[18px]" strokeWidth={1.75} />
                    </IconActionButton>
                    <motion.button
                      ref={
                        p.id === "1"
                          ? demo?.billingApproveRef
                          : p.id === "2"
                            ? demo?.middleApproveRef
                            : undefined
                      }
                      type="button"
                      disabled={readOnly || isDemo}
                      onClick={readOnly || isDemo ? undefined : () => act(p.id, "approved")}
                      whileHover={readOnly || reduceMotion ? undefined : { scale: 1.02, y: -1 }}
                      whileTap={readOnly ? undefined : { scale: 0.96 }}
                      transition={SPRING}
                      className="h-9 px-4 ml-1 inline-flex items-center gap-1.5 rounded-xl text-[13px] font-semibold bg-foreground text-background hover:opacity-90 transition disabled:opacity-100"
                      aria-label="Approve and send"
                    >
                      <CheckCircle2 className="size-4" strokeWidth={2} />
                      Approve &amp; send
                    </motion.button>
                  </div>
                </footer>

              </motion.article>
            );
          })}
        </AnimatePresence>

        {visible.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...SOFT_SPRING, delay: 0.2 }}
            className="glass-card rounded-3xl p-10 text-center"
          >
            <motion.div
              initial={{ scale: 0.4, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...SPRING, delay: 0.35 }}
              className="mx-auto size-14 rounded-2xl surface-aurora grid place-items-center mb-4"
            >
              <Sparkles className="size-6 text-white relative z-10" strokeWidth={2.25} />
            </motion.div>
            <p className="font-display text-2xl tracking-tight">Inbox zero, momentum max.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Streak +1 · Salt's drafting tomorrow's queue.
            </p>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}

const IconActionButton = ({
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
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={`${label} (${shortcut})`}
      {...rest}
      className="group relative size-9 inline-flex items-center justify-center rounded-xl text-foreground/70 hover:text-foreground hover:bg-muted active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
    >
      {children}
      <span className="pointer-events-none absolute -bottom-0.5 right-0.5 grid place-items-center size-3.5 rounded-full bg-muted text-[9px] font-bold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        {shortcut}
      </span>
    </button>
  );
};
