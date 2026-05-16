"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  Loader2,
  ArrowUp,
  X,
  Mail,
  UserPlus,
  Receipt,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  CornerDownLeft,
} from "lucide-react";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";

/**
 * "Ask SALT" — natural-language command bar.
 *
 * Triggered via Cmd+K or the ✨ icon in page headers.
 * User types intent → AI proposes a structured action → user confirms.
 *
 * Centered modal because the interaction needs focus (different
 * from the FAB which is a quick interrupt).
 */

type State =
  | { phase: "idle" }
  | { phase: "thinking"; prompt: string }
  | { phase: "preview"; prompt: string; result: PreviewResult }
  | { phase: "queued" };

type PreviewItem = {
  icon: typeof Mail;
  label: string;
  meta: string;
};

type PreviewResult = {
  title: string;
  subtitle: string;
  items: PreviewItem[];
};

const EXAMPLES = [
  "Draft a check-in for everyone quiet 30+ days",
  "Generate an invoice for Beta Inc for $3,500 Q2 work",
  "Schedule a 30-min sync with Mike next Tuesday afternoon",
  "Write a project update for Acme",
];

// Pre-baked AI response for demo storyline
const DEMO_PREVIEW: PreviewResult = {
  title: "I'll draft 4 quarterly check-ins",
  subtitle:
    "Personalized for each client using last meeting transcripts + project notes",
  items: [
    { icon: UserPlus, label: "Mike Hart · Beta Inc", meta: "35 days quiet" },
    { icon: UserPlus, label: "Jane Park · Helios Studio", meta: "61 days quiet" },
    {
      icon: UserPlus,
      label: "Marcus Webb · Northwind Co",
      meta: "92 days quiet",
    },
    {
      icon: RefreshCw,
      label: "Lisa Morgan · Vermilion Design",
      meta: "45 days quiet",
    },
  ],
};

const HIDDEN_PATHS = ["/signin", "/signout"];

export function AskSaltModal() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<State>({ phase: "idle" });
  const [input, setInput] = React.useState("");
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const shouldHide = HIDDEN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  // Cmd+K hotkey
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      if (modifier && e.key.toLowerCase() === "k" && !e.shiftKey) {
        e.preventDefault();
        if (!shouldHide) setOpen((o) => !o);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, shouldHide]);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!open) {
      // small delay so the close animation finishes before resetting
      const t = window.setTimeout(() => {
        setState({ phase: "idle" });
        setInput("");
      }, 200);
      return () => window.clearTimeout(t);
    } else {
      // Pick up a prefill prompt (e.g., from an insight's "Take action" button)
      try {
        const prefill = window.sessionStorage.getItem("askSaltPrefill");
        if (prefill) {
          setInput(prefill);
          window.sessionStorage.removeItem("askSaltPrefill");
        }
      } catch {
        // ignore
      }
      const t = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  // Click outside dismisses
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const t = window.setTimeout(() => {
      window.addEventListener("mousedown", handler);
    }, 100);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("mousedown", handler);
    };
  }, [open]);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setState({ phase: "thinking", prompt: input });
    await wait(1700);
    setState({ phase: "preview", prompt: input, result: DEMO_PREVIEW });
  };

  const handleAddToQueue = async () => {
    setState({ phase: "queued" });
    await wait(1200);
    setOpen(false);
  };

  if (!open || shouldHide) return null;

  return (
    <div
      role="dialog"
      aria-label="Ask SALT"
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 pointer-events-none"
    >
      {/* Backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 bg-foreground/15 backdrop-blur-[2px] pointer-events-auto animate-in fade-in duration-150"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "relative w-full max-w-2xl rounded-2xl border border-border bg-background shadow-2xl pointer-events-auto",
          "animate-in fade-in slide-in-from-top-3 duration-200"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="text-sm font-medium">Ask SALT</span>
            <span className="text-xs text-muted-foreground">
              · tell it what you want
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="text-muted-foreground/70 hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body — varies by state */}
        {state.phase === "idle" && (
          <IdleState
            input={input}
            setInput={setInput}
            inputRef={inputRef}
            onSubmit={handleSubmit}
          />
        )}

        {state.phase === "thinking" && <ThinkingState prompt={state.prompt} />}

        {state.phase === "preview" && (
          <PreviewState
            prompt={state.prompt}
            result={state.result}
            onAddToQueue={handleAddToQueue}
            onRefine={() => {
              setInput(state.prompt);
              setState({ phase: "idle" });
              window.setTimeout(() => inputRef.current?.focus(), 0);
            }}
          />
        )}

        {state.phase === "queued" && <QueuedState />}
      </div>
    </div>
  );
}

// ============================================================================
// STATES
// ============================================================================

function IdleState({
  input,
  setInput,
  inputRef,
  onSubmit,
}: {
  input: string;
  setInput: (s: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onSubmit: () => void;
}) {
  return (
    <>
      <div className="px-5 py-4">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What should SALT do? — e.g., draft a check-in for everyone quiet 30+ days"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          className={cn(
            "w-full resize-none bg-transparent border-0 px-0 py-0",
            "text-base leading-relaxed placeholder:text-muted-foreground/60",
            "focus:outline-none"
          )}
        />
      </div>

      <div className="px-5 pb-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70 mb-2">
          Examples
        </p>
        <div className="space-y-1">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInput(ex)}
              className={cn(
                "w-full text-left flex items-center gap-2 px-2.5 py-1.5",
                "text-xs text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-colors",
                "group"
              )}
            >
              <Sparkles className="size-3 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
              <span className="truncate">{ex}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2 border-t border-border/60 bg-muted/20">
        <span className="text-[10px] text-muted-foreground/70 px-2">
          ↵ to send · esc to close
        </span>
        <Button
          size="sm"
          onClick={onSubmit}
          disabled={!input.trim()}
          className="h-7 gap-1.5 text-xs"
        >
          <CornerDownLeft className="size-3" />
          Send
        </Button>
      </div>
    </>
  );
}

function ThinkingState({ prompt }: { prompt: string }) {
  return (
    <div className="px-5 py-6">
      <div className="bg-muted/40 px-3 py-2 text-sm leading-relaxed mb-4 line-clamp-2">
        {prompt}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="relative size-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="size-4 text-primary animate-pulse" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">Thinking…</p>
          <p className="text-xs text-muted-foreground">
            Resolving entities, pulling context
          </p>
        </div>
      </div>
    </div>
  );
}

function PreviewState({
  prompt,
  result,
  onAddToQueue,
  onRefine,
}: {
  prompt: string;
  result: PreviewResult;
  onAddToQueue: () => void;
  onRefine: () => void;
}) {
  const [revealed, setRevealed] = React.useState(0);

  React.useEffect(() => {
    if (revealed >= result.items.length) return;
    const t = window.setTimeout(() => setRevealed((r) => r + 1), 280);
    return () => window.clearTimeout(t);
  }, [revealed, result.items.length]);

  return (
    <>
      <div className="px-5 py-4 animate-in fade-in duration-200">
        <div className="bg-muted/40 px-3 py-2 text-xs leading-relaxed mb-3 line-clamp-2 text-muted-foreground">
          {prompt}
        </div>

        <div className="flex items-start gap-3 mb-3">
          <div className="flex items-center justify-center size-7 rounded-full bg-primary/10 shrink-0">
            <Sparkles className="size-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight mb-0.5">
              {result.title}
            </p>
            <p className="text-xs text-muted-foreground leading-snug">
              {result.subtitle}
            </p>
          </div>
        </div>

        <div className="space-y-1.5 ml-10">
          {result.items.slice(0, revealed).map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-1.5 bg-muted/30",
                  "animate-in fade-in slide-in-from-left-2 duration-300"
                )}
              >
                <Icon className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium flex-1 min-w-0 truncate">
                  {item.label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {item.meta}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2 border-t border-border/60 bg-muted/20">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefine}
          className="h-7 text-xs"
        >
          Refine
        </Button>
        <Button
          size="sm"
          onClick={onAddToQueue}
          disabled={revealed < result.items.length}
          className="h-7 gap-1.5 text-xs"
        >
          Add to Queue
          <ArrowRight className="size-3" />
        </Button>
      </div>
    </>
  );
}

function QueuedState() {
  return (
    <div className="px-5 py-8 text-center animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-center size-12 rounded-full bg-success/10 text-success mx-auto mb-3">
        <CheckCircle2 className="size-6" />
      </div>
      <p className="text-sm font-medium mb-1">Queued</p>
      <p className="text-xs text-muted-foreground">
        4 drafts now in your Actions queue.
      </p>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function wait(ms: number) {
  return new Promise<void>((res) => window.setTimeout(res, ms));
}

// reserved for future use
void Receipt;
void ArrowUp;
