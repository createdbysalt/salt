"use client";

import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Sparkles,
  Inbox,
  PenLine,
  Mic,
  Send,
  CheckCircle2,
  Loader2,
  X,
  ArrowRight,
  User as UserIcon,
  Building2,
  Briefcase,
  Zap,
} from "lucide-react";
import { AIButton, Button } from "@repo/ui";
import { cn } from "@repo/utils";

/**
 * SiteHeader - Consistent header across all dashboard pages
 * Features: Search bar (triggers ⌘K), Capture button (opens panel)
 */

// Routes that provide their own header entirely
const ROUTES_WITH_CUSTOM_HEADER = ["/studio/inbox", "/serve", "/clients/directory", "/clients/messages"];

type SubmitState = "idle" | "processing" | "complete";

const DEMO_ROUTING: Array<{
  label: string;
  entityType: "person" | "organization" | "project" | "action";
}> = [
  { label: "Sarah Chen", entityType: "person" },
  { label: "Acme Corp", entityType: "organization" },
  { label: "Q3 Rebrand", entityType: "project" },
  { label: "Action: Draft logo iteration v3", entityType: "action" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [captureOpen, setCaptureOpen] = useState(false);

  // ⌘C shortcut for Capture
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "c" && !e.shiftKey && !e.altKey) {
        // Only trigger if no text is selected (don't override copy)
        const selection = window.getSelection();
        if (!selection || selection.toString().length === 0) {
          e.preventDefault();
          setCaptureOpen((o) => !o);
        }
      }
      if (e.key === "Escape" && captureOpen) {
        setCaptureOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [captureOpen]);

  // Hide on routes with custom headers
  if (ROUTES_WITH_CUSTOM_HEADER.some((route) => pathname.startsWith(route))) {
    return null;
  }

  const handleSearchClick = () => {
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  return (
    <header className="relative flex h-12 shrink-0 items-center border-b border-border/50">
      {/* Inner container — matches page content width (max-w-6xl px-12) */}
      <div className="flex items-center gap-3 w-full max-w-6xl mx-auto px-12">
        {/* Search bar - triggers command palette */}
        <button
          onClick={handleSearchClick}
          className="flex flex-1 items-center gap-2 h-8 px-3 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground text-sm transition-colors cursor-pointer"
        >
          <Search className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="flex-1 text-left">Search or do anything</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-background border border-border rounded">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>

        {/* Capture button */}
        <div className="relative">
          <AIButton
            variant="icon"
            size="icon-sm"
            className="size-8"
            onClick={() => setCaptureOpen((o) => !o)}
          >
            <PenLine className="size-3.5" strokeWidth={1.5} />
          </AIButton>

          {/* Capture Panel - drops down from button */}
          {captureOpen && (
            <CapturePanel onClose={() => setCaptureOpen(false)} />
          )}
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// CAPTURE PANEL
// ============================================================================

function CapturePanel({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-focus
  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // Click outside dismisses
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (target.closest('[data-capture-trigger]')) return;
        onClose();
      }
    };
    const t = setTimeout(() => {
      window.addEventListener("mousedown", handler);
    }, 100);
    return () => {
      clearTimeout(t);
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
        "absolute top-full right-0 mt-2 z-50 w-[min(24rem,calc(100vw-2rem))]",
        "rounded-xl border border-border bg-card shadow-2xl",
        "overflow-hidden",
        "animate-in fade-in slide-in-from-top-2 duration-200"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60">
        <div className="flex items-center gap-2">
          <PenLine className="size-3.5 text-accent" />
          <span className="text-sm font-medium">Capture</span>
          <span className="text-[10px] text-muted-foreground/50">⌘C</span>
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
            href="/capture"
            onClick={onClose}
            className="inline-flex items-center gap-1 text-[11px] text-foreground/70 hover:text-foreground"
          >
            View activity
            <ArrowRight className="size-3" />
          </Link>
        </div>
      ) : (
        <>
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
                href="/capture"
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

          {state === "processing" && <QuickProcessingReveal />}
        </>
      )}
    </div>
  );
}

function QuickProcessingReveal() {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (revealed >= DEMO_ROUTING.length) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), 280);
    return () => clearTimeout(t);
  }, [revealed]);

  return (
    <div className="border-t border-accent/15 bg-accent/5 px-4 py-2.5 space-y-1.5 animate-in fade-in duration-200">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
        <Sparkles className="size-3 text-accent animate-pulse" />
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
            <CheckCircle2 className="size-3 text-success shrink-0" />
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
  return new Promise<void>((res) => setTimeout(res, ms));
}

function entityMeta(entityType: "person" | "organization" | "project" | "action") {
  switch (entityType) {
    case "person":
      return { Icon: UserIcon, bg: "bg-accent/10", fg: "text-accent", action: "Note added to" };
    case "organization":
      return { Icon: Building2, bg: "bg-info/10", fg: "text-info", action: "Note added to" };
    case "project":
      return { Icon: Briefcase, bg: "bg-primary/10", fg: "text-primary", action: "Linked to project" };
    case "action":
      return { Icon: Zap, bg: "bg-warning/10", fg: "text-warning", action: "Created" };
  }
}
