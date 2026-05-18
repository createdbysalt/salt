"use client";

import * as React from "react";
import confetti from "canvas-confetti";
import {
  Zap,
  Plus,
  Mail,
  UserPlus,
  Receipt,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Brain,
  Workflow,
  Clock,
  Play,
  Pause,
  ArrowRight,
  Sparkles,
  Tag,
  Mic,
  Calendar,
  Bell,
  Filter,
  RotateCcw,
  Settings2,
  MoreHorizontal,
  X,
  Lock,
  Pencil,
} from "lucide-react";
import { Avatar, AvatarFallback, Button, Card, AIButton } from "@repo/ui";
import { PageBanner } from "@repo/patterns";
import { cn } from "@repo/utils";
import {
  MOCK_ACTIONS,
  MOCK_PEOPLE,
  MOCK_PLAY_TEMPLATES,
  MOCK_ACTIVE_PLAYS,
  MOCK_ACTIVITY_LOG,
  type MockAction,
  type MockPlayTemplate,
  type MockActivePlay,
  type MockActivityLogEntry,
} from "@/app/_lib/demo";

/**
 * Plays page (/plays).
 *
 * The outbox: everything AI surfaces for your approval.
 * Queue = individual drafts, Plays = multi-step sequences.
 */

type TopTab = "queue" | "playbook" | "activity";

function TabBadge({ count }: { count: number }) {
  return (
    <span
      className="ml-2 flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-light text-foreground"
      style={{ backgroundColor: "#e8e9fe" }}
    >
      {count}
    </span>
  );
}

const TABS = [
  {
    label: (
      <span className="flex items-center">
        Queue
        {MOCK_ACTIONS.length > 0 && <TabBadge count={MOCK_ACTIONS.length} />}
      </span>
    ),
    value: "queue" as const,
  },
  { label: "Playbook", value: "playbook" as const },
  { label: "Activity", value: "activity" as const },
];

function PlaysPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-12 py-8 animate-pulse">
      {/* PageBanner skeleton — matches hero size */}
      <div className="mb-6">
        {/* Eyebrow */}
        <div className="h-3 w-28 bg-muted rounded mb-3" />
        {/* Title row with action button */}
        <div className="flex items-center justify-between mb-2">
          <div className="h-9 w-24 bg-muted rounded" />
          <div className="h-8 w-24 bg-muted rounded-sm" />
        </div>
        {/* Subtitle */}
        <div className="h-4 w-56 bg-muted rounded" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-6 mb-6 border-b border-border pb-3">
        <div className="h-5 w-20 bg-muted rounded" />
        <div className="h-5 w-20 bg-muted rounded" />
        <div className="h-5 w-16 bg-muted rounded" />
      </div>

      {/* Filter chips skeleton */}
      <div className="flex gap-2 mb-6">
        <div className="h-7 w-24 bg-muted rounded-sm" />
        <div className="h-7 w-28 bg-muted rounded-sm" />
        <div className="h-7 w-20 bg-muted rounded-sm" />
      </div>

      {/* Card skeleton */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-full bg-muted" />
          <div className="flex-1">
            <div className="h-5 w-32 bg-muted rounded mb-1" />
            <div className="h-4 w-48 bg-muted rounded" />
          </div>
          <div className="h-6 w-24 bg-muted rounded-sm" />
        </div>
        <div className="space-y-2 py-4">
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-[90%] bg-muted rounded" />
          <div className="h-4 w-[75%] bg-muted rounded" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <div className="h-8 w-20 bg-muted rounded-sm" />
          <div className="h-8 w-16 bg-muted rounded-sm" />
          <div className="h-8 w-24 bg-muted rounded-sm" />
        </div>
      </div>
    </div>
  );
}

export function PlaysPage() {
  const [mounted, setMounted] = React.useState(false);
  const [topTab, setTopTab] = React.useState<TopTab>("queue");

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <PlaysPageSkeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-12 py-8">
      <PageBanner
        size="hero"
        eyebrow="READY TO SEND"
        title="Plays"
        subtitleContent={
          <div className="flex items-center gap-1.5">
            <Zap className="size-3.5 text-primary" />
            <span>One tap to approve and send</span>
          </div>
        }
        tabs={TABS}
        activeTab={topTab}
        onTabChange={(value) => setTopTab(value as TopTab)}
        fullWidthDivider
        actions={
          <AIButton size="sm">
            <Plus className="size-3.5" />
            New Play
          </AIButton>
        }
      />

      {topTab === "queue" && <FocusedQueueView />}
      {topTab === "playbook" && <PlaybookView />}
      {topTab === "activity" && <ActivityLogView />}
    </div>
  );
}

// ============================================================================
// ACTION ICON
// ============================================================================

function ActionIcon({ type, className }: { type: MockAction["type"]; className?: string }) {
  const iconClass = className || "size-4";
  switch (type) {
    case "reply_draft":
      return <Mail className={iconClass} />;
    case "outbound_check_in":
      return <UserPlus className={iconClass} />;
    case "invoice_draft":
      return <Receipt className={iconClass} />;
    case "renewal_nudge":
      return <RefreshCw className={iconClass} />;
    case "outbound_proposal":
      return <FileText className={iconClass} />;
    case "outbound_invoice":
      return <Receipt className={iconClass} />;
  }
}

function getPlayLabel(type: MockAction["type"]): string {
  switch (type) {
    case "reply_draft":
      return "Send Email Reply";
    case "outbound_check_in":
      return "Send Check-in";
    case "invoice_draft":
      return "Send Invoice";
    case "renewal_nudge":
      return "Send Renewal Reminder";
    case "outbound_proposal":
      return "Send Proposal";
    case "outbound_invoice":
      return "Send Invoice Reminder";
  }
}

// ============================================================================
// FOCUSED QUEUE VIEW — Gamified one-at-a-time approval
// ============================================================================

type QueueFilter = "approval" | "scheduled" | "team";

const QUEUE_FILTERS: { label: string; value: QueueFilter }[] = [
  { label: "Approval", value: "approval" },   // Items needing your decision
  { label: "Scheduled", value: "scheduled" }, // Already approved, going out soon
  { label: "Team", value: "team" },           // Admin view of others' queues
];

function FocusedQueueView() {
  const [filter, setFilter] = React.useState<QueueFilter>("approval");
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [processedIds, setProcessedIds] = React.useState<Set<string>>(new Set());
  const [lastAction, setLastAction] = React.useState<{
    id: string;
    action: "approved" | "dismissed" | "scheduled";
    timestamp: number;
  } | null>(null);
  const [streak, setStreak] = React.useState(0);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [animationDirection, setAnimationDirection] = React.useState<"left" | "right" | null>(null);
  const [showScheduleInput, setShowScheduleInput] = React.useState(false);
  const [scheduleTime, setScheduleTime] = React.useState("");

  // Filter actions by scope (team view excludes "You" - those are in approval queue)
  const filteredActions = MOCK_ACTIONS.filter((a) => {
    if (filter === "team") {
      return a.scope === "team" && a.ownerName !== "You";
    }
    return a.scope === filter;
  });

  // For approval queue, include multi-step plays awaiting approval
  const activePlayItems = filter === "approval"
    ? MOCK_ACTIVE_PLAYS.filter((p) => p.status === "awaiting_approval")
    : [];

  // Create unified queue: active plays first, then regular actions
  type QueueItem = { type: "action"; data: MockAction } | { type: "play"; data: MockActivePlay };
  const unifiedQueue: QueueItem[] = [
    ...activePlayItems.map((p) => ({ type: "play" as const, data: p })),
    ...filteredActions.map((a) => ({ type: "action" as const, data: a })),
  ];
  const remainingQueue = unifiedQueue.filter((item) => !processedIds.has(item.data.id));
  const currentItem = remainingQueue[currentIndex];
  const upNextItems = remainingQueue.slice(currentIndex + 1, currentIndex + 4);

  // For backwards compat with existing code
  const currentAction = currentItem?.type === "action" ? currentItem.data : null;
  const currentPlay = currentItem?.type === "play" ? currentItem.data : null;
  const remainingActions = filteredActions.filter((a) => !processedIds.has(a.id));
  const upNextActions = remainingActions.slice(currentIndex + 1, currentIndex + 3);
  const person = currentAction
    ? MOCK_PEOPLE.find((p) => p.id === currentAction.relatedEntityId)
    : currentPlay
    ? MOCK_PEOPLE.find((p) => p.id === currentPlay.relatedPersonId)
    : null;

  const processedInFilter = filteredActions.filter((a) => processedIds.has(a.id)).length;
  const progress = filteredActions.length > 0
    ? (processedInFilter / filteredActions.length) * 100
    : 0;

  // Reset index when filter changes
  React.useEffect(() => {
    setCurrentIndex(0);
  }, [filter]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case "a":
          if (currentAction) handleApprove();
          break;
        case "d":
          if (currentAction) handleDismiss();
          break;
        case "s":
          if (currentAction) setShowScheduleInput((prev) => !prev);
          break;
        case "arrowright":
        case "j":
          if (currentIndex < remainingActions.length - 1) setCurrentIndex((i) => i + 1);
          break;
        case "arrowleft":
        case "k":
          if (currentIndex > 0) setCurrentIndex((i) => i - 1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentAction, currentIndex, remainingActions.length]);

  // Direct approve — sends immediately
  const handleApprove = () => {
    if (!currentAction || isAnimating) return;
    setShowScheduleInput(false);
    setAnimationDirection("right");
    setIsAnimating(true);
    setStreak((s) => s + 1);

    // Celebration confetti!
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ["#4e58fc", "#22c55e", "#eab308"],
    });

    setTimeout(() => {
      setLastAction({ id: currentAction.id, action: "approved", timestamp: Date.now() });
      setProcessedIds((prev) => new Set([...prev, currentAction.id]));
      setIsAnimating(false);
      setAnimationDirection(null);
    }, 200);
  };

  // Schedule with time — moves to scheduled queue
  const handleScheduleConfirm = () => {
    if (!currentAction || isAnimating || !scheduleTime) return;
    setShowScheduleInput(false);
    setAnimationDirection("right");
    setIsAnimating(true);
    setStreak((s) => s + 1);

    // Softer confetti for scheduled
    confetti({
      particleCount: 50,
      spread: 45,
      origin: { y: 0.7 },
      colors: ["#4e58fc", "#eab308", "#f97316"],
    });

    setTimeout(() => {
      setLastAction({ id: currentAction.id, action: "scheduled", timestamp: Date.now() });
      setProcessedIds((prev) => new Set([...prev, currentAction.id]));
      setIsAnimating(false);
      setAnimationDirection(null);
      setScheduleTime("");
    }, 200);
  };

  const handleDismiss = () => {
    if (!currentAction || isAnimating) return;
    setAnimationDirection("left");
    setIsAnimating(true);
    setStreak(0);

    setTimeout(() => {
      setLastAction({ id: currentAction.id, action: "dismissed", timestamp: Date.now() });
      setProcessedIds((prev) => new Set([...prev, currentAction.id]));
      setIsAnimating(false);
      setAnimationDirection(null);
    }, 200);
  };

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

  const showUndo = lastAction && Date.now() - lastAction.timestamp < 5000;

  // Count remaining in other filters
  // Count remaining in other queues
  // Count remaining in other queues (excluding team from count when in approval/scheduled)
  const otherFiltersCount = (() => {
    if (filter === "team") {
      return MOCK_ACTIONS.filter((a) => (a.scope === "approval" || a.scope === "scheduled") && !processedIds.has(a.id)).length;
    }
    // For approval/scheduled, only show other non-team queue
    return MOCK_ACTIONS.filter((a) => a.scope !== filter && a.scope !== "team" && !processedIds.has(a.id)).length;
  })();

  // All done state
  if (remainingActions.length === 0) {
    return (
      <div className="flex flex-col">
        {/* Filter chips + reviewed count */}
        <div className="flex items-center gap-2 mb-6">
          {QUEUE_FILTERS.map((f) => {
            const count = MOCK_ACTIONS.filter((a) => a.scope === f.value && !processedIds.has(a.id)).length;
            const isActive = filter === f.value;
            const dotColor = {
              approval: "bg-primary",
              scheduled: "bg-warning",
              team: "bg-[#cbcfd8]",
            }[f.value];
            return (
              <div key={f.value} className="flex items-center">
                {/* Separator before Team (admin-only section) */}
                {f.value === "team" && (
                  <div className="h-4 w-px bg-border mx-2" />
                )}
                <button
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
                  {f.value === "team" && <Lock className="size-3 opacity-50" />}
                  {count > 0 && (
                    <span className="opacity-60">{count}</span>
                  )}
                </button>
              </div>
            );
          })}

          {/* Reviewed count — right side */}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[11px] font-mono text-muted-foreground">
              {filteredActions.length}/{filteredActions.length} reviewed
            </span>
          </div>
        </div>

        {/* Completed state card */}
        <div className="border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="size-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="size-5 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-medium mb-1">
                {`${filter.charAt(0).toUpperCase() + filter.slice(1)} queue cleared`}
              </h3>
              <p className="text-sm text-muted-foreground">
                {filteredActions.length} items reviewed
                {otherFiltersCount > 0 && ` · ${otherFiltersCount} more in other queues`}
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
      {/* Filter chips — same as StatusChip in ConnectionsPage */}
      <div className="flex items-center gap-2 mb-6">
        {QUEUE_FILTERS.map((f) => {
          const actionCount = MOCK_ACTIONS.filter((a) => a.scope === f.value && !processedIds.has(a.id)).length;
          const activePlayCount = f.value === "approval"
            ? MOCK_ACTIVE_PLAYS.filter((p) => p.status === "awaiting_approval").length
            : 0;
          const count = actionCount + activePlayCount;
          const isActive = filter === f.value;
          const dotColor = {
            approval: "bg-primary",
            scheduled: "bg-warning",
            team: "bg-[#cbcfd8]",
          }[f.value];
          return (
            <div key={f.value} className="flex items-center">
              {/* Separator before Team (admin-only section) */}
              {f.value === "team" && (
                <div className="h-4 w-px bg-border mx-2" />
              )}
              <button
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
                {f.value === "team" && <Lock className="size-3 opacity-50" />}
                {count > 0 && (
                  <span className="opacity-60">{count}</span>
                )}
              </button>
            </div>
          );
        })}

        {/* Progress — right side, mono font (only for approval queue) */}
        {filter === "approval" && (
          <div className="ml-auto flex items-center gap-3">
            {streak >= 2 && (
              <span className="text-[11px] font-mono">
                🔥 {streak}
              </span>
            )}
            <span className="text-[11px] font-mono text-muted-foreground">
              {processedInFilter}/{filteredActions.length} reviewed
            </span>
          </div>
        )}

        {/* Scheduled filter — right side */}
        {filter === "scheduled" && (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground border border-border px-2 py-0.5 hover:bg-muted/50 transition-colors"
            >
              <Calendar className="size-3" />
              All dates
              <ChevronDown className="size-3" />
            </button>
          </div>
        )}

        {/* Team filter — right side */}
        {filter === "team" && (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground border border-border px-2 py-0.5 hover:bg-muted/50 transition-colors"
            >
              <UserPlus className="size-3" />
              All members
              <ChevronDown className="size-3" />
            </button>
          </div>
        )}
      </div>

      {/* SCHEDULED VIEW — Running list of pre-approved items */}
      {filter === "scheduled" && (
        <div className="space-y-4">
          {filteredActions.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="size-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold mb-1">No scheduled plays</h3>
              <p className="text-sm text-muted-foreground">
                Approved plays will appear here before they go out
              </p>
            </div>
          ) : (
            filteredActions.map((action) => {
              const actionPerson = MOCK_PEOPLE.find((p) => p.id === action.relatedEntityId);
              return (
                <div
                  key={action.id}
                  className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
                >
                  {/* Header with scheduled time */}
                  <div className="px-5 py-4 border-b border-border/50">
                    <div className="flex items-start gap-3">
                      {actionPerson && (
                        <Avatar className="size-10 ring-2 ring-background shadow-sm">
                          <AvatarFallback className={cn("text-sm font-semibold", actionPerson.avatarColor)}>
                            {actionPerson.avatar}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{action.relatedEntityName}</p>
                          <span className="inline-flex items-center gap-1 text-[10px] text-success">
                            <CheckCircle2 className="size-3" />
                            Approved
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{action.title}</p>
                      </div>
                      {/* Scheduled time chip — prominent */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono bg-warning/10 text-warning border border-warning/20 px-2 py-0.5">
                          <Clock className="size-3" />
                          {action.scheduledFor || "Not scheduled"}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5">
                          <Zap className="size-3" />
                          {getPlayLabel(action.type)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-5 py-5">
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                      {action.draftContent}
                    </p>
                  </div>

                  {/* Actions — Edit and Reschedule only */}
                  <div className="px-5 pb-5 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 rounded-sm"
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 rounded-sm"
                    >
                      <Calendar className="size-3.5" />
                      Reschedule
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TEAM VIEW — Running list of team members' plays */}
      {filter === "team" && (
        <div className="space-y-4">
          {filteredActions.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="size-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold mb-1">No team plays</h3>
              <p className="text-sm text-muted-foreground">
                Your team's pending plays will appear here
              </p>
            </div>
          ) : (
            filteredActions.map((action) => {
              const ownerInitials = action.ownerName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2);
              return (
                <div
                  key={action.id}
                  className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
                >
                  {/* Header — Owner-centric */}
                  <div className="px-5 py-4 border-b border-border/50">
                    <div className="flex items-start gap-3">
                      <Avatar className="size-10 ring-2 ring-background shadow-sm">
                        <AvatarFallback className="text-sm font-semibold bg-muted text-muted-foreground">
                          {ownerInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold">{action.ownerName}</p>
                          {action.ownerTeam && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-sm text-muted-foreground">{action.ownerTeam}</span>
                            </>
                          )}
                          <span className="text-muted-foreground ml-1">·</span>
                          <span className="text-xs text-muted-foreground">{action.createdAgo}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          To: {action.relatedEntityName} — {action.title}
                        </p>
                      </div>
                      {/* Play type chip — right aligned */}
                      <div className="flex flex-col items-end shrink-0">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5">
                          <Zap className="size-3" />
                          {getPlayLabel(action.type)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-5 py-5">
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                      {action.draftContent}
                    </p>
                  </div>

                  {/* Actions — View and Reassign */}
                  <div className="px-5 pb-5 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 rounded-sm"
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 rounded-sm"
                    >
                      <UserPlus className="size-3.5" />
                      Reassign
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* APPROVAL QUEUE — Card stack + keyboard hints + up next */}
      {filter === "approval" && (
        <>
        {/* Unified queue — shows one item at a time (play or action) */}
        {currentPlay ? (
          <div className="mb-8">
            <ActivePlayCard play={currentPlay} />
          </div>
        ) : currentAction ? (
        <div className="relative mb-8">
        {upNextItems.length > 1 && (
          <div className="absolute inset-x-4 top-3 h-full rounded-2xl bg-card border border-border/30 -z-20" />
        )}
        {upNextItems.length > 0 && (
          <div className="absolute inset-x-2 top-1.5 h-full rounded-2xl bg-card border border-border/40 -z-10" />
        )}

        <div
          className={cn(
            "relative rounded-2xl bg-card border border-border shadow-lg overflow-hidden transition-all duration-200",
            isAnimating && animationDirection === "right" && "translate-x-4 opacity-0",
            isAnimating && animationDirection === "left" && "-translate-x-4 opacity-0"
          )}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border/50">
            <div className="flex items-start gap-3">
              {person && (
                <Avatar className="size-10 ring-2 ring-background shadow-sm">
                  <AvatarFallback className={cn("text-sm font-semibold", person.avatarColor)}>
                    {person.avatar}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{currentAction.relatedEntityName}</p>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{currentAction.createdAgo}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{currentAction.title}</p>
              </div>
              {/* Play type chip — top right */}
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 shrink-0">
                <Zap className="size-3" />
                {getPlayLabel(currentAction.type)}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 py-5">
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
              {currentAction.draftContent}
            </p>
          </div>

          {/* Why this? — Structured layout */}
          <div className="px-5 pb-4">
            <details className="group">
              <summary className="inline-flex items-center gap-1.5 text-xs text-primary cursor-pointer hover:opacity-80 transition-opacity">
                <Sparkles className="size-3" />
                <span>Why this?</span>
                <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50 text-xs space-y-2">
                {/* Trigger + Confidence chip — top row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground/70 shrink-0 w-16">Trigger</span>
                    <span className="text-muted-foreground">{currentAction.triggerReason}</span>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground border border-border px-2 py-0.5 shrink-0">
                    {currentAction.confidence}% confidence
                  </span>
                </div>
                {/* Context */}
                <div className="flex items-start gap-2 pb-1">
                  <span className="text-muted-foreground/70 shrink-0 w-16">Context</span>
                  <span className="text-muted-foreground">{currentAction.contextUsed.join(" · ")}</span>
                </div>
                {/* Guardrail */}
                {currentAction.isCommitmentDetected && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground/70 shrink-0 w-16">Guardrail</span>
                    <span className="text-muted-foreground">Contains a promise — review dates</span>
                  </div>
                )}
              </div>
            </details>
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 space-y-3">
            {/* Inline schedule input */}
            {showScheduleInput && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg animate-in slide-in-from-top-2 duration-200">
                <Clock className="size-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && scheduleTime) {
                      handleScheduleConfirm();
                    } else if (e.key === "Escape") {
                      setShowScheduleInput(false);
                      setScheduleTime("");
                    }
                  }}
                  placeholder="e.g., Tomorrow 9am, Friday 2pm..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                  autoFocus
                />
                <span className="text-[10px] text-muted-foreground">
                  <kbd className="px-1 py-0.5 rounded bg-muted font-mono">Enter</kbd> to confirm
                </span>
                <button
                  type="button"
                  onClick={() => { setShowScheduleInput(false); setScheduleTime(""); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowScheduleInput(!showScheduleInput)}
                disabled={isAnimating}
                className="gap-2 text-muted-foreground"
              >
                <Calendar className="size-3.5" />
                Schedule
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDismiss}
                  disabled={isAnimating}
                  className="gap-2 rounded-sm"
                >
                  <X className="size-3.5" />
                  Dismiss
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isAnimating}
                  className="gap-2 rounded-sm"
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
                <AIButton
                  size="sm"
                  onClick={handleApprove}
                  disabled={isAnimating}
                  className="gap-2"
                >
                  <Zap className="size-3.5" />
                  Approve
                </AIButton>
              </div>
            </div>
          </div>
        </div>
      </div>
        ) : null}

      {/* Keyboard hints */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/50 mb-6">
        <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">A</kbd> approve</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">S</kbd> schedule</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">D</kbd> dismiss</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">←→</kbd> navigate</span>
      </div>

      {/* Up next preview — unified queue (plays + actions) */}
      {upNextItems.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-medium text-muted-foreground mb-2">Up next</p>
          <div className="flex flex-col gap-1.5">
            {upNextItems.slice(0, 3).map((item, idx) => {
              const isPlay = item.type === "play";
              const play = isPlay ? item.data : null;
              const action = !isPlay ? item.data : null;
              const nextPerson = MOCK_PEOPLE.find((p) =>
                isPlay ? p.id === play?.relatedPersonId : p.id === action?.relatedEntityId
              );
              const name = isPlay ? play?.relatedPersonName : action?.relatedEntityName;
              const title = isPlay ? play?.name : action?.title;
              const timeAgo = isPlay ? "Step awaiting" : action?.createdAgo;
              const playLabel = isPlay ? play?.name : action ? getPlayLabel(action.type) : "";

              return (
                <div
                  key={item.data.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30 border border-border/30",
                    idx === 0 && "bg-muted/50"
                  )}
                >
                  {nextPerson && (
                    <Avatar className="size-6 shrink-0">
                      <AvatarFallback className={cn("text-[10px] font-medium", nextPerson.avatarColor)}>
                        {nextPerson.avatar}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm truncate">{name}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground shrink-0">{timeAgo}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {title}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 shrink-0">
                    <Zap className="size-3" />
                    {playLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
        </>
      )}

      {/* Undo toast — centered relative to content area (offset for sidebar) */}
      {showUndo && (
        <div className="fixed bottom-6 left-[calc(50%+7rem)] -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-4 px-5 py-2.5 bg-card border border-border shadow-lg">
            <div className="flex items-center gap-2">
              {lastAction.action === "approved" ? (
                <CheckCircle2 className="size-4 text-success" />
              ) : lastAction.action === "scheduled" ? (
                <Clock className="size-4 text-warning" />
              ) : (
                <X className="size-4 text-muted-foreground" />
              )}
              <span className="text-sm text-foreground">
                {lastAction.action === "approved" ? "Approved" : lastAction.action === "scheduled" ? "Scheduled" : "Dismissed"}
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

// ============================================================================
// PLAYBOOK VIEW — Templates
// ============================================================================

type TemplateFilter = "all" | "custom" | "presets";

const TEMPLATE_FILTERS: { label: string; value: TemplateFilter }[] = [
  { label: "All", value: "all" },
  { label: "Custom", value: "custom" },
  { label: "Presets", value: "presets" },
];

function PlaybookView() {
  const [selectedTemplate, setSelectedTemplate] = React.useState<MockPlayTemplate | null>(null);
  const [filter, setFilter] = React.useState<TemplateFilter>("all");

  const filteredTemplates = MOCK_PLAY_TEMPLATES.filter((t) => {
    if (filter === "all") return true;
    if (filter === "custom") return t.source === "custom";
    if (filter === "presets") return t.source === "preset";
    return true;
  });

  return (
    <div className="flex flex-col">
      {/* Filter chips — same style as Queue filters */}
      <div className="flex items-center gap-2 mb-6">
        {TEMPLATE_FILTERS.map((f) => {
          const count = f.value === "all"
            ? MOCK_PLAY_TEMPLATES.length
            : MOCK_PLAY_TEMPLATES.filter((t) =>
                f.value === "custom" ? t.source === "custom" : t.source === "preset"
              ).length;
          const isActive = filter === f.value;
          const dotColor = {
            all: "bg-primary",
            custom: "bg-success",
            presets: "bg-info",
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
      </div>

      {/* Content */}
      {selectedTemplate ? (
        <TemplateDetailView
          template={selectedTemplate}
          onBack={() => setSelectedTemplate(null)}
        />
      ) : (
        <TemplatesGrid templates={filteredTemplates} onSelectTemplate={setSelectedTemplate} />
      )}
    </div>
  );
}

function TemplatesGrid({
  templates,
  onSelectTemplate,
}: {
  templates: MockPlayTemplate[];
  onSelectTemplate: (t: MockPlayTemplate) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {templates.map((template) => (
        <PlayTemplateCard
          key={template.id}
          template={template}
          onClick={() => onSelectTemplate(template)}
        />
      ))}
    </div>
  );
}

function TemplateDetailView({
  template,
  onBack,
}: {
  template: MockPlayTemplate;
  onBack: () => void;
}) {
  const Icon = template.icon;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight className="size-3.5 rotate-180" />
        Back to Playbook
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-muted">
            <Icon className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{template.name}</h2>
            <p className="text-sm text-muted-foreground">{template.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings2 className="size-3.5 mr-1.5" />
            Edit
          </Button>
          <AIButton size="sm">
            <Play className="size-3.5" />
            Run Now
          </AIButton>
        </div>
      </div>

      {/* Trigger Section */}
      <Card className="p-5 rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Trigger</h3>
        </div>
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          {template.trigger.type === "automatic" ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">
                <Zap className="size-3" />
                Automatic
              </span>
              <span className="text-sm">{template.trigger.condition}</span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted text-muted-foreground rounded-md text-xs font-medium">
              <Play className="size-3" />
              Manual only
            </span>
          )}
        </div>
      </Card>

      {/* Autonomy Section */}
      <Card className="p-5 rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Autonomy</h3>
        </div>
        <div className="space-y-2">
          <AutonomyOption
            selected={template.autonomy === "approval_required"}
            label="Draft for approval"
            description="SALT drafts each step and waits for your approval"
          />
          <AutonomyOption
            selected={template.autonomy === "auto_run"}
            label="Auto-run"
            description="SALT executes without asking"
          />
          <AutonomyOption
            selected={template.autonomy === "auto_run_notify"}
            label="Auto-run with notification"
            description="SALT executes and notifies you afterward"
          />
        </div>
      </Card>

      {/* Steps Section */}
      <Card className="p-5 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Workflow className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Steps</h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {template.stepCount} steps · ~{template.estimatedMinutes} min
          </span>
        </div>
        <div className="space-y-2">
          {template.steps.map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group"
            >
              <span className="flex items-center justify-center size-6 rounded-full bg-muted text-xs font-mono font-medium">
                {i + 1}
              </span>
              <span className="text-sm flex-1">{step}</span>
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="flex items-center gap-2 p-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-lg w-full transition-colors"
          >
            <Plus className="size-3.5" />
            Add step
          </button>
        </div>
      </Card>

      {/* Stats */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <span>Last run: {template.lastRun || "Never"}</span>
        <span>Total runs: {template.totalRuns}</span>
      </div>
    </div>
  );
}

function AutonomyOption({
  selected,
  label,
  description,
}: {
  selected: boolean;
  label: string;
  description: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
        selected
          ? "border-primary/30 bg-primary/5"
          : "border-transparent bg-muted/30 hover:bg-muted/50"
      )}
    >
      <div
        className={cn(
          "size-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center",
          selected ? "border-primary" : "border-muted-foreground/30"
        )}
      >
        {selected && <div className="size-2 rounded-full bg-primary" />}
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ActivePlayCard({ play }: { play: MockActivePlay }) {
  const progress = (play.currentStep / play.totalSteps) * 100;
  const currentStepLabel = play.stepLabels[play.currentStep - 1];
  const person = MOCK_PEOPLE.find((p) => p.id === play.relatedPersonId);

  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
      {/* Header — Person-centric like Queue items */}
      <div className="px-5 py-4 border-b border-border/50">
        <div className="flex items-start gap-3">
          {person && (
            <Avatar className="size-10 ring-2 ring-background shadow-sm">
              <AvatarFallback className={cn("text-sm font-semibold", person.avatarColor)}>
                {person.avatar}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold">{play.relatedPersonName}</p>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{play.subject}</span>
            </div>
            <p className="text-xs text-muted-foreground">{play.name}</p>
          </div>
          {/* Play name chip */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5">
              <Zap className="size-3" />
              {play.name}
            </span>
          </div>
        </div>

        {/* Compact step progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>
              Step {play.currentStep} of {play.totalSteps} ·{" "}
              <span className="text-foreground font-medium">{currentStepLabel}</span>
            </span>
            <span className="text-[10px] font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Draft content — the actual thing to approve */}
      <div className="px-5 py-5">
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
          {play.currentStepContent}
        </p>
      </div>

      {/* Why this? — Structured layout (matches regular queue items) */}
      <div className="px-5 pb-4">
        <details className="group">
          <summary className="inline-flex items-center gap-1.5 text-xs text-primary cursor-pointer hover:opacity-80 transition-opacity">
            <Sparkles className="size-3" />
            <span>Why this?</span>
            <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50 text-xs space-y-2">
            {/* Trigger + Confidence chip — top row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground/70 shrink-0 w-16">Trigger</span>
                <span className="text-muted-foreground">{play.currentStepTrigger}</span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground border border-border px-2 py-0.5 shrink-0">
                {play.currentStepConfidence}% confidence
              </span>
            </div>
            {/* Context */}
            <div className="flex items-start gap-2 pb-1">
              <span className="text-muted-foreground/70 shrink-0 w-16">Context</span>
              <span className="text-muted-foreground">{play.currentStepContextUsed.join(" · ")}</span>
            </div>
            {/* Guardrail */}
            {play.currentStepHasGuardrail && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground/70 shrink-0 w-16">Guardrail</span>
                <span className="text-muted-foreground">Contains a promise — review dates</span>
              </div>
            )}
          </div>
        </details>
      </div>

      {/* Actions — Queue-like */}
      <div className="px-5 pb-5 flex justify-end gap-2">
        <Button variant="outline" size="sm" className="gap-1.5">
          <Pencil className="size-3.5" />
          Edit
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5">
          <X className="size-3.5" />
          Dismiss
        </Button>
        <AIButton size="sm" className="gap-1.5">
          <Zap className="size-3.5" />
          Approve Step {play.currentStep}
        </AIButton>
      </div>
    </div>
  );
}

function StepChip({
  label,
  state,
}: {
  label: string;
  state: "done" | "current" | "pending";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-muted",
        state === "current" && "ring-1 ring-primary/30"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-[2px] shrink-0",
          state === "done" && "bg-success",
          state === "current" && "bg-primary animate-pulse",
          state === "pending" && "bg-muted-foreground/40"
        )}
      />
      <span className="text-[10px] font-mono font-medium text-foreground/80 uppercase truncate max-w-[100px]">
        {label}
      </span>
    </div>
  );
}

function PlayTemplateCard({
  template,
  onClick,
}: {
  template: MockPlayTemplate;
  onClick?: () => void;
}) {
  const Icon = template.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group text-left rounded-xl border border-border/60 bg-card p-4",
        "hover:border-foreground/20 hover:shadow-sm transition-all"
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="flex items-center justify-center size-9 rounded-md bg-muted">
          <Icon className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">{template.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {template.description}
          </p>
        </div>
      </div>

      {/* Trigger & Autonomy indicators — StatusPill pattern: neutral bg + colored dot */}
      <div className="flex items-center gap-2 mb-3">
        {template.trigger.type === "automatic" ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded-sm">
            <span className="size-1.5 rounded-[2px] bg-primary" />
            <span className="font-mono text-[11px] text-foreground">Auto</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded-sm">
            <span className="size-1.5 rounded-[2px] bg-muted-foreground" />
            <span className="font-mono text-[11px] text-foreground">Manual</span>
          </span>
        )}
        {template.autonomy === "approval_required" && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded-sm">
            <span className="size-1.5 rounded-[2px] bg-warning" />
            <span className="font-mono text-[11px] text-foreground">Needs approval</span>
          </span>
        )}
        {template.autonomy === "auto_run_notify" && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded-sm">
            <span className="size-1.5 rounded-[2px] bg-success" />
            <span className="font-mono text-[11px] text-foreground">Auto-runs</span>
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {template.stepCount} steps · ~{template.estimatedMinutes} min
        </span>
        <span className="flex items-center gap-0.5 text-foreground/70 group-hover:text-foreground transition-colors">
          View
          <ArrowRight className="size-3" />
        </span>
      </div>
    </button>
  );
}

// ============================================================================
// ACTIVITY LOG VIEW — Full transparency into AI decisions
// ============================================================================

type ActivityFilter = "all" | "approved" | "dismissed" | "auto_applied" | "pending";
type ActivityTypeFilter = "all" | "email" | "invoice" | "follow_up" | "label" | "capture";

function ActivityLogView() {
  const [outcomeFilter, setOutcomeFilter] = React.useState<ActivityFilter>("all");
  const [typeFilter, setTypeFilter] = React.useState<ActivityTypeFilter>("all");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const filteredLogs = MOCK_ACTIVITY_LOG.filter((entry) => {
    if (outcomeFilter !== "all" && entry.outcome !== outcomeFilter) return false;
    if (typeFilter !== "all" && entry.type !== typeFilter) return false;
    return true;
  });

  const groupedLogs = React.useMemo(() => {
    const groups: Record<string, MockActivityLogEntry[]> = {
      today: [],
      yesterday: [],
      this_week: [],
      older: [],
    };
    filteredLogs.forEach((entry) => {
      groups[entry.dateGroup].push(entry);
    });
    return groups;
  }, [filteredLogs]);

  return (
    <div className="flex flex-col">
      {/* Filters — styled like Queue filter chips */}
      <div className="flex items-center justify-end gap-2 mb-6">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="size-3" />
          Refresh
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider bg-foreground/5 text-foreground border border-border hover:bg-foreground/10 transition-colors"
        >
          <Filter className="size-3" />
          <span>All types</span>
          <ChevronDown className="size-3 opacity-50" />
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider bg-foreground/5 text-foreground border border-border hover:bg-foreground/10 transition-colors"
        >
          <Calendar className="size-3" />
          <span>All dates</span>
          <ChevronDown className="size-3 opacity-50" />
        </button>
      </div>

      {/* Activity List */}
      <div className="space-y-6">
        {groupedLogs.today.length > 0 && (
          <ActivityGroup
            label="Today"
            entries={groupedLogs.today}
            expandedId={expandedId}
            onToggleExpand={setExpandedId}
          />
        )}
        {groupedLogs.yesterday.length > 0 && (
          <ActivityGroup
            label="Yesterday"
            entries={groupedLogs.yesterday}
            expandedId={expandedId}
            onToggleExpand={setExpandedId}
          />
        )}
        {groupedLogs.this_week.length > 0 && (
          <ActivityGroup
            label="This Week"
            entries={groupedLogs.this_week}
            expandedId={expandedId}
            onToggleExpand={setExpandedId}
          />
        )}
        {groupedLogs.older.length > 0 && (
          <ActivityGroup
            label="Older"
            entries={groupedLogs.older}
            expandedId={expandedId}
            onToggleExpand={setExpandedId}
          />
        )}
      </div>

      {filteredLogs.length === 0 && (
        <Card className="p-12 text-center rounded-xl">
          <Brain className="size-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">No activity found</p>
          <p className="text-xs text-muted-foreground">
            Try adjusting your filters to see more results.
          </p>
        </Card>
      )}
    </div>
  );
}

function ActivityGroup({
  label,
  entries,
  expandedId,
  onToggleExpand,
}: {
  label: string;
  entries: MockActivityLogEntry[];
  expandedId: string | null;
  onToggleExpand: (id: string | null) => void;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        {label}
      </h3>
      <Card className="rounded-xl overflow-hidden divide-y divide-border/50">
        {entries.map((entry) => (
          <ActivityLogEntry
            key={entry.id}
            entry={entry}
            isExpanded={expandedId === entry.id}
            onToggle={() =>
              onToggleExpand(expandedId === entry.id ? null : entry.id)
            }
          />
        ))}
      </Card>
    </div>
  );
}

function ActivityLogEntry({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: MockActivityLogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const TypeIcon = getActivityTypeIcon(entry.type);
  const outcomeConfig = getOutcomeConfig(entry.outcome);

  return (
    <div className="p-4">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onToggle(); }}
        className="w-full text-left cursor-pointer"
      >
        <div className="flex items-start gap-3">
          {/* Timestamp */}
          <span className="text-xs font-mono text-muted-foreground w-16 shrink-0 pt-0.5">
            {entry.timestamp}
          </span>

          {/* Icon */}
          <div className="flex items-center justify-center size-7 rounded-md bg-muted shrink-0">
            <TypeIcon className="size-3.5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-medium">{entry.action}</p>
              {entry.playName && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5">
                  <Zap className="size-3" />
                  {entry.playName}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{entry.entityName}</p>
          </div>

          {/* Outcome badge — mono style like Queue filters */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono border",
                outcomeConfig.bg,
                outcomeConfig.text,
                outcomeConfig.border
              )}
            >
              <outcomeConfig.icon className="size-3" />
              {outcomeConfig.label}
            </span>
            {entry.canUndo && entry.undoDeadline && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                Undo
              </Button>
            )}
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                isExpanded && "rotate-180"
              )}
            />
          </div>
        </div>
      </div>

      {/* Expanded content — matches Queue "Why this?" format */}
      {isExpanded && (
        <div className="mt-4 ml-[76px]">
          <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-xs space-y-2">
            {/* Trigger + Confidence chip — top row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground/70 shrink-0 w-16">Trigger</span>
                <span className="text-muted-foreground">{entry.reasoning}</span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground border border-border px-2 py-0.5 shrink-0">
                {entry.confidence}% confidence
              </span>
            </div>
            {/* Context */}
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground/70 shrink-0 w-16">Context</span>
              <span className="text-muted-foreground">{entry.contextUsed.join(" · ")}</span>
            </div>
            {/* Edit percentage if applicable */}
            {entry.editPercent !== undefined && entry.editPercent > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground/70 shrink-0 w-16">Edited</span>
                <span className="text-muted-foreground">{entry.editPercent}% modified before sending</span>
              </div>
            )}
          </div>

          {/* User note */}
          {entry.userNote && (
            <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <span className="text-[11px] font-medium uppercase tracking-wide text-warning">
                Your note
              </span>
              <p className="text-sm text-foreground/80 mt-1">{entry.userNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getActivityTypeIcon(type: MockActivityLogEntry["type"]) {
  switch (type) {
    case "email":
      return Mail;
    case "invoice":
      return Receipt;
    case "follow_up":
      return UserPlus;
    case "label":
      return Tag;
    case "capture":
      return Mic;
    case "meeting_confirm":
      return Calendar;
    case "reminder":
      return Bell;
    default:
      return Sparkles;
  }
}

function getOutcomeConfig(outcome: MockActivityLogEntry["outcome"]) {
  switch (outcome) {
    case "approved":
      return {
        icon: CheckCircle2,
        label: "Approved",
        bg: "bg-success/10",
        text: "text-success",
        border: "border-success/20",
      };
    case "dismissed":
      return {
        icon: X,
        label: "Dismissed",
        bg: "bg-muted",
        text: "text-muted-foreground",
        border: "border-border",
      };
    case "auto_applied":
      return {
        icon: Zap,
        label: "Auto-applied",
        bg: "bg-primary/10",
        text: "text-primary",
        border: "border-primary/20",
      };
    case "pending":
      return {
        icon: Clock,
        label: "Pending",
        bg: "bg-warning/10",
        text: "text-warning",
        border: "border-warning/20",
      };
    case "scheduled":
      return {
        icon: Calendar,
        label: "Scheduled",
        bg: "bg-info/10",
        text: "text-info",
        border: "border-info/20",
      };
    default:
      return {
        icon: Sparkles,
        label: outcome,
        bg: "bg-muted",
        text: "text-muted-foreground",
        border: "border-border",
      };
  }
}
