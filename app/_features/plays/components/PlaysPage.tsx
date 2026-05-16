"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Search,
  Plus,
  Mail,
  UserPlus,
  Receipt,
  RefreshCw,
  ChevronDown,
  CheckCircle2,
  Brain,
  Workflow,
  Clock,
  Play,
  ArrowRight,
} from "lucide-react";
import { Avatar, AvatarFallback, Button, Card, Badge, AIButton, StatusPill } from "@repo/ui";
import { cn } from "@repo/utils";
import {
  MOCK_ACTIONS,
  MOCK_PEOPLE,
  MOCK_PLAY_TEMPLATES,
  MOCK_ACTIVE_PLAYS,
  type MockAction,
  type MockPlayTemplate,
  type MockActivePlay,
} from "@/app/_lib/demo";

/**
 * Plays page (/plays).
 *
 * The outbox: everything AI surfaces for your approval.
 * Queue = individual drafts, Plays = multi-step sequences.
 *
 * Each item has 4-part transparency: What / Why / Outcome / Correction
 */

type TopTab = "queue" | "plays" | "activity";
type QueueTab = "yours" | "team" | "all" | "unassigned";

export function PlaysPage() {
  const [topTab, setTopTab] = React.useState<TopTab>("queue");
  const [queueTab, setQueueTab] = React.useState<QueueTab>("yours");
  const [selectedActionId, setSelectedActionId] = React.useState<string | null>(
    MOCK_ACTIONS[0]?.id ?? null
  );

  const selectedAction = MOCK_ACTIONS.find((a) => a.id === selectedActionId);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="size-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Plays</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            AI-drafted items awaiting your approval.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Search className="size-4" />
          </Button>
          <AIButton
            variant="icon"
            size="sm"
            onClick={() => {
              const event = new KeyboardEvent("keydown", {
                key: "k",
                metaKey: true,
                bubbles: true,
              });
              window.dispatchEvent(event);
            }}
            title="Ask SALT · ⌘K"
          >
            <Sparkles className="size-4" />
          </AIButton>
        </div>
      </div>

      {/* Top tabs (Queue / Plays / Activity) */}
      <div className="flex items-center gap-6 border-b border-border mb-6">
        <TabButton
          active={topTab === "queue"}
          onClick={() => setTopTab("queue")}
        >
          Queue
          <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold tabular-nums">
            {MOCK_ACTIONS.length}
          </span>
        </TabButton>
        <TabButton
          active={topTab === "plays"}
          onClick={() => setTopTab("plays")}
        >
          Plays
          {MOCK_ACTIVE_PLAYS.length > 0 && (
            <span className="ml-2 text-[10px] text-muted-foreground font-normal">
              {MOCK_ACTIVE_PLAYS.length} active
            </span>
          )}
        </TabButton>
        <TabButton
          active={topTab === "activity"}
          onClick={() => setTopTab("activity")}
        >
          Activity
        </TabButton>
      </div>

      {topTab === "plays" ? (
        <PlaysPanel />
      ) : topTab === "queue" ? (
        <>
          {/* Sub-tabs (Yours / Team / All / Unassigned) */}
          <div className="flex items-center gap-1 mb-4">
            <SubTabButton
              active={queueTab === "yours"}
              onClick={() => setQueueTab("yours")}
            >
              Yours ({MOCK_ACTIONS.length})
            </SubTabButton>
            <SubTabButton
              active={queueTab === "team"}
              onClick={() => setQueueTab("team")}
            >
              Team (0)
            </SubTabButton>
            <SubTabButton
              active={queueTab === "all"}
              onClick={() => setQueueTab("all")}
            >
              All ({MOCK_ACTIONS.length})
            </SubTabButton>
            <SubTabButton
              active={queueTab === "unassigned"}
              onClick={() => setQueueTab("unassigned")}
            >
              Unassigned (0)
            </SubTabButton>
          </div>

          {/* Queue + Detail split */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4">
            <div className="space-y-2">
              {MOCK_ACTIONS.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  selected={action.id === selectedActionId}
                  onClick={() => setSelectedActionId(action.id)}
                />
              ))}
            </div>
            <div>
              {selectedAction ? (
                <ActionDetail action={selectedAction} />
              ) : (
                <Card className="p-8 text-center text-sm text-muted-foreground">
                  Select an action to review.
                </Card>
              )}
            </div>
          </div>
        </>
      ) : (
        <ActivityLogPlaceholder />
      )}
    </div>
  );
}

// ============================================================================
// TABS
// ============================================================================

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-2 pb-3 text-sm font-medium transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />
      )}
    </button>
  );
}

function SubTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
// ACTION CARD (queue item)
// ============================================================================

function ActionIcon({ type }: { type: MockAction["type"] }) {
  switch (type) {
    case "reply_draft":
      return <Mail className="size-4" />;
    case "outbound_check_in":
      return <UserPlus className="size-4" />;
    case "invoice_draft":
      return <Receipt className="size-4" />;
    case "renewal_nudge":
      return <RefreshCw className="size-4" />;
  }
}

function ActionCard({
  action,
  selected,
  onClick,
}: {
  action: MockAction;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border p-4 transition-all",
        selected
          ? "border-foreground/30 bg-card shadow-sm"
          : "border-border/60 bg-card hover:border-foreground/15"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex items-center justify-center size-8 rounded-full shrink-0",
            "bg-muted text-muted-foreground"
          )}
        >
          <ActionIcon type={action.type} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug mb-1 line-clamp-2">
            {action.title}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{action.createdAgo}</span>
            {action.isCommitmentDetected && (
              <>
                <span>·</span>
                <StatusPill color="var(--warning)" label="Guardrail" />
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// ACTION DETAIL (right pane)
// ============================================================================

function ActionDetail({ action }: { action: MockAction }) {
  const [sent, setSent] = React.useState(false);
  const [showUndo, setShowUndo] = React.useState(false);

  const handleSend = () => {
    setSent(true);
    setShowUndo(true);
    window.setTimeout(() => setShowUndo(false), 30000);
  };

  const person = MOCK_PEOPLE.find((p) => p.id === action.relatedEntityId);

  if (sent) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center size-12 rounded-full bg-success/10 text-success">
            <CheckCircle2 className="size-6" />
          </div>
          <h3 className="text-base font-semibold">Sent</h3>
          <p className="text-sm text-muted-foreground">
            Activity logged. Recipient: {action.relatedEntityName}.
          </p>
          {showUndo && (
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:opacity-70"
            >
              <span className="inline-block size-1 rounded-full bg-primary animate-pulse" />
              Undo (30s window)
            </button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-5 border-b border-border/60">
        <div className="flex items-center gap-3 mb-3">
          {person ? (
            <Avatar className="size-8 ring-1 ring-border">
              <AvatarFallback
                className={cn(
                  "text-[11px] font-semibold",
                  person.avatarColor
                )}
              >
                {person.avatar}
              </AvatarFallback>
            </Avatar>
          ) : null}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{action.relatedEntityName}</p>
            <p className="text-xs text-muted-foreground">{action.title}</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* What */}
        <Section title="Draft">
          <div className="rounded-lg bg-muted/40 p-4 text-sm leading-relaxed whitespace-pre-wrap">
            {action.draftContent}
          </div>
        </Section>

        {/* Why */}
        <Section title="Why" icon={Brain}>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {action.reasoning}
          </p>
          <div className="mt-3 space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
              Context used
            </p>
            <ul className="space-y-1">
              {action.contextUsed.map((c, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground flex items-start gap-2"
                >
                  <span className="text-muted-foreground/40 mt-1">•</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">
              Confidence{" "}
              <span className="text-foreground font-medium">
                {action.confidence}%
              </span>
            </span>
            <span className="text-muted-foreground">
              Trigger{" "}
              <span className="text-foreground font-medium">
                {action.triggerReason}
              </span>
            </span>
          </div>
          {action.isCommitmentDetected && (
            <div className="mt-3">
              <StatusPill color="var(--warning)" label="Commitment guardrail triggered — approval required" />
            </div>
          )}
        </Section>
      </div>

      <div className="border-t border-border/60 p-4 flex items-center justify-end gap-2 bg-muted/20">
        <Button variant="ghost" size="sm">
          Edit
        </Button>
        <Button variant="outline" size="sm">
          Dismiss
        </Button>
        <AIButton size="sm" onClick={handleSend} className="gap-1.5">
          <CheckCircle2 className="size-3.5" />
          Approve & Send
        </AIButton>
      </div>
    </Card>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {Icon ? <Icon className="size-3.5 text-muted-foreground" /> : null}
        <h4 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
          {title}
        </h4>
      </div>
      {children}
    </div>
  );
}

// ============================================================================
// ACTIVITY LOG PLACEHOLDER
// ============================================================================

function ActivityLogPlaceholder() {
  return (
    <Card className="p-12 text-center">
      <Brain className="size-8 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-sm font-medium mb-1">Activity log</p>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
        Every AI action — auto-sent, queued, escalated — with full reasoning and
        outcome. Coming soon.
      </p>
    </Card>
  );
}

// ============================================================================
// PLAYS PANEL — multi-step Action chains
// ============================================================================

function PlaysPanel() {
  return (
    <div className="space-y-8">
      {/* Active Plays */}
      {MOCK_ACTIVE_PLAYS.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Workflow className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold tracking-tight">
                In progress
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {MOCK_ACTIVE_PLAYS.length}{" "}
              {MOCK_ACTIVE_PLAYS.length === 1 ? "play" : "plays"} active
            </span>
          </div>
          <div className="space-y-3">
            {MOCK_ACTIVE_PLAYS.map((play) => (
              <ActivePlayCard key={play.id} play={play} />
            ))}
          </div>
        </section>
      )}

      {/* Templates */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Play className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight">Templates</h2>
          </div>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
            <Plus className="size-3.5" />
            New play
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-4 max-w-xl">
          Chain Actions into multi-step plays. AI runs each step in order,
          pausing for your approval on anything sensitive.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {MOCK_PLAY_TEMPLATES.map((template) => (
            <PlayTemplateCard key={template.id} template={template} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ActivePlayCard({ play }: { play: MockActivePlay }) {
  const progress = (play.currentStep / play.totalSteps) * 100;
  const currentStepLabel = play.stepLabels[play.currentStep - 1];

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-sm font-semibold">{play.name}</p>
            <p className="text-xs text-muted-foreground">
              {play.subject} · started {play.startedAgo}
            </p>
          </div>
          <StatusPill color="var(--warning)" label="AWAITING APPROVAL" />
        </div>

        <div className="mt-3 mb-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>
              Step {play.currentStep} of {play.totalSteps} ·{" "}
              <span className="text-foreground font-medium">
                {currentStepLabel}
              </span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1">
          {play.stepLabels.map((label, i) => (
            <StepChip
              key={i}
              label={label}
              state={
                i < play.currentStep - 1
                  ? "done"
                  : i === play.currentStep - 1
                  ? "current"
                  : "pending"
              }
            />
          ))}
        </div>
      </div>
      <div className="border-t border-border/60 p-3 flex items-center justify-end gap-2 bg-muted/20">
        <Button variant="ghost" size="sm">
          Pause
        </Button>
        <Button size="sm" className="gap-1.5">
          Review step {play.currentStep}
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </Card>
  );
}

function StepChip({
  label,
  state,
}: {
  label: string;
  state: "done" | "current" | "pending";
}) {
  const colorMap = {
    done: "var(--success)",
    current: "var(--primary)",
    pending: "var(--muted-foreground)",
  };
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
          state === "current" && "animate-pulse"
        )}
        style={{ backgroundColor: colorMap[state] }}
      />
      <span className="text-[10px] font-mono font-medium text-foreground/80 uppercase truncate max-w-[140px]">
        {label}
      </span>
    </div>
  );
}

function PlayTemplateCard({ template }: { template: MockPlayTemplate }) {
  const Icon = template.icon;
  return (
    <button
      type="button"
      className={cn(
        "group text-left rounded-xl border border-border/60 bg-card p-4",
        "hover:border-foreground/20 hover:shadow-sm transition-all"
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className={cn(
            "flex items-center justify-center size-9 rounded-md shrink-0",
            "bg-muted text-foreground"
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">{template.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {template.description}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {template.stepCount} steps · ~{template.estimatedMinutes} min
        </span>
        <span className="flex items-center gap-0.5 text-foreground/70 group-hover:text-foreground transition-colors">
          Run
          <ArrowRight className="size-3" />
        </span>
      </div>
    </button>
  );
}

// silence unused warnings for icons reserved for future use
void ChevronDown;
void Link;
