"use client";

import * as React from "react";
import {
  PenLine,
  Mic,
  Send,
  Search,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, Button, Card } from "@repo/ui";
import { cn } from "@repo/utils";
import { MOCK_CAPTURES, type MockCapture } from "@/app/_lib/demo";

/**
 * Capture page (/capture).
 *
 * The "mouth of the AI funnel" — quick scratchpad input that AI parses
 * and routes to the right entities/actions.
 *
 * Demo flow: user types → submit → AI "thinking" → routing cards animate
 * in. Subsequent captures show in recent cards below.
 */

type SubmitState = "idle" | "processing" | "complete";

// Demo routing destinations for the "magic moment" — the storyline capture
const DEMO_ROUTING = [
  { label: "Sarah Chen", entityType: "person" as const, icon: "user" },
  { label: "Acme Corp", entityType: "organization" as const, icon: "org" },
  { label: "Q3 Rebrand", entityType: "project" as const, icon: "project" },
  {
    label: "Action: Draft logo iteration v3 for Mike",
    entityType: "action" as const,
    icon: "action",
  },
];

export function CapturePage() {
  const [text, setText] = React.useState("");
  const [state, setState] = React.useState<SubmitState>("idle");
  const [recentItems, setRecentItems] = React.useState<JustCaptured[]>([]);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    const submitted = text;
    setState("processing");
    // AI "thinking" simulation
    await wait(1800);
    setState("complete");
    // After complete, slide it into recent items
    await wait(900);
    setRecentItems((items) => [
      {
        id: `capture_${Date.now()}`,
        content: submitted,
        ago: "just now",
        routedTo: DEMO_ROUTING.map((r) => ({ ...r, isAutoRouted: r.entityType !== "action" })),
      },
      ...items,
    ]);
    setText("");
    setState("idle");
    textareaRef.current?.focus();
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <PenLine className="size-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Capture</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Just say it — AI files it where it belongs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Search className="size-4" />
          </Button>
        </div>
      </div>

      {/* Quick capture box (always-on at top) */}
      <Card className="overflow-hidden mb-6 transition-shadow focus-within:shadow-md">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's on your mind? — e.g., Sarah said Tuesday is bad for Q3 launch, suggested pushing to following week. Also Mike likes the logo but wants one more iteration."
          rows={3}
          disabled={state !== "idle"}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className={cn(
            "w-full resize-none bg-transparent border-0 px-4 py-4",
            "text-sm leading-relaxed",
            "placeholder:text-muted-foreground/70",
            "focus:outline-none disabled:opacity-60"
          )}
        />
        <div className="flex items-center justify-between px-3 py-2 border-t border-border/60 bg-muted/20">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-muted-foreground"
              disabled
            >
              <Mic className="size-3.5" />
              Voice
              <span className="text-[9px] uppercase tracking-wide bg-muted px-1 py-0.5 rounded">
                Soon
              </span>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/70 hidden sm:inline">
              ⌘↵ to save
            </span>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!text.trim() || state !== "idle"}
              className="h-7 gap-1.5"
            >
              {state === "processing" ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Processing
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Processing animation */}
      {state === "processing" && <ProcessingPanel content={text} />}

      {/* Complete preview (briefly shows before sliding into recent) */}
      {state === "complete" && (
        <Card className="border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 mb-4 animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-4" />
            Routed
          </div>
        </Card>
      )}

      {/* Page tabs (demo: Recent active) */}
      <div className="flex items-center gap-1 mb-3">
        <TabButton active>Recent</TabButton>
        <TabButton>All</TabButton>
        <TabButton>Auto-routed</TabButton>
        <TabButton>Needs review</TabButton>
      </div>

      {/* Recent captures (newly captured first, then fixtures) */}
      <div className="space-y-3">
        {recentItems.map((item) => (
          <CaptureCard
            key={item.id}
            content={item.content}
            ago={item.ago}
            source="text"
            status="auto_routed"
            routedTo={item.routedTo}
            isNew
          />
        ))}
        {MOCK_CAPTURES.map((cap) => (
          <CaptureCard
            key={cap.id}
            content={cap.content}
            ago={cap.ago}
            source={cap.source}
            status={cap.status}
            routedTo={cap.routedTo.map((r) => ({
              label: r.label,
              entityType: r.entityType,
              icon: iconKeyFromEntity(r.entityType),
              isAutoRouted: r.isAutoRouted,
            }))}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// PROCESSING PANEL (AI thinking animation)
// ============================================================================

function ProcessingPanel({ content }: { content: string }) {
  // Reveal routing destinations one-by-one for the "wow" effect
  const [revealed, setRevealed] = React.useState(0);

  React.useEffect(() => {
    if (revealed >= DEMO_ROUTING.length) return;
    const t = window.setTimeout(() => setRevealed((r) => r + 1), 360);
    return () => window.clearTimeout(t);
  }, [revealed]);

  return (
    <Card className="overflow-hidden mb-6 border-primary/30 bg-primary/5 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="px-5 py-4 border-b border-primary/15">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-primary animate-pulse" />
          <span className="text-foreground">Filing this for you…</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          "{content}"
        </p>
      </div>
      <div className="p-5 space-y-2">
        {DEMO_ROUTING.slice(0, revealed).map((r, i) => (
          <RoutingRow key={i} label={r.label} entityType={r.entityType} />
        ))}
        {revealed < DEMO_ROUTING.length && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
            <span className="inline-block size-1 rounded-full bg-primary animate-pulse" />
            <span className="inline-block size-1 rounded-full bg-primary animate-pulse delay-100" />
            <span className="inline-block size-1 rounded-full bg-primary animate-pulse delay-200" />
            <span className="ml-1">Scanning context…</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function RoutingRow({
  label,
  entityType,
}: {
  label: string;
  entityType: "person" | "organization" | "project" | "action";
}) {
  const meta = entityMeta(entityType);
  return (
    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-1 duration-300">
      <div
        className={cn(
          "flex items-center justify-center size-7 rounded-md shrink-0",
          meta.bg,
          meta.fg
        )}
      >
        <meta.Icon className="size-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-tight">
          <span className="text-muted-foreground">{meta.action}</span>{" "}
          <span className="font-medium">{label}</span>
        </p>
      </div>
      <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
    </div>
  );
}

// ============================================================================
// CAPTURE CARD (recent items)
// ============================================================================

type JustCaptured = {
  id: string;
  content: string;
  ago: string;
  routedTo: Array<{
    label: string;
    entityType: "person" | "organization" | "project" | "action";
    icon: string;
    isAutoRouted: boolean;
  }>;
};

function CaptureCard({
  content,
  ago,
  source,
  status,
  routedTo,
  isNew,
}: {
  content: string;
  ago: string;
  source: "text" | "voice";
  status: "auto_routed" | "pending_review";
  routedTo: Array<{
    label: string;
    entityType: "person" | "organization" | "project" | "action";
    icon?: string;
    isAutoRouted: boolean;
  }>;
  isNew?: boolean;
}) {
  return (
    <Card
      className={cn(
        "p-4 transition-colors",
        isNew && "border-primary/30 bg-primary/[0.03] animate-in fade-in slide-in-from-top-1 duration-400"
      )}
    >
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <span>{ago}</span>
        <span>·</span>
        <span className="flex items-center gap-1">
          {source === "voice" ? (
            <Mic className="size-3" />
          ) : (
            <PenLine className="size-3" />
          )}
          {source === "voice" ? "Voice" : "Text"}
        </span>
        {status === "auto_routed" && (
          <>
            <span>·</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="size-3" />
              Auto-routed
            </span>
          </>
        )}
      </div>
      <p className="text-sm leading-relaxed mb-3">"{content}"</p>
      <div className="flex flex-wrap gap-1.5">
        {routedTo.map((r, i) => {
          const meta = entityMeta(r.entityType);
          return (
            <div
              key={i}
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
                meta.bg,
                meta.fg,
                "border border-transparent"
              )}
            >
              <meta.Icon className="size-3" />
              <span className="truncate">{r.label}</span>
              {!r.isAutoRouted && (
                <ArrowRight className="size-2.5 text-current opacity-60" />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ============================================================================
// TABS
// ============================================================================

function TabButton({
  active,
  children,
}: {
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      {children}
    </button>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function wait(ms: number) {
  return new Promise<void>((res) => window.setTimeout(res, ms));
}

import { User as UserIcon, Building2, Briefcase, Zap } from "lucide-react";

function entityMeta(entityType: "person" | "organization" | "project" | "action") {
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

function iconKeyFromEntity(
  entityType: "person" | "organization" | "project" | "action"
): string {
  return entityType;
}

// avoid unused-variable warning for Avatar reserved for future use
void Avatar;
void AvatarFallback;
