import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import {
  CheckCircle2,
  X,
  Calendar,
  Edit3,
  Sparkles,
  Clock,
  ChevronLeft,
  ChevronRight,
  Play,
  ArrowRight,
  Pause,
  Undo2,
  ChevronDown,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@repo/utils";
import { toast } from "sonner";
import { SchedulePicker, type ScheduleChoice } from "./SchedulePicker";
import { useBodyScrollLock } from "@/app/_lib/hooks/use-body-scroll-lock";
import {
  ApproveCelebration,
  useApproveCelebration,
} from "@/app/_features/plays/components/ApproveCelebration";
import { playerById, TONE_SOFT, type QueuePlay } from "@/app/_lib/demo/plays-demo-data";
import {
  approvePlayRun,
  dismissPlayRun,
} from "@/app/_features/plays/actions";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;
const SPRING = { type: "spring" as const, stiffness: 320, damping: 30, mass: 0.85 };
const CARD_SPRING = { type: "spring" as const, stiffness: 260, damping: 28, mass: 0.9 };

type Props = {
  onEditPlay?: (play: QueuePlay) => void;
  initialQueue: QueuePlay[];
};

function ageLabel(min: number) {
  if (min < 60) return `${min}m ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const d = Math.round(hrs / 24);
  return `${d}d ago`;
}

type Status = "idle" | "approved" | "dismissed" | "scheduled";

type ActionLog = {
  id: string;
  playId: string;
  prev: Status;
  next: Status;
  prevIdx: number;
};

export function PlaysListView({ onEditPlay, initialQueue }: Props) {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewIdx, setReviewIdx] = useState(0);
  const { burst, fireCelebration } = useApproveCelebration();

  const visible = useMemo(
    () => initialQueue.filter((p) => (statuses[p.id] ?? "idle") === "idle"),
    [initialQueue, statuses],
  );

  const getDraft = useCallback(
    (p: QueuePlay) => drafts[p.id] ?? p.draftBody,
    [drafts]
  );

  const updateDraft = (id: string, text: string) => {
    const paras = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
    setDrafts((d) => ({ ...d, [id]: paras.length ? paras : [text] }));
  };

  const startReview = () => {
    if (!visible.length) return;
    setReviewIdx(0);
    setReviewOpen(true);
  };

  useBodyScrollLock(reviewOpen);

  return (
    <div className="space-y-5">
      {/* Top status + review button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-4 text-flame" strokeWidth={2.25} />
            <span className="font-medium text-foreground">{visible.length}</span> plays ready to review
          </span>
        </div>
        <button
          onClick={startReview}
          disabled={!visible.length}
          className="group h-10 pl-3 pr-4 inline-flex items-center gap-1.5 rounded-full text-[13px] font-semibold bg-foreground text-background hover:opacity-90 transition shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Play className="size-3.5" strokeWidth={2.25} />
          Review {visible.length} {visible.length === 1 ? "play" : "plays"}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.25} />
        </button>
      </div>

      {/* List */}
      <motion.div layout className="space-y-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((p) => (
            <PlayCard
              key={p.id}
              play={p}
              draft={getDraft(p)}
              isEditing={editingId === p.id}
              onStartEdit={() => setEditingId(p.id)}
              onStopEdit={() => setEditingId(null)}
              onDraftChange={(text) => updateDraft(p.id, text)}
              onApprove={(source) => {
                fireCelebration(source);
                setStatuses((s) => ({ ...s, [p.id]: "approved" }));
                void approvePlayRun(p.id);
                toast("Approved & sending");
              }}
              onDismiss={() => {
                setStatuses((s) => ({ ...s, [p.id]: "dismissed" }));
                void dismissPlayRun(p.id);
                toast("Dismissed");
              }}
              onEditWithSalt={() => onEditPlay?.(p)}
            />
          ))}
        </AnimatePresence>

        {visible.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-3xl p-10 text-center"
          >
            <div className="mx-auto size-12 rounded-2xl bg-flame/10 grid place-items-center mb-3">
              <Sparkles className="size-5 text-flame" strokeWidth={2.25} />
            </div>
            <p className="font-display text-2xl tracking-tight">Queue clear.</p>
            <p className="text-sm text-muted-foreground mt-1">Salt's drafting the next batch.</p>
          </motion.div>
        )}
      </motion.div>

      {/* Fullscreen review stage — portaled to body so it sits above sidebar/topbar */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {reviewOpen && (
              <ReviewStage
                key="review-stage"
                allPlays={initialQueue}
                statuses={statuses}
                setStatuses={setStatuses}
                drafts={drafts}
                updateDraft={updateDraft}
                getDraft={getDraft}
                index={reviewIdx}
                setIndex={setReviewIdx}
                onClose={() => setReviewOpen(false)}
                onEditWithSalt={(p) => onEditPlay?.(p)}
                fireCelebration={fireCelebration}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}

      <ApproveCelebration burst={burst} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* List card                                                          */
/* ------------------------------------------------------------------ */

function PlayCard({
  play,
  draft,
  isEditing,
  onStartEdit,
  onStopEdit,
  onDraftChange,
  onApprove,
  onDismiss,
  onEditWithSalt,
}: {
  play: QueuePlay;
  draft: string[];
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onDraftChange: (text: string) => void;
  onApprove: (source: HTMLElement) => void;
  onDismiss: () => void;
  onEditWithSalt: () => void;
}) {
  const player = playerById(play.playerId);
  const PlayerIcon = player.icon;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.96, filter: "blur(4px)", transition: { duration: 0.3, ease: APPLE_EASE } }}
      transition={SPRING}
      className="group glass-card rounded-3xl p-5 lg:p-6 relative overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className={cn("size-10 rounded-2xl grid place-items-center shrink-0", TONE_SOFT[player.tone])}>
            <PlayerIcon className="size-[18px]" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap text-[13px] leading-tight">
              <span className="font-semibold tracking-tight">{player.name}</span>
              {play.playbook && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{play.playbook}</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Clock className="size-3" /> {ageLabel(play.ageMinutes)}
              <span className="text-muted-foreground/60">·</span>
              <span>{play.source}</span>
              {typeof play.confidence === "number" && (
                <>
                  <span className="text-muted-foreground/60">·</span>
                  <span className="tabular-nums">{play.confidence}% confidence</span>
                </>
              )}
            </p>
          </div>
        </div>
        <span className="chip">{play.channel}</span>
      </div>

      <div>
        <h3 className="text-[17px] font-semibold tracking-tight leading-snug">{play.subject}</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">To {play.recipient}</p>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{play.summary}</p>
      </div>

      <div className="mt-4 rounded-2xl border border-border/60 bg-card/60 p-4 lg:p-5">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
            Draft to {play.recipient}
          </p>
          {!isEditing ? (
            <button
              onClick={onStartEdit}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition"
            >
              <Edit3 className="size-3" /> Edit
            </button>
          ) : (
            <button
              onClick={onStopEdit}
              className="text-[11px] font-semibold text-foreground inline-flex items-center gap-1"
            >
              Done
            </button>
          )}
        </div>
        {isEditing ? (
          <textarea
            autoFocus
            value={draft.join("\n\n")}
            onChange={(e) => onDraftChange(e.target.value)}
            onBlur={onStopEdit}
            className="w-full bg-transparent outline-none text-[14px] leading-relaxed text-foreground/90 resize-none min-h-[140px]"
            rows={Math.max(6, draft.join("\n\n").split("\n").length + 1)}
          />
        ) : (
          <div
            onClick={onStartEdit}
            className="space-y-3 text-[14px] leading-relaxed text-foreground/90 cursor-text"
            title="Click to edit"
          >
            {draft.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}
      </div>

      <footer className="mt-5 flex items-center justify-end gap-2 flex-wrap">
        <button
          onClick={() => toast("Scheduled", { description: "Pick a time" })}
          className="h-9 px-3 inline-flex items-center gap-1.5 rounded-xl text-[13px] font-medium hover:bg-muted transition text-muted-foreground"
        >
          <Calendar className="size-4" strokeWidth={1.75} /> Schedule
        </button>
        <button
          onClick={onDismiss}
          className="h-9 px-3 inline-flex items-center gap-1.5 rounded-xl text-[13px] font-medium hover:bg-muted transition text-muted-foreground"
        >
          <X className="size-4" strokeWidth={1.75} /> Dismiss
        </button>
        <button
          onClick={onEditWithSalt}
          className="h-9 px-3 inline-flex items-center gap-1.5 rounded-xl text-[13px] font-medium border border-border bg-card hover:bg-muted transition"
        >
          <Sparkles className="size-4 text-flame" strokeWidth={2} /> Edit with Salt
        </button>
        <button
          type="button"
          onClick={(event) => onApprove(event.currentTarget)}
          className="h-9 px-4 inline-flex items-center gap-1.5 rounded-xl text-[13px] font-semibold bg-foreground text-background hover:opacity-90 transition"
        >
          <CheckCircle2 className="size-4" strokeWidth={2} /> Approve &amp; send
        </button>
      </footer>
    </motion.article>
  );
}

/* ================================================================== */
/* REVIEW STAGE — fullscreen "Spotify Wrapped" experience             */
/* ================================================================== */

type StageProps = {
  allPlays: QueuePlay[];
  statuses: Record<string, Status>;
  setStatuses: React.Dispatch<React.SetStateAction<Record<string, Status>>>;
  drafts: Record<string, string[]>;
  updateDraft: (id: string, text: string) => void;
  getDraft: (p: QueuePlay) => string[];
  index: number;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  onClose: () => void;
  onEditWithSalt: (p: QueuePlay) => void;
  fireCelebration: (source: HTMLElement | null) => void;
};

function ReviewStage({
  allPlays,
  statuses,
  setStatuses,
  getDraft,
  updateDraft,
  index,
  setIndex,
  onClose,
  onEditWithSalt,
  fireCelebration,
}: StageProps) {
  const reduce = useReducedMotion();
  const approveBtnRef = useRef<HTMLButtonElement | null>(null);

  // Lock the cohort to whatever was pending when review started
  const cohortRef = useRef<QueuePlay[] | null>(null);
  if (cohortRef.current === null) {
    cohortRef.current = allPlays.filter((p) => (statuses[p.id] ?? "idle") === "idle");
  }
  const cohort = cohortRef.current;
  const total = cohort.length;

  const currentPlay = cohort[Math.min(index, total - 1)];
  const cohortStatuses = cohort.map((p) => statuses[p.id] ?? "idle");
  const decidedCount = cohortStatuses.filter((s) => s !== "idle").length;
  const isFinished = decidedCount === total;

  // Streak (consecutive approvals up to current decided)
  const streak = useMemo(() => {
    let n = 0;
    for (let i = decidedCount - 1; i >= 0; i--) {
      if (cohortStatuses[i] === "approved") n++;
      else break;
    }
    return n;
  }, [cohortStatuses, decidedCount]);

  const [undoStack, setUndoStack] = useState<ActionLog[]>([]);
  const [editing, setEditing] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [flashHalfway, setFlashHalfway] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  // Reset per-card state when card changes
  useEffect(() => {
    setEditing(false);
    setShowReasoning(false);
    setScheduleOpen(false);
  }, [currentPlay?.id]);

  // Halfway beat
  useEffect(() => {
    if (total > 2 && decidedCount === Math.floor(total / 2)) {
      setFlashHalfway(true);
      const t = setTimeout(() => setFlashHalfway(false), 1600);
      return () => clearTimeout(t);
    }
  }, [decidedCount, total]);

  const playSound = useCallback((kind: "tick" | "chime") => {
    if (!soundOn) return;
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = kind === "chime" ? 880 : 520;
      o.type = "sine";
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (kind === "chime" ? 0.35 : 0.12));
      o.start();
      o.stop(ctx.currentTime + 0.4);
    } catch {}
  }, [soundOn]);

  const advance = useCallback(() => {
    setDirection(1);
    setIndex((i) => Math.min(i + 1, total));
  }, [setIndex, total]);

  const decide = useCallback(
    (status: Exclude<Status, "idle">, source?: HTMLElement | null) => {
      if (!currentPlay) return;
      const prev = statuses[currentPlay.id] ?? "idle";
      setStatuses((s) => ({ ...s, [currentPlay.id]: status }));
      setUndoStack((u) => [...u, { id: `${Date.now()}`, playId: currentPlay.id, prev, next: status, prevIdx: index }]);
      if (status === "approved") {
        void approvePlayRun(currentPlay.id);
        fireCelebration(source ?? approveBtnRef.current);
      } else if (status === "dismissed") {
        void dismissPlayRun(currentPlay.id);
      }
      playSound(status === "approved" ? "chime" : "tick");
      window.setTimeout(() => advance(), 240);
    },
    [currentPlay, statuses, setStatuses, index, playSound, advance, fireCelebration]
  );

  const undo = useCallback(() => {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    setUndoStack((u) => u.slice(0, -1));
    setStatuses((s) => ({ ...s, [last.playId]: last.prev }));
    setDirection(-1);
    setIndex(last.prevIdx);
    toast("Undone");
  }, [undoStack, setStatuses, setIndex]);

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.isContentEditable)) {
        if (e.key === "Escape") (t as HTMLElement).blur();
        return;
      }
      const k = e.key.toLowerCase();
      if (e.key === "Escape") { onClose(); return; }
      if ((e.metaKey || e.ctrlKey) && k === "z") { e.preventDefault(); undo(); return; }
      if (isFinished) return;
      if (k === "a" || e.key === "Enter") { e.preventDefault(); decide("approved", approveBtnRef.current); }
      else if (k === "d" || k === "x" || e.key === "Backspace") { e.preventDefault(); decide("dismissed"); }
      else if (e.key === "ArrowRight" || k === "j") { e.preventDefault(); setDirection(1); setIndex((i) => Math.min(i + 1, total - 1)); }
      else if (e.key === "ArrowLeft" || k === "k") { e.preventDefault(); setDirection(-1); setIndex((i) => Math.max(0, i - 1)); }
      else if (k === "e" && currentPlay) { e.preventDefault(); setEditing(true); }
      else if (k === "s" && currentPlay) { e.preventDefault(); onEditWithSalt(currentPlay); }
      else if (k === "t") { e.preventDefault(); setScheduleOpen((o) => !o); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, undo, onClose, isFinished, total, setIndex, currentPlay, onEditWithSalt]);

  const approvedCount = cohortStatuses.filter((s) => s === "approved").length;
  const dismissedCount = cohortStatuses.filter((s) => s === "dismissed").length;
  const scheduledCount = cohortStatuses.filter((s) => s === "scheduled").length;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Review plays"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: APPLE_EASE }}
      className="fixed inset-0 z-[9999] flex h-dvh flex-col overflow-hidden bg-[oklch(0.12_0.02_280)]"
    >
      {/* Ambient wash — contained inside opaque stage (no mix-blend; shell must not bleed through) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-35"
          style={{
            background:
              "radial-gradient(50vmax 50vmax at 12% 18%, color-mix(in oklab, var(--flame) 45%, transparent), transparent 62%), radial-gradient(45vmax 45vmax at 88% 22%, color-mix(in oklab, var(--blush) 40%, transparent), transparent 62%), radial-gradient(55vmax 55vmax at 78% 92%, color-mix(in oklab, var(--violet) 45%, transparent), transparent 65%), radial-gradient(50vmax 50vmax at 18% 88%, color-mix(in oklab, var(--sky) 40%, transparent), transparent 62%)",
          }}
        />
        {!reduce && !paused && (
          <>
            <div
              className="absolute -top-1/4 -left-1/4 size-[70vmin] rounded-full blur-[140px] opacity-25"
              style={{ background: "radial-gradient(circle, var(--flame), transparent 70%)", animation: "queue-aurora-drift 22s ease-in-out infinite" }}
            />
            <div
              className="absolute -bottom-1/4 -right-1/4 size-[80vmin] rounded-full blur-[160px] opacity-20"
              style={{ background: "radial-gradient(circle, var(--violet), transparent 70%)", animation: "queue-aurora-drift-2 28s ease-in-out infinite" }}
            />
          </>
        )}
        <div
          className="absolute inset-0 opacity-[0.12] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          }}
        />
      </div>

      {/* Top chrome */}
      <div className="relative z-20 px-4 lg:px-8 pt-4 lg:pt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="size-7 rounded-full surface-aurora grid place-items-center shrink-0">
              <Sparkles className="size-3.5 text-white relative z-10" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/60 font-semibold">Review mode</p>
              <p className="text-[13px] font-semibold tracking-tight tabular-nums leading-tight text-white">
                {Math.min(index + 1, total)} <span className="text-white/50 font-normal">of</span> {total}
              </p>
            </div>
            <AnimatePresence>
              {streak >= 2 && !isFinished && (
                <motion.span
                  key={`streak-${streak}`}
                  initial={{ opacity: 0, scale: 0.7, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={SPRING}
                  className="ml-2 inline-flex items-center gap-1 rounded-full bg-flame/15 text-flame border border-flame/30 px-2 py-0.5 text-[11px] font-semibold"
                >
                  <Sparkles className="size-3" strokeWidth={2.5} /> {streak} in a row
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-full text-[12px] font-medium text-white bg-white/10 border border-white/20 hover:bg-white/15 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Undo2 className="size-3.5" strokeWidth={2} /> Undo
            </button>
            <button
              onClick={() => setSoundOn((s) => !s)}
              aria-label={soundOn ? "Sound on" : "Sound off"}
              className="size-9 grid place-items-center rounded-full text-white bg-white/10 border border-white/20 hover:bg-white/15 transition"
            >
              {soundOn ? <Volume2 className="size-4" strokeWidth={2} /> : <VolumeX className="size-4 text-white/60" strokeWidth={2} />}
            </button>
            <button
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Resume ambient" : "Pause ambient"}
              className="size-9 grid place-items-center rounded-full text-white bg-white/10 border border-white/20 hover:bg-white/15 transition"
            >
              {paused ? <Play className="size-4" strokeWidth={2} /> : <Pause className="size-4" strokeWidth={2} />}
            </button>
            <button
              onClick={onClose}
              aria-label="Exit review"
              className="size-9 grid place-items-center rounded-full text-white bg-white/10 border border-white/20 hover:bg-white/15 transition"
            >
              <X className="size-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Progress rail */}
        <div className="mt-3 lg:mt-4 max-w-[1100px] mx-auto">
          <div className="flex items-center gap-1">
            {cohort.map((p, i) => {
              const st = cohortStatuses[i];
              const active = i === index && !isFinished;
              return (
                <div key={p.id} className="flex-1 h-1.5 relative">
                  <div className="absolute inset-0 rounded-full bg-white/10" />
                  <motion.div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full",
                      st === "approved" && "bg-flame",
                      st === "dismissed" && "bg-white/35",
                      st === "scheduled" && "bg-sky",
                      st === "idle" && active && "bg-white/50",
                    )}
                    initial={false}
                    animate={{ width: st !== "idle" ? "100%" : active ? "12%" : "0%" }}
                    transition={{ duration: 0.45, ease: APPLE_EASE }}
                  />
                </div>
              );
            })}
          </div>
          <AnimatePresence>
            {flashHalfway && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-center mt-2 text-[10px] uppercase tracking-[0.2em] text-flame font-semibold"
              >
                Halfway
              </motion.p>
            )}
            {!flashHalfway && !isFinished && index === total - 1 && total > 1 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center mt-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold"
              >
                Last one
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Stage body */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-4 lg:px-8 pb-36">
        {/* Prev / Next edges */}
        {!isFinished && (
          <>
            <button
              onClick={() => { setDirection(-1); setIndex((i) => Math.max(0, i - 1)); }}
              disabled={index === 0}
              aria-label="Previous play"
              className="hidden md:grid absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 size-12 place-items-center rounded-full text-white bg-white/10 border border-white/20 hover:bg-white/15 transition disabled:opacity-30 disabled:cursor-not-allowed z-20"
            >
              <ChevronLeft className="size-5" strokeWidth={2} />
            </button>
            <button
              onClick={() => { setDirection(1); setIndex((i) => Math.min(i + 1, total - 1)); }}
              disabled={index >= total - 1}
              aria-label="Next play"
              className="hidden md:grid absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 size-12 place-items-center rounded-full text-white bg-white/10 border border-white/20 hover:bg-white/15 transition disabled:opacity-30 disabled:cursor-not-allowed z-20"
            >
              <ChevronRight className="size-5" strokeWidth={2} />
            </button>
          </>
        )}

        {/* Deck */}
        <div className="w-full max-w-[480px] relative" style={{ perspective: 1400 }}>
          {/* Peek cards behind */}
          {!isFinished &&
            [2, 1].map((offset) => {
              const peek = cohort[index + offset];
              if (!peek) return null;
              return (
                <div
                  key={`peek-${peek.id}`}
                  aria-hidden
                  className="absolute inset-x-0 top-0 mx-auto h-[min(70vh,640px)] rounded-[28px] border border-white/15 bg-white/[0.06] backdrop-blur-xl shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)]"
                  style={{
                    transform: `translateY(${offset * 14}px) scale(${1 - offset * 0.04}) rotate(${offset === 1 ? -1.6 : 2.2}deg)`,
                    opacity: 0.55 - (offset - 1) * 0.22,
                    zIndex: -offset,
                  }}
                />
              );
            })}

          <AnimatePresence mode="wait" custom={direction}>
            {!isFinished && currentPlay ? (
              <HeroCard
                key={currentPlay.id}
                play={currentPlay}
                draft={getDraft(currentPlay)}
                editing={editing}
                setEditing={setEditing}
                showReasoning={showReasoning}
                setShowReasoning={setShowReasoning}
                onDraftChange={(text) => updateDraft(currentPlay.id, text)}
                direction={direction}
                cardIndex={index}
                total={total}
                onApprove={() => decide("approved", approveBtnRef.current)}
                onDismiss={() => decide("dismissed")}
              />
            ) : (
              <FinishScreen
                key="finish"
                approved={approvedCount}
                dismissed={dismissedCount}
                scheduled={scheduledCount}
                onExit={onClose}
                onUndo={undoStack.length ? undo : undefined}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom controls */}
      {!isFinished && currentPlay && (
        <div className="absolute inset-x-0 bottom-0 z-20 px-4 lg:px-8 pb-5 lg:pb-7">
          <div className="max-w-[640px] mx-auto flex flex-col items-center gap-4">

            {/* Secondary tools — quiet text row */}
            <div className="flex items-center gap-1 text-white/80">
              <button
                onClick={() => setEditing(true)}
                className="h-8 px-3 inline-flex items-center gap-1.5 rounded-full text-[12px] font-medium hover:bg-white/10 transition"
                title="Edit inline (E)"
              >
                <Edit3 className="size-3.5" strokeWidth={2} /> Edit draft
              </button>
              <span className="text-white/25">·</span>
              <button
                onClick={() => onEditWithSalt(currentPlay)}
                className="h-8 px-3 inline-flex items-center gap-1.5 rounded-full text-[12px] font-medium hover:bg-white/10 transition"
                title="Ask Salt to revise (S)"
              >
                <Sparkles className="size-3.5 text-flame" strokeWidth={2.25} /> Ask Salt to revise
              </button>
              <span className="text-white/25">·</span>
              <SchedulePicker
                open={scheduleOpen}
                onOpenChange={setScheduleOpen}
                onSchedule={(choice: ScheduleChoice) => {
                  setScheduleOpen(false);
                  decide("scheduled");
                  toast("Scheduled", { description: choice.hint });
                }}
              >
                <button
                  className="h-8 px-3 inline-flex items-center gap-1.5 rounded-full text-[12px] font-medium hover:bg-white/10 transition"
                  title="Schedule (T)"
                >
                  <Calendar className="size-3.5" strokeWidth={2} /> Schedule for later
                </button>
              </SchedulePicker>
            </div>

            {/* Primary decisions — two clear actions */}
            <div className="flex items-center justify-center gap-3 w-full">
              <button
                onClick={() => decide("dismissed")}
                className="group flex-1 max-w-[220px] h-14 inline-flex items-center justify-center gap-2 rounded-full bg-white/10 border border-white/20 text-white font-semibold text-sm hover:bg-white/15 transition backdrop-blur-md"
                title="Pass on this play (D)"
              >
                <X className="size-5" strokeWidth={2.25} />
                Pass
              </button>
              <button
                ref={approveBtnRef}
                type="button"
                onClick={() => decide("approved", approveBtnRef.current)}
                className="group flex-1 max-w-[280px] h-14 inline-flex items-center justify-center gap-2 rounded-full bg-flame text-white font-semibold text-sm hover:brightness-110 transition shadow-[0_16px_48px_-12px_color-mix(in_oklab,var(--flame)_70%,transparent)]"
                title="Approve & send (A or Enter)"
              >
                <CheckCircle2 className="size-5 transition-transform group-hover:scale-110" strokeWidth={2.25} />
                Approve & send
              </button>
            </div>

            {/* Keyboard legend */}
            <div className="hidden md:flex items-center justify-center gap-2 text-[10.5px] text-white/55">
              <kbd className="kbd bg-white/10 border-white/15 text-white/85">A</kbd> approve
              <kbd className="kbd bg-white/10 border-white/15 text-white/85">D</kbd> pass
              <kbd className="kbd bg-white/10 border-white/15 text-white/85">E</kbd> edit
              <kbd className="kbd bg-white/10 border-white/15 text-white/85">S</kbd> ask salt
              <kbd className="kbd bg-white/10 border-white/15 text-white/85">←→</kbd> nav
              <kbd className="kbd bg-white/10 border-white/15 text-white/85">⌘Z</kbd> undo
              <kbd className="kbd bg-white/10 border-white/15 text-white/85">Esc</kbd> exit
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero card (within the stage)                                       */
/* ------------------------------------------------------------------ */

function HeroCard({
  play,
  draft,
  editing,
  setEditing,
  showReasoning,
  setShowReasoning,
  onDraftChange,
  direction,
  cardIndex,
  total,
  onApprove,
  onDismiss,
}: {
  play: QueuePlay;
  draft: string[];
  editing: boolean;
  setEditing: (b: boolean) => void;
  showReasoning: boolean;
  setShowReasoning: (b: boolean) => void;
  onDraftChange: (text: string) => void;
  direction: 1 | -1;
  cardIndex: number;
  total: number;
  onApprove: () => void;
  onDismiss: () => void;
}) {
  const player = playerById(play.playerId);
  const PlayerIcon = player.icon;
  const reduce = useReducedMotion();

  // Tone-based accent for the suit and corner glow
  const toneVar =
    player.tone === "flame" ? "var(--flame)"
      : player.tone === "sky" ? "var(--sky)"
      : player.tone === "violet" ? "var(--violet)"
      : player.tone === "ink" ? "var(--foreground)"
      : "var(--muted-foreground)";

  // Drag mechanics
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-14, 0, 14]);
  const approveOpacity = useTransform(x, [40, 160], [0, 1]);
  const dismissOpacity = useTransform(x, [-160, -40], [1, 0]);
  const tiltShadow = useTransform(
    x,
    [-200, 0, 200],
    [
      "0 30px 80px -30px color-mix(in oklab, var(--destructive) 55%, transparent)",
      "0 40px 90px -30px rgba(0,0,0,0.55)",
      "0 30px 80px -30px color-mix(in oklab, var(--flame) 70%, transparent)",
    ],
  );

  function handleDragEnd(_: unknown, info: PanInfo) {
    const threshold = 140;
    const velocity = info.velocity.x;
    if (info.offset.x > threshold || velocity > 600) {
      onApprove();
    } else if (info.offset.x < -threshold || velocity < -600) {
      onDismiss();
    }
  }

  const indexLabel = `${String(cardIndex + 1).padStart(2, "0")}/${String(total).padStart(2, "0")}`;

  return (
    <motion.article
      custom={direction}
      initial={{ opacity: 0, y: 24, scale: 0.95, rotate: direction === 1 ? 4 : -4 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      exit={{
        opacity: 0,
        x: direction === 1 ? 420 : -420,
        y: -40,
        rotate: direction === 1 ? 18 : -18,
        transition: { duration: 0.45, ease: APPLE_EASE },
      }}
      transition={CARD_SPRING}
      drag={reduce ? false : "x"}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.35}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: "grabbing" }}
      style={{ x, rotate, boxShadow: tiltShadow, cursor: "grab" }}
      className="relative z-10 mx-auto flex h-[min(70vh,640px)] w-full max-w-[480px] flex-col rounded-[28px] overflow-hidden select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Card face — frosted cream with chromatic edge */}
      <div className="absolute inset-0 bg-[color-mix(in_oklab,var(--card)_92%,white)]" />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, ${toneVar} 22%, transparent), transparent 55%), radial-gradient(120% 80% at 100% 100%, color-mix(in oklab, var(--flame) 14%, transparent), transparent 55%)`,
        }}
      />
      {/* Inner ring */}
      <div className="pointer-events-none absolute inset-[6px] rounded-[22px] ring-1 ring-foreground/8" />
      {/* Outer hairline */}
      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-foreground/10" />

      {/* Decision tint overlays driven by drag */}
      <motion.div
        style={{ opacity: approveOpacity }}
        className="pointer-events-none absolute inset-0 rounded-[28px]"
      >
        <div className="absolute inset-0 rounded-[28px]" style={{ background: "linear-gradient(270deg, color-mix(in oklab, var(--flame) 35%, transparent), transparent 55%)" }} />
        <div className="absolute top-6 right-6 text-flame font-display text-3xl tracking-tight rotate-12 border-2 border-flame/70 rounded-xl px-3 py-1 bg-white/70 backdrop-blur">
          SEND
        </div>
      </motion.div>
      <motion.div
        style={{ opacity: dismissOpacity }}
        className="pointer-events-none absolute inset-0 rounded-[28px]"
      >
        <div className="absolute inset-0 rounded-[28px]" style={{ background: "linear-gradient(90deg, color-mix(in oklab, var(--destructive) 30%, transparent), transparent 55%)" }} />
        <div className="absolute top-6 left-6 text-destructive font-display text-3xl tracking-tight -rotate-12 border-2 border-destructive/60 rounded-xl px-3 py-1 bg-white/70 backdrop-blur">
          PASS
        </div>
      </motion.div>

      {/* Corner index — top-left */}
      <div className="absolute top-5 left-5 flex flex-col items-center gap-1.5 leading-none">
        <span className="font-display text-[28px] tracking-tight tabular-nums text-foreground/85">{indexLabel.split("/")[0]}</span>
        <span
          className="size-9 rounded-full grid place-items-center"
          style={{ background: `color-mix(in oklab, ${toneVar} 18%, transparent)`, color: toneVar }}
        >
          <PlayerIcon className="size-[18px]" strokeWidth={2} />
        </span>
        <span className="text-[9px] uppercase tracking-[0.18em] font-semibold text-foreground/55">{player.monogram}</span>
      </div>

      {/* Corner index — bottom-right (mirrored) */}
      <div className="absolute bottom-5 right-5 flex flex-col items-center gap-1.5 leading-none rotate-180">
        <span className="font-display text-[28px] tracking-tight tabular-nums text-foreground/85">{indexLabel.split("/")[0]}</span>
        <span
          className="size-9 rounded-full grid place-items-center"
          style={{ background: `color-mix(in oklab, ${toneVar} 18%, transparent)`, color: toneVar }}
        >
          <PlayerIcon className="size-[18px]" strokeWidth={2} />
        </span>
        <span className="text-[9px] uppercase tracking-[0.18em] font-semibold text-foreground/55">{player.monogram}</span>
      </div>

      {/* Top meta — channel + index of total */}
      <div className="absolute top-5 right-5 flex flex-col items-end gap-1.5">
        <span className="chip bg-foreground text-background border-0">{play.channel}</span>
        <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-foreground/55 tabular-nums">{indexLabel}</span>
      </div>

      {/* Body — centered between corners */}
      <div className="relative h-full flex flex-col px-[52px] pt-[80px] pb-[80px]">
        {/* Player line */}
        <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-foreground/55 mb-3">
          {player.name} · {play.playbook ?? "Play"}
        </p>

        {/* Subject — the moment */}
        <h2 className="font-display text-[34px] lg:text-[40px] tracking-tight leading-[1.05] text-foreground">
          {play.subject}
        </h2>

        {/* Recipient */}
        <p className="mt-3 text-[12.5px] text-foreground/65">
          To <span className="font-semibold text-foreground/85">{play.recipient}</span>
          <span className="text-foreground/35"> · {ageLabel(play.ageMinutes)}</span>
          {typeof play.confidence === "number" && (
            <span className="text-foreground/35"> · {play.confidence}% confidence</span>
          )}
        </p>

        {/* Draft body — the meat */}
        <div className="mt-5 flex-1 min-h-0 rounded-2xl border border-foreground/8 bg-white/55 backdrop-blur-sm px-5 py-4 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-foreground/55 inline-flex items-center gap-1.5">
              <Sparkles className="size-3 text-flame" strokeWidth={2.5} /> Salt drafted this
            </p>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="text-[11px] font-medium text-foreground/60 hover:text-foreground inline-flex items-center gap-1"
              >
                <Edit3 className="size-3" /> Edit
              </button>
            ) : (
              <button onClick={() => setEditing(false)} className="text-[11px] font-semibold text-foreground">
                Done
              </button>
            )}
          </div>
          {editing ? (
            <textarea
              autoFocus
              value={draft.join("\n\n")}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  setEditing(false);
                }
              }}
              className="w-full flex-1 bg-transparent outline-none text-[13.5px] leading-relaxed text-foreground/90 resize-none"
            />
          ) : (
            <div
              onClick={() => setEditing(true)}
              className="space-y-2.5 text-[13.5px] leading-relaxed text-foreground/85 cursor-text overflow-y-auto pr-1"
              title="Click to edit"
            >
              {draft.map((para, i) => <p key={i}>{para}</p>)}
            </div>
          )}
        </div>

        {/* Reasoning toggle */}
        {(play.reasoning.length > 0 || play.context.length > 0) && (
          <div className="mt-3 shrink-0">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] font-semibold text-foreground/55 hover:text-foreground transition"
            >
              <ChevronDown className={cn("size-3 transition-transform", showReasoning && "rotate-180")} strokeWidth={2.5} />
              {showReasoning ? "Hide" : "Why this play"}
            </button>
            <AnimatePresence initial={false}>
              {showReasoning && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: APPLE_EASE }}
                  className="overflow-hidden"
                >
                  <ul className="mt-2 space-y-1">
                    {play.reasoning.slice(0, 3).map((r, i) => (
                      <li key={i} className="flex gap-2 text-[12px] text-foreground/75 leading-snug">
                        <span className="mt-1.5 size-1 rounded-full bg-flame shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.article>
  );
}

/* ------------------------------------------------------------------ */
/* Finish screen                                                      */
/* ------------------------------------------------------------------ */

function FinishScreen({
  approved,
  dismissed,
  scheduled,
  onExit,
  onUndo,
}: {
  approved: number;
  dismissed: number;
  scheduled: number;
  onExit: () => void;
  onUndo?: () => void;
}) {
  const minutesSaved = approved * 7 + scheduled * 4;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={CARD_SPRING}
      className="glass-card rounded-3xl p-8 lg:p-12 text-center shadow-[var(--shadow-lift)]"
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, ...CARD_SPRING }}
        className="mx-auto size-16 rounded-3xl surface-aurora grid place-items-center mb-5"
      >
        <Sparkles className="size-7 text-white relative z-10" strokeWidth={2.25} />
      </motion.div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-flame font-semibold">Queue clear</p>
      <h2 className="font-display text-4xl lg:text-5xl tracking-tight mt-2">Nice work.</h2>
      <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
        Salt is sending what you approved and will surface the next batch when there's something worth your attention.
      </p>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto">
        <Stat label="Approved" value={approved} tone="flame" />
        <Stat label="Scheduled" value={scheduled} tone="sky" />
        <Stat label="Dismissed" value={dismissed} tone="muted" />
        <Stat label="Minutes saved" value={`~${minutesSaved}`} tone="ink" />
      </div>

      <div className="mt-7 flex items-center justify-center gap-2">
        {onUndo && (
          <button
            onClick={onUndo}
            className="h-10 px-4 inline-flex items-center gap-1.5 rounded-full text-[13px] font-medium bg-card border border-border/60 hover:bg-muted transition"
          >
            <Undo2 className="size-4" strokeWidth={2} /> Undo last
          </button>
        )}
        <button
          onClick={onExit}
          className="h-10 px-5 inline-flex items-center gap-1.5 rounded-full text-[13px] font-semibold bg-foreground text-background hover:opacity-90 transition"
        >
          Done
        </button>
      </div>
    </motion.div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone: "flame" | "sky" | "muted" | "ink" }) {
  const toneClass = {
    flame: "text-flame",
    sky: "text-sky",
    muted: "text-muted-foreground",
    ink: "text-foreground",
  }[tone];
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
      <p className={cn("font-display text-2xl tracking-tight tabular-nums", toneClass)}>{value}</p>
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold mt-1">{label}</p>
    </div>
  );
}
