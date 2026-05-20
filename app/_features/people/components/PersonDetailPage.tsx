"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Sparkles,
  Network,
  Calendar,
  MoreHorizontal,
  AlertTriangle,
  Clock,
  DollarSign,
  CheckCircle2,
  Circle,
  MessageSquare,
  CalendarDays,
  FileText,
  RefreshCw,
  Bot,
  Send,
  Pencil,
  Undo2,
  Eye,
} from "lucide-react";
import { Avatar, AvatarFallback, Button, Card, StatusPill as EntityStatusPill } from "@repo/ui";
import { cn } from "@repo/utils";
import {
  MOCK_PEOPLE,
  MOCK_ORGANIZATIONS,
  MOCK_PROJECTS,
  MOCK_ACTIONS,
  MOCK_PERSON_ACTIVITIES,
  type MockPersonActivity,
} from "@/app/_lib/demo";

/**
 * AI-First Person Detail Page
 *
 * Designed around the principle: "User is an editor, not an author."
 * AI surfaces insights, drafts actions, and maintains data.
 * User approves, corrects, and decides.
 */

type Tab = "overview" | "activity" | "work" | "payments" | "connections" | "notes";

export function PersonDetailPage({ personId }: { personId: string }) {
  const [tab, setTab] = React.useState<Tab>("overview");

  const person = MOCK_PEOPLE.find((p) => p.id === personId);
  if (!person) return null;

  const organization = person.organizationId
    ? MOCK_ORGANIZATIONS.find((o) => o.id === person.organizationId)
    : undefined;

  const personProjects = MOCK_PROJECTS.filter(
    (p) => p.organizationId === person.organizationId
  );

  const pendingActions = MOCK_ACTIONS.filter(
    (a) => a.relatedEntityId === personId && a.type !== "invoice_draft"
  );

  const personActivities = MOCK_PERSON_ACTIVITIES.filter(
    (a) => a.personId === personId
  );

  return (
    <div className="w-full px-16 py-8">
      {/* Back nav */}
      <Link
        href="/people"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="size-3.5" />
        People
      </Link>

      {/* Person header */}
      <PersonHeader person={person} organization={organization} />

      {/* AI Summary */}
      {person.aiSummary && <AISummaryCard summary={person.aiSummary} />}

      {/* Pending Actions */}
      {pendingActions.length > 0 && (
        <PendingActionsCard actions={pendingActions} />
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border">
        <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
          Overview
        </TabButton>
        <TabButton active={tab === "activity"} onClick={() => setTab("activity")}>
          Activity
        </TabButton>
        <TabButton active={tab === "work"} onClick={() => setTab("work")}>
          Work
          {personProjects.length > 0 && (
            <span className="text-[10px] text-muted-foreground ml-1">
              ({personProjects.length})
            </span>
          )}
        </TabButton>
        <TabButton active={tab === "payments"} onClick={() => setTab("payments")}>
          Payments
        </TabButton>
        <TabButton active={tab === "connections"} onClick={() => setTab("connections")}>
          Connections
        </TabButton>
        <TabButton active={tab === "notes"} onClick={() => setTab("notes")}>
          Notes
        </TabButton>
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <OverviewTab
          person={person}
          organization={organization}
          projects={personProjects}
        />
      )}
      {tab === "activity" && <ActivityTab activities={personActivities} />}
      {tab === "work" && <WorkTab projects={personProjects} />}
      {tab === "payments" && <PaymentsTab person={person} />}
      {tab === "connections" && <ConnectionsPlaceholder />}
      {tab === "notes" && <NotesTab person={person} />}

      {/* Quick Actions */}
      <QuickActionsBar personName={person.name} />
    </div>
  );
}

// ============================================================================
// HEADER
// ============================================================================

function PersonHeader({
  person,
  organization,
}: {
  person: (typeof MOCK_PEOPLE)[0];
  organization: (typeof MOCK_ORGANIZATIONS)[0] | undefined;
}) {
  return (
    <div className="flex items-start gap-5 mb-6">
      <Avatar className="size-16 rounded-full">
        <AvatarFallback
          className={cn("rounded-full text-xl font-semibold", person.avatarColor)}
        >
          {person.avatar}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-semibold tracking-tight">{person.name}</h1>
          <HealthBadge status={person.healthStatus} />
        </div>
        {person.title && (
          <p className="text-sm text-muted-foreground mb-2">
            {person.title}
            {organization && (
              <>
                {" · "}
                <Link
                  href="#"
                  className="text-foreground/80 hover:text-foreground underline-offset-2 hover:underline"
                >
                  {organization.name}
                </Link>
              </>
            )}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {person.email && (
            <span className="inline-flex items-center gap-1">
              <Mail className="size-3" />
              {person.email}
            </span>
          )}
          {person.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="size-3" />
              {person.phone}
            </span>
          )}
          {person.clientSince && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3" />
              Client since {person.clientSince}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5">
          <Network className="size-3.5" />
          Show connections
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function HealthBadge({
  status,
}: {
  status: "healthy" | "needs_attention" | "at_risk";
}) {
  if (status === "healthy") return null;

  const isAtRisk = status === "at_risk";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium",
        isAtRisk
          ? "bg-destructive/10 text-destructive"
          : "bg-warning/10 text-warning"
      )}
    >
      <AlertTriangle className="size-3" />
      {isAtRisk ? "At risk" : "Needs attention"}
    </span>
  );
}

// ============================================================================
// AI SUMMARY CARD
// ============================================================================

function AISummaryCard({ summary }: { summary: string }) {
  return (
    <Card className="border-primary/15 bg-gradient-to-br from-primary/[0.03] to-transparent p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-6 bg-primary/10">
            <Bot className="size-3.5 text-primary" />
          </div>
          <h2 className="text-sm font-semibold tracking-tight">AI Summary</h2>
        </div>
        <span className="text-[10px] text-muted-foreground">Updated 2h ago</span>
      </div>
      <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>
      <button
        type="button"
        className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
      >
        <RefreshCw className="size-3" />
        Regenerate
      </button>
    </Card>
  );
}

// ============================================================================
// PENDING ACTIONS CARD
// ============================================================================

function PendingActionsCard({
  actions,
}: {
  actions: (typeof MOCK_ACTIONS)[number][];
}) {
  return (
    <Card className="border-accent/20 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-6 bg-accent/10">
            <Sparkles className="size-3.5 text-accent" />
          </div>
          <h2 className="text-sm font-semibold tracking-tight">Pending Actions</h2>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {actions.length} item{actions.length !== 1 && "s"}
        </span>
      </div>
      <div className="space-y-3">
        {actions.map((action) => (
          <div
            key={action.id}
            className="p-3 bg-muted/50 border border-border"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight mb-1">
                  {action.title}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  "{action.draftContent.slice(0, 100)}..."
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {action.createdAgo}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {action.isCommitmentDetected && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-warning">
                    <AlertTriangle className="size-3" />
                    Contains commitment
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  <Eye className="size-3" />
                  Preview
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  <Pencil className="size-3" />
                  Edit
                </Button>
                <Button variant="default" size="sm" className="h-7 text-xs gap-1">
                  <Send className="size-3" />
                  Approve & Send
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
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
        "relative flex items-center gap-1 px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-foreground" />
      )}
    </button>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab({
  person,
  organization,
  projects,
}: {
  person: (typeof MOCK_PEOPLE)[0];
  organization: (typeof MOCK_ORGANIZATIONS)[0] | undefined;
  projects: typeof MOCK_PROJECTS;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left column — Relationship + Work */}
      <div className="space-y-4">
        <StatCard title="RELATIONSHIP">
          <div className="grid grid-cols-2 gap-4">
            <StatItem
              label="Status"
              value={<RelationshipPill status={person.relationshipStatus} />}
            />
            <StatItem
              label="Health"
              value={
                <HealthIndicator
                  status={person.healthStatus}
                  score={person.activityScore}
                />
              }
            />
            <StatItem
              label="Activity"
              value={<ActivityBar score={person.activityScore} />}
            />
            <StatItem
              label="Last Contact"
              value={
                person.lastContactDays === null
                  ? "—"
                  : person.lastContactDays === 0
                    ? "Today"
                    : `${person.lastContactDays} days ago`
              }
            />
            {person.avgResponseHours && (
              <StatItem
                label="Avg Response"
                value={`${person.avgResponseHours} hours`}
              />
            )}
          </div>
        </StatCard>

        {organization && (
          <StatCard title="ORGANIZATION">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="size-8 rounded-full">
                <AvatarFallback
                  className={cn(
                    "rounded-full text-[11px] font-semibold",
                    organization.avatarColor
                  )}
                >
                  {organization.avatar}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">
                  {organization.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {organization.industry}
                </p>
              </div>
            </div>
            <Link
              href="#"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View organization →
            </Link>
          </StatCard>
        )}
      </div>

      {/* Right column — Work + Payments */}
      <div className="space-y-4">
        <StatCard title="WORK">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <StatItem
              label="Active Projects"
              value={projects.filter((p) => p.status === "active").length}
            />
            <StatItem label="Open Tasks" value={person.openTasksCount} />
            <StatItem label="Completed" value={person.completedTasksCount} />
          </div>
          {projects.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-border">
              {projects.slice(0, 2).map((project) => (
                <div key={project.id} className="flex items-center justify-between">
                  <span className="text-xs font-medium">{project.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full",
                          project.status === "stalled"
                            ? "bg-warning"
                            : "bg-foreground/70"
                        )}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums w-8">
                      {project.progress}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </StatCard>

        <StatCard title="PAYMENTS">
          <div className="grid grid-cols-2 gap-4">
            <StatItem
              label="Outstanding"
              value={
                person.outstandingAmount > 0 ? (
                  <span className="text-warning font-semibold">
                    ${person.outstandingAmount.toLocaleString()}
                  </span>
                ) : (
                  "$0"
                )
              }
            />
            <StatItem
              label="Lifetime"
              value={`$${person.lifetimeValue.toLocaleString()}`}
            />
            <StatItem
              label="Payment Health"
              value={<PaymentHealthBar />}
            />
          </div>
          {person.outstandingAmount > 0 && (
            <Link
              href="#"
              className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors inline-block"
            >
              View all invoices →
            </Link>
          )}
        </StatCard>
      </div>
    </div>
  );
}

function StatCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70 mb-3">
        {title}
      </p>
      {children}
    </Card>
  );
}

function StatItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function ActivityBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted overflow-hidden max-w-20">
        <div
          className={cn(
            "h-full transition-all",
            score >= 60 ? "bg-success" : score >= 30 ? "bg-warning" : "bg-destructive"
          )}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs tabular-nums">{score}/100</span>
    </div>
  );
}

function PaymentHealthBar() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted overflow-hidden max-w-20">
        <div className="h-full bg-success" style={{ width: "80%" }} />
      </div>
      <span className="text-xs text-muted-foreground">Good</span>
    </div>
  );
}

function HealthIndicator({
  status,
  score,
}: {
  status: "healthy" | "needs_attention" | "at_risk";
  score: number;
}) {
  const colors = {
    healthy: "text-success",
    needs_attention: "text-warning",
    at_risk: "text-destructive",
  };
  const labels = {
    healthy: "Healthy",
    needs_attention: "Needs attention",
    at_risk: "At risk",
  };
  return (
    <span className={cn("text-xs font-medium", colors[status])}>
      {labels[status]}
    </span>
  );
}

// ============================================================================
// ACTIVITY TAB
// ============================================================================

function ActivityTab({ activities }: { activities: MockPersonActivity[] }) {
  if (activities.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Clock className="size-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-medium mb-1">No activity yet</p>
        <p className="text-xs text-muted-foreground">
          AI actions and interactions will appear here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
      <button
        type="button"
        className="w-full py-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Show earlier activity...
      </button>
    </div>
  );
}

function ActivityItem({ activity }: { activity: MockPersonActivity }) {
  const iconMap: Record<MockPersonActivity["type"], React.ReactNode> = {
    ai_auto_sent: <Bot className="size-3.5 text-primary" />,
    ai_drafted: <Sparkles className="size-3.5 text-accent" />,
    user_approved: <CheckCircle2 className="size-3.5 text-success" />,
    user_sent: <Send className="size-3.5 text-foreground" />,
    ai_filed_capture: <Bot className="size-3.5 text-primary" />,
    meeting: <CalendarDays className="size-3.5 text-info" />,
    invoice_sent: <DollarSign className="size-3.5 text-foreground" />,
    invoice_paid: <CheckCircle2 className="size-3.5 text-success" />,
  };

  const statusBadge = {
    sent: { label: "Sent", className: "text-success" },
    pending: { label: "Pending", className: "text-warning" },
    filed: { label: "Filed", className: "text-muted-foreground" },
    approved: { label: "Approved", className: "text-success" },
    paid: { label: "Paid", className: "text-success" },
  };

  return (
    <div className="flex gap-3 p-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-center size-7 bg-muted shrink-0">
        {iconMap[activity.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm font-medium leading-tight">{activity.title}</p>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {activity.timestamp}
          </span>
        </div>
        {activity.content && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">
            "{activity.content}"
          </p>
        )}
        {activity.reasoning && (
          <p className="text-[10px] text-muted-foreground/70 mb-1.5">
            <span className="font-medium">Why:</span> {activity.reasoning}
          </p>
        )}
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-[10px] font-medium",
              statusBadge[activity.status].className
            )}
          >
            {statusBadge[activity.status].label}
            {activity.status === "sent" && " ✓"}
          </span>
          {activity.editPercent !== null && (
            <span className="text-[10px] text-muted-foreground">
              Edit rate: {activity.editPercent}%
            </span>
          )}
          {activity.confidence !== null && (
            <span className="text-[10px] text-muted-foreground">
              {activity.confidence}% confidence
            </span>
          )}
          {activity.status === "sent" && activity.type === "ai_auto_sent" && (
            <button
              type="button"
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-0.5"
            >
              <Undo2 className="size-2.5" />
              Undo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// WORK TAB
// ============================================================================

function WorkTab({ projects }: { projects: typeof MOCK_PROJECTS }) {
  if (projects.length === 0) {
    return (
      <Card className="p-12 text-center">
        <FileText className="size-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-medium mb-1">No active projects</p>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {projects.map((project) => (
        <Card key={project.id} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">{project.name}</p>
            <StatusPill status={project.status} />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-1.5 bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  project.status === "stalled" ? "bg-warning" : "bg-foreground/70"
                )}
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
              {project.progress}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Next: {project.nextMilestone}
          </p>
        </Card>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const meta: Record<string, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-success/10 text-success" },
    stalled: { label: "Stalled", className: "bg-warning/10 text-warning" },
    complete: { label: "Complete", className: "bg-muted text-muted-foreground" },
    on_hold: { label: "On Hold", className: "bg-muted text-muted-foreground" },
  };
  const m = meta[status] || meta.active;
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium",
        m.className
      )}
    >
      {m.label}
    </span>
  );
}

// ============================================================================
// PAYMENTS TAB
// ============================================================================

function PaymentsTab({ person }: { person: (typeof MOCK_PEOPLE)[0] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-[10px] text-muted-foreground mb-1">Outstanding</p>
          <p
            className={cn(
              "text-xl font-semibold",
              person.outstandingAmount > 0 && "text-warning"
            )}
          >
            ${person.outstandingAmount.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] text-muted-foreground mb-1">Lifetime Value</p>
          <p className="text-xl font-semibold">
            ${person.lifetimeValue.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] text-muted-foreground mb-1">Avg Pay Time</p>
          <p className="text-xl font-semibold">12 days</p>
        </Card>
      </div>
      {person.outstandingAmount === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle2 className="size-8 text-success/40 mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">All paid up</p>
          <p className="text-xs text-muted-foreground">
            No outstanding invoices.
          </p>
        </Card>
      ) : (
        <Card className="p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70 mb-3">
            Outstanding Invoices
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <p className="text-sm font-medium">Invoice #2026-Q2-012</p>
                <p className="text-xs text-muted-foreground">
                  Q2 Rebrand milestone 2
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">$4,200</p>
                <p className="text-[10px] text-warning">7 days overdue</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// NOTES TAB
// ============================================================================

function NotesTab({ person }: { person: (typeof MOCK_PEOPLE)[0] }) {
  const mockNotes = [
    {
      id: "1",
      content: "Prefers Monday calls. Kids in school until 3pm PST.",
      author: "You",
      date: "Apr 2",
    },
    {
      id: "2",
      content: "Interested in our analytics offering for Q4.",
      author: "You",
      date: "Mar 15",
    },
    {
      id: "3",
      content: "Met at SaaStr conference, introduced by Mike.",
      author: "You",
      date: "Mar 1",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium">Notes</p>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          + Add note
        </Button>
      </div>
      <div className="space-y-2">
        {mockNotes.map((note) => (
          <Card key={note.id} className="p-3">
            <p className="text-sm leading-relaxed mb-2">{note.content}</p>
            <p className="text-[10px] text-muted-foreground">
              {note.author} · {note.date}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CONNECTIONS PLACEHOLDER
// ============================================================================

function ConnectionsPlaceholder() {
  return (
    <Card className="p-12 text-center">
      <Network className="size-8 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-sm font-medium mb-1">Connection graph</p>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
        See how this person connects to others in your network.
      </p>
    </Card>
  );
}

// ============================================================================
// QUICK ACTIONS BAR
// ============================================================================

function QuickActionsBar({ personName }: { personName: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <Card className="px-4 py-2 shadow-lg border-border/50 bg-card/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <MessageSquare className="size-3.5" />
            Draft message
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <CalendarDays className="size-3.5" />
            Schedule meeting
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <DollarSign className="size-3.5" />
            Create invoice
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <FileText className="size-3.5" />
            Attach file
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function RelationshipPill({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    client: "var(--relationship-clients)",
    prospect: "var(--relationship-clients)",
    past_client: "var(--relationship-team)",
    partner: "var(--relationship-partners)",
    vendor: "var(--relationship-vendors)",
    internal: "var(--relationship-team)",
  };
  const labelMap: Record<string, string> = {
    client: "CLIENT",
    prospect: "PROSPECT",
    past_client: "PAST",
    partner: "PARTNER",
    vendor: "VENDOR",
    internal: "TEAM",
  };
  return (
    <EntityStatusPill
      color={colorMap[status] ?? "var(--relationship-team)"}
      label={labelMap[status] ?? "OTHER"}
    />
  );
}

// Keep imports stable
void Building2;
void Circle;
