"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  PenLine,
  Inbox,
  Mic,
  Send,
  Sparkles,
  CheckCircle2,
  Loader2,
  X,
  ArrowRight,
  User as UserIcon,
  Building2,
  Briefcase,
  Zap,
} from "lucide-react";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";

/**
 * Floating Capture Button — persistent on every authenticated page.
 *
 * Click → opens an anchored panel that bubbles up from the FAB,
 * NOT a centered overlay. User can still see the rest of the page.
 *
 * Entry points to Capture (all complementary):
 *   - Sidebar item (destination)
 *   - This FAB (always-visible interrupt)
 *   - Cmd+Shift+N (invisible hotkey)
 *
 * Hides on /capture (redirects to Plays) and auth routes.
 */

type SubmitState = "idle" | "processing" | "complete";

const DEMO_ROUTING: Array<{
  label: string;
  entityType: "person" | "organization" | "project" | "action";
}> = [
  { label: "Sarah Chen", entityType: "person" },
  { label: "Acme Corp", entityType: "organization" },
  { label: "Q3 Rebrand", entityType: "project" },
  {
    label: "Action: Draft logo iteration v3 for Mike",
    entityType: "action",
  },
];

const HIDDEN_PATHS = ["/capture", "/signin", "/signout"];

export function FloatingCaptureButton() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const shouldHide = HIDDEN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  // Global Cmd+Shift+N hotkey
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      if (modifier && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        if (!shouldHide) setOpen((o) => !o);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shouldHide, open]);

  if (shouldHide) return null;

  return (
    <>
      <FAB onClick={() => setOpen((o) => !o)} active={open} />
      {open && <CapturePanel onClose={() => setOpen(false)} />}
    </>
  );
}

// ============================================================================
// FAB
// ============================================================================

function FAB({ onClick, active }: { onClick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Capture (⌘⇧N)"
      title="Capture · ⌘⇧N"
      className={cn(
        "fixed bottom-6 right-6 z-40",
        "flex items-center justify-center size-12 rounded-full",
        "bg-primary text-primary-foreground",
        "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
        "ring-1 ring-primary/40",
        "hover:scale-105 active:scale-95 transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40",
        active && "scale-95"
      )}
    >
      <PenLine className={cn("size-5 transition-transform", active && "rotate-12")} />
    </button>
  );
}

// ============================================================================
// CAPTURE PANEL — anchored, bubbles up from the FAB (not overlay)
// ============================================================================

function CapturePanel({ onClose }: { onClose: () => void }) {
  const [text, setText] = React.useState("");
  const [state, setState] = React.useState<SubmitState>("idle");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Auto-focus
  React.useEffect(() => {
    const t = window.setTimeout(() => textareaRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, []);

  // Click outside dismisses
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Don't close if clicking the FAB itself (FAB's onClick toggles)
        const target = e.target as HTMLElement;
        if (target.closest('[aria-label^="Capture"]')) return;
        onClose();
      }
    };
    // Use a slight delay so the same click that opened the panel doesn't immediately close it
    const t = window.setTimeout(() => {
      window.addEventListener("mousedown", handler);
    }, 100);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setState("processing");
    await wait(1600);
    setState("complete");
    await wait(1400);
    onClose();
  };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Capture"
      className={cn(
        "fixed bottom-20 right-6 z-50 w-[min(24rem,calc(100vw-3rem))]",
        "rounded-xl border border-border bg-card shadow-2xl",
        "overflow-hidden",
        "animate-in fade-in slide-in-from-bottom-3 duration-200"
      )}
    >
      {/* Tiny arrow connecting panel to FAB */}
      <div
        aria-hidden
        className="absolute -bottom-1.5 right-5 size-3 rotate-45 bg-card border-r border-b border-border"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60">
        <div className="flex items-center gap-2">
          <PenLine className="size-3.5 text-primary" />
          <span className="text-sm font-medium">Capture</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {state === "complete" ? (
        // Success state
        <div className="px-5 py-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-center size-10 rounded-full bg-success/10 text-success mx-auto mb-2.5">
            <CheckCircle2 className="size-5" />
          </div>
          <p className="text-sm font-medium mb-1">Routed</p>
          <p className="text-[11px] text-muted-foreground leading-snug mb-3">
            Sarah Chen · Acme Corp · Q3 Rebrand
            <br />+ 1 Action created
          </p>
          <Link
            href="/plays?tab=activity"
            onClick={onClose}
            className="inline-flex items-center gap-1 text-[11px] text-foreground/70 hover:text-foreground"
          >
            View activity
            <ArrowRight className="size-3" />
          </Link>
        </div>
      ) : (
        <>
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind?"
            rows={4}
            disabled={state !== "idle"}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className={cn(
              "w-full resize-none bg-transparent border-0 px-4 py-3",
              "text-sm leading-relaxed",
              "placeholder:text-muted-foreground/70",
              "focus:outline-none disabled:opacity-60"
            )}
          />

          {/* Actions footer */}
          <div className="flex items-center justify-between px-2.5 py-2 border-t border-border/60 bg-muted/20">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 text-[11px] text-muted-foreground px-1.5"
                disabled
              >
                <Mic className="size-3" />
                Voice
              </Button>
              <Link
                href="/plays?tab=activity&view=captures"
                onClick={onClose}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1"
              >
                View all →
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
                ⌘↵
              </span>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!text.trim() || state !== "idle"}
                className="h-6 gap-1 text-[11px] px-2"
              >
                {state === "processing" ? (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    Processing
                  </>
                ) : (
                  <>
                    <Send className="size-3" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Processing reveal */}
          {state === "processing" && <QuickProcessingReveal />}
        </>
      )}
    </div>
  );
}

function QuickProcessingReveal() {
  const [revealed, setRevealed] = React.useState(0);

  React.useEffect(() => {
    if (revealed >= DEMO_ROUTING.length) return;
    const t = window.setTimeout(() => setRevealed((r) => r + 1), 280);
    return () => window.clearTimeout(t);
  }, [revealed]);

  return (
    <div className="border-t border-primary/15 bg-primary/5 px-4 py-2.5 space-y-1.5 animate-in fade-in duration-200">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
        <Sparkles className="size-3 text-primary animate-pulse" />
        Filing this for you…
      </div>
      {DEMO_ROUTING.slice(0, revealed).map((r, i) => {
        const meta = entityMeta(r.entityType);
        return (
          <div
            key={i}
            className="flex items-center gap-2 animate-in fade-in slide-in-from-left-1 duration-300"
          >
            <div
              className={cn(
                "flex items-center justify-center size-5 rounded shrink-0",
                meta.bg,
                meta.fg
              )}
            >
              <meta.Icon className="size-3" />
            </div>
            <span className="text-[11px] leading-tight flex-1 min-w-0 truncate">
              <span className="text-muted-foreground">{meta.action}</span>{" "}
              <span className="font-medium">{r.label}</span>
            </span>
            <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function wait(ms: number) {
  return new Promise<void>((res) => window.setTimeout(res, ms));
}

function entityMeta(
  entityType: "person" | "organization" | "project" | "action"
) {
  switch (entityType) {
    case "person":
      return {
        Icon: UserIcon,
        bg: "bg-accent/10",
        fg: "text-accent",
        action: "Note added to",
      };
    case "organization":
      return {
        Icon: Building2,
        bg: "bg-info/10",
        fg: "text-info",
        action: "Note added to",
      };
    case "project":
      return {
        Icon: Briefcase,
        bg: "bg-primary/10",
        fg: "text-primary",
        action: "Linked to project",
      };
    case "action":
      return {
        Icon: Zap,
        bg: "bg-warning/10",
        fg: "text-warning",
        action: "Created",
      };
  }
}
