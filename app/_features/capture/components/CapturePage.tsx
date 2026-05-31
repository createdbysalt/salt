"use client";

import * as React from "react";
import confetti from "canvas-confetti";
import {
  PenLine,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Pencil,
  X,
  User as UserIcon,
  Briefcase,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Search,
  RotateCcw,
  Filter,
  Undo2,
  Plus,
  Pin,
  Flame,
  Play,
} from "lucide-react";
import { Avatar, AvatarFallback, Badge, Button, Card, AIButton, Input } from "@repo/ui";
import { PageBanner } from "@repo/patterns";
import { cn } from "@repo/utils";
import {
  MOCK_CAPTURES,
  MOCK_CAPTURES_PENDING,
  MOCK_PLAY_TEMPLATES,
  getMockPlayer,
  type MockCapture,
  type MockSourceRef,
  type MockPlayer,
} from "@/app/_lib/demo";

/**
 * Capture page (/capture).
 *
 * Three views:
 * - Pending: Gamified queue of items AI couldn't confidently route
 * - Stream: All captures with source filters (Added/Found)
 * - Notes: Personal context, reflections that don't need routing
 */

type TopTab = "pending" | "stream" | "notes";
type StreamFilter = "all" | "added" | "found";

function TabBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      className="ml-2 flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-light text-foreground"
      style={{ backgroundColor: "#e8e9fe" }}
    >
      {count}
    </span>
  );
}

export function CapturePage() {
  const [topTab, setTopTab] = React.useState<TopTab>("pending");

  // Count pending items for badge
  const pendingCount = MOCK_CAPTURES_PENDING.length;

  const TABS = [
    {
      label: (
        <span className="flex items-center">
          Pending
          <TabBadge count={pendingCount} />
        </span>
      ),
      value: "pending" as const,
    },
    { label: "Stream", value: "stream" as const },
    { label: "Notes", value: "notes" as const },
  ];

  return (
    <div className="w-full px-16 py-8">
      <PageBanner
        size="hero"
        eyebrow="YOUR KNOWLEDGE"
        title="Capture"
        subtitle="What you add. What Salt finds. All organized."
        tabs={TABS}
        activeTab={topTab}
        onTabChange={(value) => setTopTab(value as TopTab)}
        fullWidthDivider
        actions={
          <Button
            size="sm"
            className="h-8 gap-1 px-2.5 cursor-pointer"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("salt:open-capture", {
                  detail: { intent: "auto" },
                })
              );
            }}
          >
            <PenLine className="size-3.5" />
            Add Capture
          </Button>
        }
      />

      {/* Tab content */}
      {topTab === "pending" && <PendingQueueView />}
      {topTab === "stream" && <StreamView />}
      {topTab === "notes" && <NotesView />}
    </div>
  );
}

// ============================================================================
// PENDING QUEUE VIEW — Gamified one-at-a-time review
// ============================================================================

type PendingFilter = "all" | "added" | "found";

const PENDING_FILTERS: { label: string; value: PendingFilter }[] = [
  { label: "All", value: "all" },
  { label: "Added", value: "added" },
  { label: "Found", value: "found" },
];

const SOURCE_TYPE_LABELS: Record<MockSourceRef["sourceType"], string> = {
  meeting: "Meeting",
  email: "Gmail",
  file: "Drive",
  payment: "Stripe",
  calendar: "Calendar",
  capture: "Capture",
  proposal: "Proposal",
  memory: "Memory",
};

function SourceTrail({ refs, compact = false }: { refs?: MockSourceRef[]; compact?: boolean }) {
  if (!refs?.length) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", compact ? "mt-1.5" : "mt-4")}>
      {refs.map((source) => (
        <span
          key={`${source.label}-${source.detail}`}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
          title={source.detail}
        >
          <Sparkles className="size-3 text-primary" />
          {SOURCE_TYPE_LABELS[source.sourceType]}: {source.label}
        </span>
      ))}
    </div>
  );
}

function PendingQueueView() {
  const [filter, setFilter] = React.useState<PendingFilter>("all");
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [processedIds, setProcessedIds] = React.useState<Set<string>>(new Set());
  const [lastAction, setLastAction] = React.useState<{
    id: string;
    action: "confirmed" | "dismissed";
    timestamp: number;
  } | null>(null);
  const [streak, setStreak] = React.useState(0);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [animationDirection, setAnimationDirection] = React.useState<"left" | "right" | null>(null);
  const [showContextInput, setShowContextInput] = React.useState(false);

  // Filter by source
  const filteredItems = MOCK_CAPTURES_PENDING.filter((c) => {
    if (filter === "all") return true;
    if (filter === "added") return c.source === "user";
    if (filter === "found") return c.source === "ambient";
    return true;
  });

  const remainingItems = filteredItems.filter((c) => !processedIds.has(c.id));
  const currentItem = remainingItems[currentIndex];
  const upNextItems = remainingItems.slice(currentIndex + 1, currentIndex + 3);
  const processedInFilter = filteredItems.filter((c) => processedIds.has(c.id)).length;
  const totalInFilter = filteredItems.length;

  const showUndo = lastAction && Date.now() - lastAction.timestamp < 5000;

  React.useEffect(() => {
    if (!lastAction) return;
    const timeout = window.setTimeout(() => setLastAction(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [lastAction]);

  // Reset index when filter changes
  React.useEffect(() => {
    setCurrentIndex(0);
  }, [filter]);

  const handleConfirm = React.useCallback(() => {
    if (!currentItem || isAnimating) return;
    setAnimationDirection("right");
    setIsAnimating(true);
    setStreak((s) => s + 1);
    setShowContextInput(false);

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ["#4e58fc", "#22c55e", "#eab308"],
    });

    setTimeout(() => {
      setLastAction({ id: currentItem.id, action: "confirmed", timestamp: Date.now() });
      setProcessedIds((prev) => new Set([...prev, currentItem.id]));
      setIsAnimating(false);
      setAnimationDirection(null);
    }, 200);
  }, [currentItem, isAnimating]);

  const handleDismiss = React.useCallback(() => {
    if (!currentItem || isAnimating) return;
    setAnimationDirection("left");
    setIsAnimating(true);
    setStreak(0);
    setShowContextInput(false);

    setTimeout(() => {
      setLastAction({ id: currentItem.id, action: "dismissed", timestamp: Date.now() });
      setProcessedIds((prev) => new Set([...prev, currentItem.id]));
      setIsAnimating(false);
      setAnimationDirection(null);
    }, 200);
  }, [currentItem, isAnimating]);

  const handleUndo = () => {
    if (!lastAction) return;
    setProcessedIds((prev) => {
      const next = new Set(prev);
      next.delete(lastAction.id);
      return next;
    });
    setStreak((s) => Math.max(0, s - 1));
    setLastAction(null);
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case "c":
          if (currentItem) handleConfirm();
          break;
        case "e":
          setShowContextInput(true);
          break;
        case "d":
          if (currentItem) handleDismiss();
          break;
        case "arrowright":
        case "j":
          if (currentIndex < remainingItems.length - 1) setCurrentIndex((i) => i + 1);
          break;
        case "arrowleft":
        case "k":
          if (currentIndex > 0) setCurrentIndex((i) => i - 1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentItem, currentIndex, handleConfirm, handleDismiss, remainingItems.length]);

  // All clear state
  if (remainingItems.length === 0) {
    const autoFiledCount = MOCK_CAPTURES.filter((c) => c.status === "auto_routed").length;

    return (
      <div className="flex flex-col">
        {/* Filter chips + reviewed count */}
        <div className="flex items-center gap-2 mb-6">
          {PENDING_FILTERS.map((f) => {
            const count = MOCK_CAPTURES_PENDING.filter((c) => {
              if (f.value === "all") return !processedIds.has(c.id);
              if (f.value === "added") return c.source === "user" && !processedIds.has(c.id);
              if (f.value === "found") return c.source === "ambient" && !processedIds.has(c.id);
              return false;
            }).length;
            const isActive = filter === f.value;
            const dotColor = {
              all: "bg-foreground",
              added: "bg-muted-foreground",
              found: "bg-primary",
            }[f.value];
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider transition-all border",
                  isActive
                    ? "bg-foreground/5 text-foreground border-border"
                    : "bg-transparent text-muted-foreground/60 border-transparent hover:text-foreground"
                )}
              >
                <span className={cn("size-1.5 rounded-[2px]", dotColor, !isActive && "opacity-60")} />
                <span>{f.label}</span>
                {count > 0 && <span className="opacity-60">{count}</span>}
              </button>
            );
          })}

          {/* Reviewed count — right side */}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[11px] font-mono text-muted-foreground">
              {totalInFilter}/{totalInFilter} reviewed
            </span>
          </div>
        </div>

        {/* All clear card */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="size-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="size-5 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-medium mb-1">All clear</h3>
              <p className="text-sm text-muted-foreground">
                Queue cleared.
                {autoFiledCount > 0 && ` ${autoFiledCount} items auto-routed in Stream.`}
              </p>
            </div>
            {showUndo && (
              <button
                type="button"
                onClick={handleUndo}
                className="text-sm font-medium text-primary hover:opacity-80 transition-opacity"
              >
                Undo
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Filter chips + progress — like Plays page */}
      <div className="flex items-center gap-2 mb-6">
        {PENDING_FILTERS.map((f) => {
          const count = MOCK_CAPTURES_PENDING.filter((c) => {
            if (f.value === "all") return !processedIds.has(c.id);
            if (f.value === "added") return c.source === "user" && !processedIds.has(c.id);
            if (f.value === "found") return c.source === "ambient" && !processedIds.has(c.id);
            return false;
          }).length;
          const isActive = filter === f.value;
          const dotColor = {
            all: "bg-foreground",
            added: "bg-muted-foreground",
            found: "bg-primary",
          }[f.value];
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider transition-all border",
                isActive
                  ? "bg-foreground/5 text-foreground border-border"
                  : "bg-transparent text-muted-foreground/60 border-transparent hover:text-foreground"
              )}
            >
              <span className={cn("size-1.5 rounded-[2px]", dotColor, !isActive && "opacity-60")} />
              <span>{f.label}</span>
              {count > 0 && <span className="opacity-60">{count}</span>}
            </button>
          );
        })}

        {/* Progress — right side */}
        <div className="ml-auto flex items-center gap-3">
          {streak >= 2 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
              <Flame className="size-3" />
              {streak}
            </span>
          )}
          <span className="text-[11px] font-mono text-muted-foreground">
            {processedInFilter}/{totalInFilter} reviewed
          </span>
        </div>
      </div>

      {/* Card stack effect — like Plays */}
      <div className="relative mb-8">
        {upNextItems.length > 1 && (
          <div className="absolute inset-x-4 top-3 h-full rounded-2xl bg-card border border-border/30 -z-20" />
        )}
        {upNextItems.length > 0 && (
          <div className="absolute inset-x-2 top-1.5 h-full rounded-2xl bg-card border border-border/40 -z-10" />
        )}

        <div
          className={cn(
            "relative rounded-2xl bg-card border border-border shadow-lg transition-all duration-200",
            isAnimating && animationDirection === "right" && "translate-x-4 opacity-0",
            isAnimating && animationDirection === "left" && "-translate-x-4 opacity-0"
          )}
        >
          <PendingCard
            capture={currentItem}
            onConfirm={handleConfirm}
            onDismiss={handleDismiss}
            showContextInput={showContextInput}
            onShowContextInputChange={setShowContextInput}
          />
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/50 mb-6">
        <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">C</kbd> confirm</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">E</kbd> context</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">D</kbd> dismiss</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">←→</kbd> navigate</span>
      </div>

      {/* Up next preview */}
      {upNextItems.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-medium text-muted-foreground mb-2">Up next</p>
          <div className="flex flex-col gap-1.5">
            {upNextItems.map((item, idx) => {
              const SourceIcon = item.source === "ambient" ? Sparkles : PenLine;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30 border border-border/30",
                    idx === 0 && "bg-muted/50"
                  )}
                >
                  <div className="size-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <SourceIcon className="size-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.content}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{item.ago}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Undo toast */}
      {showUndo && (
        <div className="fixed bottom-6 left-[calc(50%+7rem)] -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-4 px-5 py-2.5 bg-card border border-border shadow-lg rounded-lg">
            <div className="flex items-center gap-2">
              {lastAction.action === "confirmed" ? (
                <CheckCircle2 className="size-4 text-success" />
              ) : (
                <X className="size-4 text-muted-foreground" />
              )}
              <span className="text-sm text-foreground">
                {lastAction.action === "confirmed" ? "Confirmed" : "Dismissed"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleUndo}
              className="text-sm font-medium text-primary hover:opacity-80 transition-opacity cursor-pointer"
            >
              Undo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PendingCard({
  capture,
  onConfirm,
  onDismiss,
  showContextInput,
  onShowContextInputChange,
}: {
  capture: MockCapture;
  onConfirm: () => void;
  onDismiss: () => void;
  showContextInput: boolean;
  onShowContextInputChange: (show: boolean) => void;
}) {
  const [showChangeMenu, setShowChangeMenu] = React.useState(false);
  const [contextText, setContextText] = React.useState("");
  const routing = capture.suggestedRouting;
  const destination = routing?.suggestedDestination;
  const goalSuggestion = capture.goalSuggestion;
  const suggestedPlayer = getMockPlayer(goalSuggestion?.playerId);
  const suggestedTemplate = MOCK_PLAY_TEMPLATES.find(
    (template) => template.id === goalSuggestion?.playTemplateId
  );
  const SourceIcon = capture.source === "ambient" ? Sparkles : PenLine;
  const sourceLabel = capture.source === "ambient" ? "Found" : "Added";

  // Icon for destination type
  const getDestinationIcon = (type: string) => {
    switch (type) {
      case "notes": return PenLine;
      case "new_contact": return UserIcon;
      case "existing_contact": return UserIcon;
      case "project": return Briefcase;
      default: return Sparkles;
    }
  };

  const DestIcon = destination ? getDestinationIcon(destination.type) : Sparkles;

  return (
    <>
      {/* Header — Source icon + why it needs review */}
      <div className="px-5 py-4 border-b border-border/50">
        <div className="flex items-start gap-3">
          {/* Source icon — monotone */}
          <div className="size-10 rounded-full flex items-center justify-center flex-shrink-0 bg-muted">
            <SourceIcon className="size-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold">{sourceLabel}</p>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{capture.ago}</span>
            </div>
            {/* Why it needs review — prominent */}
            <p className="text-sm text-muted-foreground mt-0.5">
              {routing?.reason || "Couldn't determine where this should go"}
            </p>
          </div>
          {/* Confidence chip — top right */}
          {routing && (
            <span className="text-[11px] font-mono text-muted-foreground border border-border px-2 py-0.5 shrink-0">
              {routing.confidence}% confidence
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-5">
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
          "{capture.content}"
        </p>
        <SourceTrail refs={capture.sourceRefs} />

        {/* Add context input — expandable */}
        {showContextInput && (
          <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border/50 animate-in slide-in-from-top-2 duration-200">
            <p className="text-xs text-muted-foreground mb-2">Add context to help route this:</p>
            <textarea
              value={contextText}
              onChange={(e) => setContextText(e.target.value)}
              placeholder="e.g., This is for Q4 planning with the design team..."
              rows={2}
              autoFocus
              className={cn(
                "w-full resize-none bg-background border border-border rounded-lg px-3 py-2",
                "text-sm leading-relaxed",
                "placeholder:text-muted-foreground/50",
                "focus:outline-none focus:ring-2 focus:ring-primary/20"
              )}
            />
            <div className="flex items-center justify-end gap-2 mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onShowContextInputChange(false);
                  setContextText("");
                }}
                className="h-7"
              >
                Cancel
              </Button>
              <AIButton
                size="sm"
                disabled={!contextText.trim()}
                className="h-7 gap-1.5"
              >
                <Sparkles className="size-3" />
                Re-process
              </AIButton>
            </div>
          </div>
        )}
      </div>

      {goalSuggestion && suggestedPlayer && (
        <div className="px-5 pb-4">
          <GoalSuggestionCard
            capture={capture}
            player={suggestedPlayer}
            playName={suggestedTemplate?.name ?? goalSuggestion.title}
          />
        </div>
      )}

      {/* Route to — Show AI suggestion OR ask user to pick */}
      <div className="px-5 pb-4">
        {destination ? (
          // AI has a suggestion — show it with Change option
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-primary" />
              <span className="text-sm text-muted-foreground">Route to:</span>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowChangeMenu(!showChangeMenu)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-sm font-medium transition-colors hover:bg-primary/15"
              >
                <DestIcon className="size-3.5 text-primary" />
                <span>{destination.label}</span>
                <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", showChangeMenu && "rotate-180")} />
              </button>

              {/* Change dropdown */}
              {showChangeMenu && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-10 py-1">
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                    onClick={() => setShowChangeMenu(false)}
                  >
                    <PenLine className="size-3.5" />
                    Notes
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                    onClick={() => setShowChangeMenu(false)}
                  >
                    <UserIcon className="size-3.5" />
                    New contact
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                    onClick={() => setShowChangeMenu(false)}
                  >
                    <Briefcase className="size-3.5" />
                    Link to project...
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                    onClick={() => setShowChangeMenu(false)}
                  >
                    <Sparkles className="size-3.5" />
                    Search...
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          // No suggestion — ask user to pick
          <>
            <p className="text-sm text-warning mb-2 flex items-center gap-1.5">
              <AlertCircle className="size-3.5" />
              Where should this go?
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm transition-colors"
              >
                <PenLine className="size-3.5" />
                Notes
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm transition-colors"
              >
                <UserIcon className="size-3.5" />
                New contact
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm transition-colors"
              >
                <Sparkles className="size-3.5" />
                Search...
              </button>
            </div>
          </>
        )}
      </div>

      {/* Actions — + Context, Dismiss, Confirm */}
      <div className="px-5 pb-5 flex justify-end gap-2">
        {!showContextInput && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onShowContextInputChange(true)}
            className="gap-1.5 rounded-sm"
          >
            <span className="text-base leading-none">+</span>
            Context
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onDismiss}
          className="gap-2 rounded-sm"
        >
          <X className="size-3.5" />
          Dismiss
        </Button>
        <AIButton
          size="sm"
          onClick={onConfirm}
          className="gap-2"
        >
          <CheckCircle2 className="size-3.5" />
          Confirm
        </AIButton>
      </div>
    </>
  );
}

function GoalSuggestionCard({
  capture,
  player,
  playName,
}: {
  capture: MockCapture;
  player: MockPlayer;
  playName: string;
}) {
  const suggestion = capture.goalSuggestion;
  if (!suggestion) return null;

  const PlayerIcon = player.icon;

  return (
    <Card className="rounded-xl border-primary/20 bg-primary/5 p-4">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background">
            <Play className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Sparkles className="size-3" />
                Play suggested
              </Badge>
              <span className="text-xs text-muted-foreground">from Capture</span>
            </div>
            <p className="text-sm font-medium">{suggestion.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {suggestion.description}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Prepared by
          </p>
          <div className="flex items-center gap-2">
            <Avatar className="size-7">
              <AvatarFallback className={player.avatarColor}>{player.avatar}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{player.name}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{player.role}</p>
            </div>
            <PlayerIcon className="size-4 text-muted-foreground" />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Why Salt suggested this
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              The capture includes a clear goal, connected source context, and a next
              workflow Salt can prepare for approval.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-background p-3">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              What Salt prepared
            </p>
            <div className="space-y-1.5">
              {suggestion.steps.slice(0, 3).map((step, index) => (
                <div key={step} className="flex items-center gap-2 text-xs">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3">
          <p className="text-[11px] text-muted-foreground">
            Uses {playName}, then adapts it to this capture.
          </p>
          <AIButton
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => openAskSaltFromCapture(suggestion.prompt)}
          >
            <Play className="size-3.5" />
            Draft Play
          </AIButton>
        </div>
      </div>
    </Card>
  );
}

function openAskSaltFromCapture(prompt: string) {
  window.dispatchEvent(
    new CustomEvent("salt:open-ask-salt", {
      detail: {
        prompt,
        mode: "capture",
        autoSubmit: true,
      },
    })
  );
}

// ============================================================================
// STREAM VIEW — All captures with filters
// ============================================================================

const STREAM_FILTERS: { label: string; value: StreamFilter }[] = [
  { label: "All", value: "all" },
  { label: "Added", value: "added" },
  { label: "Found", value: "found" },
];

function StreamView() {
  const [filter, setFilter] = React.useState<StreamFilter>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showFilterMenu, setShowFilterMenu] = React.useState(false);

  const filteredCaptures = MOCK_CAPTURES.filter((c) => {
    // Source filter
    if (filter === "added" && c.source !== "user") return false;
    if (filter === "found" && c.source !== "ambient") return false;
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      if (!c.content.toLowerCase().includes(query)) return false;
    }
    return true;
  });

  // Group captures by time period
  const groupedCaptures = React.useMemo(() => {
    const groups: Record<string, typeof filteredCaptures> = {
      today: [],
      yesterday: [],
      this_week: [],
      older: [],
    };
    filteredCaptures.forEach((cap) => {
      groups[cap.dateGroup].push(cap);
    });
    return groups;
  }, [filteredCaptures]);

  const hasActiveFilters = filter !== "all";

  return (
    <div className="flex flex-col">
      {/* Filters — search on left, filter dropdown on right */}
      <div className="flex items-center justify-between gap-4 mb-6">
        {/* Search + Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search captures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="size-3" />
            Refresh
          </button>
        </div>

        {/* Filter dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFilterMenu((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 text-sm border rounded-lg transition-colors",
              hasActiveFilters
                ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/15"
                : "bg-foreground/5 text-foreground border-border hover:bg-foreground/10"
            )}
          >
            <Filter className="size-3.5" />
            <span>{STREAM_FILTERS.find((f) => f.value === filter)?.label ?? "All"}</span>
            <ChevronDown className="size-3.5 opacity-50" />
          </button>
          {showFilterMenu && (
            <div className="absolute right-0 top-full mt-1 z-10 w-48 bg-card border border-border rounded-lg shadow-lg py-1">
              <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Source
              </div>
              {STREAM_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => {
                    setFilter(f.value);
                    setShowFilterMenu(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors flex items-center justify-between",
                    filter === f.value && "bg-muted"
                  )}
                >
                  <span>{f.label}</span>
                  {filter === f.value && <CheckCircle2 className="size-3.5 text-primary" />}
                </button>
              ))}
              {hasActiveFilters && (
                <>
                  <div className="my-1 border-t border-border" />
                  <button
                    type="button"
                    onClick={() => {
                      setFilter("all");
                      setShowFilterMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Capture list — grouped by time */}
      <div className="space-y-6">
        {groupedCaptures.today.length > 0 && (
          <CaptureGroup label="Today" captures={groupedCaptures.today} />
        )}
        {groupedCaptures.yesterday.length > 0 && (
          <CaptureGroup label="Yesterday" captures={groupedCaptures.yesterday} />
        )}
        {groupedCaptures.this_week.length > 0 && (
          <CaptureGroup label="This Week" captures={groupedCaptures.this_week} />
        )}
        {groupedCaptures.older.length > 0 && (
          <CaptureGroup label="Older" captures={groupedCaptures.older} />
        )}
      </div>

      {filteredCaptures.length === 0 && (
        <Card className="p-12 text-center rounded-xl">
          <PenLine className="size-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">No captures found</p>
          <p className="text-xs text-muted-foreground">
            Try adjusting your search or filters.
          </p>
        </Card>
      )}
    </div>
  );
}

function CaptureGroup({
  label,
  captures,
}: {
  label: string;
  captures: MockCapture[];
}) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        {label}
      </h3>
      <Card className="rounded-xl overflow-hidden divide-y divide-border/50">
        {captures.map((cap) => (
          <CaptureRow
            key={cap.id}
            id={cap.id}
            content={cap.content}
            ago={cap.ago}
            source={cap.source}
            status={cap.status}
            goalSuggestion={cap.goalSuggestion}
            sourceRefs={cap.sourceRefs}
            routedTo={cap.routedTo.map((r) => ({
              label: r.label,
              entityType: r.entityType,
              isAutoRouted: r.isAutoRouted,
            }))}
            isExpanded={expandedId === cap.id}
            onToggle={() => setExpandedId(expandedId === cap.id ? null : cap.id)}
          />
        ))}
      </Card>
    </div>
  );
}

// ============================================================================
// NOTES VIEW — Personal context, reflections that don't need routing
// ============================================================================

type NotesCategoryFilter = "all" | "pinned" | "ideas" | "reminders";
type NotesTimeFilter = "all" | "today" | "this_week" | "this_month";

const NOTES_CATEGORY_FILTERS: { label: string; value: NotesCategoryFilter }[] = [
  { label: "All", value: "all" },
  { label: "Pinned", value: "pinned" },
  { label: "Ideas", value: "ideas" },
  { label: "Reminders", value: "reminders" },
];

const NOTES_TIME_FILTERS: { label: string; value: NotesTimeFilter }[] = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" },
];

// Demo notes entries with date grouping
const MOCK_NOTES_ENTRIES = [
  {
    id: "nb_001",
    content: "Annual planning: consider inviting the whole team this time",
    date: "2026-05-19",
    dateLabel: "Monday, May 19",
    timeGroup: "today" as const,
    isPinned: false,
    category: "ideas" as const,
  },
  {
    id: "nb_002",
    content: "Conference contacts to follow up:\n- Sarah (fintech)\n- Marcus (design agency)",
    date: "2026-05-19",
    dateLabel: "Monday, May 19",
    timeGroup: "today" as const,
    isPinned: false,
    category: "reminders" as const,
  },
  {
    id: "nb_003",
    content: "Q4 budget is tight. Be conservative on new tool purchases.",
    date: "2026-05-18",
    dateLabel: "Sunday, May 18",
    timeGroup: "this_week" as const,
    isPinned: true,
    category: "reminders" as const,
  },
  {
    id: "nb_004",
    content: "Look into that automation tool Mike mentioned",
    date: "2026-05-18",
    dateLabel: "Sunday, May 18",
    timeGroup: "this_week" as const,
    isPinned: false,
    category: "ideas" as const,
  },
  {
    id: "nb_005",
    content: "Client onboarding still feels clunky. Revisit after launch.",
    date: "2026-05-12",
    dateLabel: "Monday, May 12",
    timeGroup: "this_month" as const,
    isPinned: false,
    category: "ideas" as const,
  },
];

function NotesView() {
  const [categoryFilter, setCategoryFilter] = React.useState<NotesCategoryFilter>("all");
  const [timeFilter, setTimeFilter] = React.useState<NotesTimeFilter>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showFilterMenu, setShowFilterMenu] = React.useState(false);

  const filteredEntries = MOCK_NOTES_ENTRIES.filter((entry) => {
    // Category filter
    if (categoryFilter === "pinned" && !entry.isPinned) return false;
    if (categoryFilter === "ideas" && entry.category !== "ideas") return false;
    if (categoryFilter === "reminders" && entry.category !== "reminders") return false;
    // Time filter
    if (timeFilter !== "all" && entry.timeGroup !== timeFilter) return false;
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      if (!entry.content.toLowerCase().includes(query)) return false;
    }
    return true;
  });

  // Group by date
  const groupedByDate = React.useMemo(() => {
    const groups: Record<string, typeof filteredEntries> = {};
    filteredEntries.forEach((entry) => {
      if (!groups[entry.date]) {
        groups[entry.date] = [];
      }
      groups[entry.date].push(entry);
    });
    // Sort by date descending
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredEntries]);

  const hasActiveFilters = categoryFilter !== "all" || timeFilter !== "all";

  // Build filter label
  const getFilterLabel = () => {
    const parts: string[] = [];
    if (categoryFilter !== "all") {
      parts.push(NOTES_CATEGORY_FILTERS.find((f) => f.value === categoryFilter)?.label ?? "");
    }
    if (timeFilter !== "all") {
      parts.push(NOTES_TIME_FILTERS.find((f) => f.value === timeFilter)?.label ?? "");
    }
    return parts.length > 0 ? parts.join(" · ") : "All";
  };

  return (
    <div className="flex flex-col">
      {/* Filters — search on left, filter dropdown on right */}
      <div className="flex items-center justify-between gap-4 mb-8">
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>

        {/* Filter dropdown — combined category + time */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFilterMenu((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 text-sm border rounded-lg transition-colors",
              hasActiveFilters
                ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/15"
                : "bg-foreground/5 text-foreground border-border hover:bg-foreground/10"
            )}
          >
            <Filter className="size-3.5" />
            <span>{getFilterLabel()}</span>
            <ChevronDown className="size-3.5 opacity-50" />
          </button>
          {showFilterMenu && (
            <div className="absolute right-0 top-full mt-1 z-10 w-48 bg-card border border-border rounded-lg shadow-lg py-1">
              {/* Category section */}
              <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Category
              </div>
              {NOTES_CATEGORY_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setCategoryFilter(f.value)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors flex items-center justify-between",
                    categoryFilter === f.value && "bg-muted"
                  )}
                >
                  <span>{f.label}</span>
                  {categoryFilter === f.value && <CheckCircle2 className="size-3.5 text-primary" />}
                </button>
              ))}

              {/* Divider */}
              <div className="my-1 border-t border-border" />

              {/* Time section */}
              <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Time
              </div>
              {NOTES_TIME_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setTimeFilter(f.value)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors flex items-center justify-between",
                    timeFilter === f.value && "bg-muted"
                  )}
                >
                  <span>{f.label}</span>
                  {timeFilter === f.value && <CheckCircle2 className="size-3.5 text-primary" />}
                </button>
              ))}

              {/* Clear all */}
              {hasActiveFilters && (
                <>
                  <div className="my-1 border-t border-border" />
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter("all");
                      setTimeFilter("all");
                      setShowFilterMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    Clear all filters
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Daily pages — document-style layout */}
      <div className="space-y-8">
        {groupedByDate.map(([date, entries]) => (
          <DailyPage key={date} dateLabel={entries[0].dateLabel} entries={entries} />
        ))}
      </div>

      {filteredEntries.length === 0 && (
        <div className="text-center py-12">
          <PenLine className="size-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold mb-1">No notes yet</h3>
          <p className="text-sm text-muted-foreground">
            Personal context and reflections will appear here
          </p>
        </div>
      )}
    </div>
  );
}

function DailyPage({
  dateLabel,
  entries,
}: {
  dateLabel: string;
  entries: typeof MOCK_NOTES_ENTRIES;
}) {
  // Group entries by category
  const ideas = entries.filter((e) => e.category === "ideas");
  const reminders = entries.filter((e) => e.category === "reminders");

  return (
    <div>
      {/* Date header */}
      <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-5 pb-2 border-b border-border/50">
        {dateLabel}
      </h2>

      <div className="space-y-5">
        {/* Ideas section */}
        {ideas.length > 0 && (
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-3">
              <span className="size-1.5 rounded-[2px] bg-primary" />
              Ideas
            </span>
            <ul className="space-y-2 ml-1">
              {ideas.map((entry) => (
                <NotesBullet key={entry.id} entry={entry} />
              ))}
            </ul>
          </div>
        )}

        {/* Reminders section */}
        {reminders.length > 0 && (
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-3">
              <span className="size-1.5 rounded-[2px] bg-success" />
              Reminders
            </span>
            <ul className="space-y-2 ml-1">
              {reminders.map((entry) => (
                <NotesBullet key={entry.id} entry={entry} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function NotesBullet({ entry }: { entry: typeof MOCK_NOTES_ENTRIES[number] }) {
  return (
    <li className="flex items-start gap-3">
      {/* Bullet */}
      <span className="mt-1.5 size-1.5 rounded-full bg-muted-foreground/40 shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {entry.isPinned && <Pin className="inline size-3 text-muted-foreground mr-1.5 -mt-0.5" />}
          {entry.content}
        </p>
      </div>
    </li>
  );
}


// ============================================================================
// CAPTURE ROW (stream items - connected card style)
// ============================================================================

function getSourceBadge(source: "user" | "ambient") {
  return {
    label: source === "user" ? "Added" : "Found",
    icon: source === "user" ? PenLine : Sparkles,
  };
}

function CaptureRow({
  id,
  content,
  ago,
  source,
  status,
  goalSuggestion,
  sourceRefs,
  routedTo,
  isExpanded,
  onToggle,
}: {
  id: string;
  content: string;
  ago: string;
  source: "user" | "ambient";
  status: "auto_routed" | "pending_review" | "dismissed" | "context_added";
  goalSuggestion?: MockCapture["goalSuggestion"];
  sourceRefs?: MockSourceRef[];
  routedTo: Array<{
    label: string;
    entityType: "person" | "organization" | "project" | "action";
    isAutoRouted: boolean;
  }>;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const sourceBadge = getSourceBadge(source);
  const SourceIcon = sourceBadge.icon;
  const canUndo = status === "auto_routed";
  const player = getMockPlayer(goalSuggestion?.playerId);

  return (
    <div>
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-2">
        {/* Timestamp — mono, fixed width */}
        <span className="text-[11px] font-mono text-muted-foreground w-14 shrink-0">
          {ago}
        </span>

        {/* Source icon */}
        <div className="flex items-center justify-center size-6 rounded-md bg-muted shrink-0">
          <SourceIcon className="size-3 text-muted-foreground" />
        </div>

        {/* Content + source badge below */}
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug truncate">"{content}"</p>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-1">
            <span className={cn(
              "size-1.5 rounded-[2px]",
              source === "ambient" ? "bg-primary" : "bg-muted-foreground/60"
            )} />
            {sourceBadge.label}
          </span>
        </div>

        {/* Status badge — colored based on status */}
        {status === "auto_routed" && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-success border border-success/30 bg-success/5 rounded shrink-0">
            <CheckCircle2 className="size-2.5" />
            Auto-routed
          </span>
        )}
        {status === "pending_review" && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-warning border border-warning/30 bg-warning/5 rounded shrink-0">
            <AlertCircle className="size-2.5" />
            Pending
          </span>
        )}
        {status === "dismissed" && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border border-border rounded shrink-0">
            <X className="size-2.5" />
            Dismissed
          </span>
        )}
        {status === "context_added" && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-primary border border-primary/30 bg-primary/5 rounded shrink-0">
            <Plus className="size-2.5" />
            Added context
          </span>
        )}

        {/* Undo button - always visible */}
        {canUndo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: implement undo
            }}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <Undo2 className="size-2.5" />
            Undo
          </button>
        )}

        {/* Expand button with chevron */}
        <button
          type="button"
          onClick={onToggle}
          className="p-1 rounded hover:bg-muted transition-colors shrink-0"
        >
          <ChevronRight className={cn(
            "size-3.5 text-muted-foreground/60 transition-transform",
            isExpanded && "rotate-90"
          )} />
        </button>
      </div>

      {/* Expanded content — Salt's thought process */}
      {isExpanded && (
        <div className="px-4 pb-3 bg-muted/20 animate-in slide-in-from-top-1 duration-200">
          <div className="ml-[calc(3.5rem+1.5rem+0.75rem)] space-y-3">
            {/* Section: Captured */}
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                Captured
              </p>
              <p className="text-sm leading-relaxed">"{content}"</p>
              <SourceTrail refs={sourceRefs} compact />
            </div>

            {/* Section: What Salt extracted */}
            {routedTo.length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                  Salt extracted
                </p>
                <div className="space-y-0.5">
                  {routedTo.map((r, idx) => {
                    const entityLabel = {
                      person: "person",
                      organization: "organization",
                      project: "project",
                      action: "action",
                    }[r.entityType];
                    return (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{r.label}</span>
                        <span className="text-muted-foreground">, {entityLabel}</span>
                        {r.isAutoRouted && (
                          <Sparkles className="size-3 text-muted-foreground" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {goalSuggestion && player && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                  Suggested Play
                </p>
                <div className="flex items-start gap-3">
                  <Avatar className="size-7">
                    <AvatarFallback>{player.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{goalSuggestion.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {player.name} can draft this from captured context.
                    </p>
                  </div>
                  <AIButton
                    size="sm"
                    className="h-7 gap-1.5"
                    onClick={() => openAskSaltFromCapture(goalSuggestion.prompt)}
                  >
                    <Play className="size-3" />
                    Draft
                  </AIButton>
                </div>
              </div>
            )}

            {/* Section: Source + status */}
            <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground pt-2 mt-1 border-t border-border/50">
              <span>
                {source === "ambient"
                  ? sourceRefs?.length
                    ? "Found by Salt from connected sources"
                    : "Found by Salt"
                  : "Added by you"}
              </span>
              {status === "auto_routed" && (
                <>
                  <span>·</span>
                  <span>Auto-routed</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

