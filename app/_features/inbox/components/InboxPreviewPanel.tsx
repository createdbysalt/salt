"use client";

import Link from "next/link";
import {
  Clock,
  MoreHorizontal,
  MessageSquare,
  Users,
  ExternalLink,
  Send,
  Video,
  Flag,
  Calendar,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Undo2,
} from "lucide-react";
import { useInbox } from "../contexts/InboxContext";
import {
  Button,
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui";
import { SnoozeDropdown } from "./SnoozeDropdown";
import type { InboxItem } from "../types";

// =============================================================================
// HELPERS
// =============================================================================

function formatTimeIndicator(item: InboxItem): string {
  const now = new Date();
  const created = new Date(item.created_at);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // For meetings, show "In X hours" if upcoming
  if (item.type === "meeting" && item.metadata?.start_time) {
    const startTime = new Date(item.metadata.start_time as string);
    const untilMs = startTime.getTime() - now.getTime();
    if (untilMs > 0) {
      const untilHours = Math.floor(untilMs / (1000 * 60 * 60));
      const untilMins = Math.floor(untilMs / (1000 * 60));
      if (untilHours >= 1) return `In ${untilHours}h`;
      return `In ${untilMins}m`;
    }
  }

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

function formatAmount(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Get the "WHO" - the main person/entity
function getWhoName(item: InboxItem): string {
  if (item.type === "message") return item.title; // Sender name
  return item.client_name || item.title;
}

// =============================================================================
// TYPE-SPECIFIC CONTENT
// =============================================================================

function MessageContent({ item }: { item: InboxItem }) {
  return (
    <div className="space-y-4">
      {/* Subject line */}
      {item.subtitle && item.subtitle !== "New message" && (
        <h3 className="text-xl font-semibold text-foreground leading-tight">
          {item.subtitle}
        </h3>
      )}

      {/* Message Preview */}
      <div className="text-base text-foreground/90 leading-relaxed whitespace-pre-wrap">
        {item.preview || (
          <span className="text-muted-foreground italic">No message preview</span>
        )}
      </div>
    </div>
  );
}

function InvoiceContent({ item }: { item: InboxItem }) {
  const meta = item.metadata as {
    amount?: number;
    currency?: string;
    status?: string;
    days_overdue?: number;
    due_date?: string;
    invoice_number?: string;
  };

  // Format due date
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const dueDate = formatDate(meta?.due_date);

  // Status badge
  const getStatusBadge = () => {
    switch (meta?.status) {
      case "paid":
        return { label: "Paid", className: "bg-success/10 text-success" };
      case "overdue":
        return { label: "Overdue", className: "bg-destructive/10 text-destructive" };
      case "pending":
        return { label: "Pending", className: "bg-amber-500/10 text-amber-500" };
      default:
        return { label: meta?.status || "Pending", className: "bg-muted text-muted-foreground" };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="space-y-5">
      {/* Title + Status Badge */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-foreground leading-tight">
              {item.title}
            </h3>
            {meta?.invoice_number && (
              <p className="text-sm text-muted-foreground mt-1">
                #{meta.invoice_number}
              </p>
            )}
          </div>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
            {statusBadge.label}
          </span>
        </div>
      </div>

      {/* Amount - the hero metric */}
      {meta?.amount && (
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Amount</p>
          <div className="text-3xl font-bold tracking-tight">
            {formatAmount(meta.amount, meta.currency)}
          </div>
        </div>
      )}

      {/* Due date / Overdue warning */}
      {meta?.days_overdue && meta.days_overdue > 0 ? (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="size-4" />
          <span>{meta.days_overdue}d overdue{dueDate && ` · was due ${dueDate}`}</span>
        </div>
      ) : dueDate ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="size-4" />
          <span>Due {dueDate}</span>
        </div>
      ) : null}

      {/* Description if available */}
      {item.preview && (
        <p className="text-sm text-muted-foreground leading-relaxed">{item.preview}</p>
      )}
    </div>
  );
}

function MeetingContent({ item }: { item: InboxItem }) {
  const meta = item.metadata as {
    start_time?: string;
    end_time?: string;
    duration_minutes?: number;
    attendees?: string[];
    meeting_url?: string;
  };

  const startTime = meta?.start_time ? new Date(meta.start_time) : null;
  const now = new Date();

  // Format time
  const timeStr = startTime
    ? startTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  // Format date
  const dateStr = startTime
    ? startTime.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : null;

  // Check if meeting is today
  const isToday = startTime
    ? startTime.toDateString() === now.toDateString()
    : false;

  // Time until meeting
  const getTimeBadge = () => {
    if (!startTime) return null;
    const diffMs = startTime.getTime() - now.getTime();
    if (diffMs < 0) return { label: "In progress", className: "bg-primary/10 text-primary" };
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffMins < 60) return { label: `In ${diffMins}m`, className: "bg-amber-500/10 text-amber-500" };
    if (diffHours < 24) return { label: `In ${diffHours}h`, className: "bg-muted text-muted-foreground" };
    return null;
  };

  const timeBadge = getTimeBadge();

  return (
    <div className="space-y-5">
      {/* Title + Time Badge */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-semibold text-foreground leading-tight">
            {item.title}
          </h3>
          {timeBadge && (
            <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${timeBadge.className}`}>
              {timeBadge.label}
            </span>
          )}
        </div>
      </div>

      {/* Date/Time - the hero info */}
      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">When</p>
        <div className="text-lg font-medium">
          {isToday ? "Today" : dateStr} at {timeStr}
          {meta?.duration_minutes && (
            <span className="text-muted-foreground font-normal"> · {meta.duration_minutes}m</span>
          )}
        </div>
      </div>

      {/* Attendees */}
      {meta?.attendees && meta.attendees.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4" />
          <span>{meta.attendees.join(", ")}</span>
        </div>
      )}

      {/* Description */}
      {item.preview && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {item.preview}
        </p>
      )}
    </div>
  );
}

function ProposalContent({ item }: { item: InboxItem }) {
  const meta = item.metadata as {
    amount?: number;
    currency?: string;
    status?: string;
    viewed_at?: string;
    expires_at?: string;
    sent_at?: string;
  };

  // Format dates for display
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Calculate days until expiry
  const getDaysUntilExpiry = () => {
    if (!meta?.expires_at) return null;
    const now = new Date();
    const expires = new Date(meta.expires_at);
    const days = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const daysUntilExpiry = getDaysUntilExpiry();
  const sentDate = formatDate(meta?.sent_at);
  const viewedDate = formatDate(meta?.viewed_at);

  // Status badge
  const getStatusBadge = () => {
    switch (meta?.status) {
      case "viewed":
        return { label: "Viewed", className: "bg-primary/10 text-primary" };
      case "sent":
        return { label: "Sent", className: "bg-muted text-muted-foreground" };
      case "expired":
        return { label: "Expired", className: "bg-destructive/10 text-destructive" };
      default:
        return { label: "Pending", className: "bg-muted text-muted-foreground" };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="space-y-5">
      {/* Title + Status Badge */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-semibold text-foreground leading-tight">
            {item.title}
          </h3>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
            {statusBadge.label}
          </span>
        </div>
        {sentDate && (
          <p className="text-sm text-muted-foreground">Sent {sentDate}</p>
        )}
      </div>

      {/* Amount - the hero metric */}
      {meta?.amount && (
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Value</p>
          <div className="text-3xl font-bold tracking-tight">
            {formatAmount(meta.amount, meta.currency)}
          </div>
        </div>
      )}

      {/* Status detail */}
      {meta?.status === "viewed" && viewedDate && (
        <p className="text-sm text-muted-foreground">
          Client opened this proposal on {viewedDate}
        </p>
      )}
      {meta?.status === "sent" && (
        <p className="text-sm text-muted-foreground">
          Waiting for client to view
        </p>
      )}

      {/* Expiry Warning */}
      {daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 7 && (
        <div className="flex items-center gap-2 text-sm text-amber-500">
          <Clock className="size-4" />
          <span>Expires in {daysUntilExpiry} {daysUntilExpiry === 1 ? "day" : "days"}</span>
        </div>
      )}
      {daysUntilExpiry !== null && daysUntilExpiry <= 0 && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="size-4" />
          <span>Expired</span>
        </div>
      )}
    </div>
  );
}

function MilestoneContent({ item }: { item: InboxItem }) {
  const meta = item.metadata as {
    due_date?: string;
    status?: string;
    days_until_due?: number;
  };

  // Format due date
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const dueDate = formatDate(meta?.due_date);
  const daysUntilDue = meta?.days_until_due;

  // Get urgency badge
  const getUrgencyBadge = () => {
    if (daysUntilDue === null || daysUntilDue === undefined) {
      return null;
    }
    if (daysUntilDue < 0) {
      const daysOverdue = Math.abs(daysUntilDue);
      return {
        label: `${daysOverdue}d overdue`,
        className: "bg-destructive/10 text-destructive",
      };
    }
    if (daysUntilDue === 0) {
      return { label: "Due today", className: "bg-amber-500/10 text-amber-500" };
    }
    if (daysUntilDue <= 3) {
      return { label: `${daysUntilDue}d left`, className: "bg-amber-500/10 text-amber-500" };
    }
    return null;
  };

  // Status badge
  const getStatusBadge = () => {
    switch (meta?.status) {
      case "not_started":
        return { label: "Not started", className: "bg-muted text-muted-foreground" };
      case "in_progress":
        return { label: "In progress", className: "bg-primary/10 text-primary" };
      case "blocked":
        return { label: "Blocked", className: "bg-destructive/10 text-destructive" };
      case "complete":
        return { label: "Complete", className: "bg-success/10 text-success" };
      default:
        return { label: "Pending", className: "bg-muted text-muted-foreground" };
    }
  };

  const urgencyBadge = getUrgencyBadge();
  const statusBadge = getStatusBadge();

  return (
    <div className="space-y-5">
      {/* Title + Badges */}
      <div className="space-y-3">
        <h3 className="text-xl font-semibold text-foreground leading-tight">
          {item.title}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
            {statusBadge.label}
          </span>
          {urgencyBadge && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${urgencyBadge.className}`}>
              {urgencyBadge.label}
            </span>
          )}
        </div>
      </div>

      {/* Due Date - simple and clear */}
      {dueDate && (
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Due</p>
          <div className="text-lg font-medium">{dueDate}</div>
        </div>
      )}

      {/* Description */}
      {item.preview && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {item.preview}
        </p>
      )}
    </div>
  );
}

function SeoAlertContent({ item }: { item: InboxItem }) {
  const meta = item.metadata as {
    alert_type?: string;
    severity?: string;
    category?: string;
    old_score?: number;
    new_score?: number;
  };

  // Determine if score went up or down
  const scoreChange = meta?.old_score !== undefined && meta?.new_score !== undefined
    ? meta.new_score - meta.old_score
    : null;

  const isImprovement = scoreChange !== null && scoreChange > 0;
  const isDecline = scoreChange !== null && scoreChange < 0;

  // Get severity badge
  const getSeverityBadge = () => {
    switch (meta?.severity || meta?.alert_type) {
      case "critical_score":
      case "critical":
        return { label: "Critical", className: "bg-destructive/10 text-destructive" };
      case "warning":
        return { label: "Warning", className: "bg-amber-500/10 text-amber-500" };
      case "info":
      case "improvement":
        return { label: "Info", className: "bg-primary/10 text-primary" };
      default:
        return { label: "Alert", className: "bg-muted text-muted-foreground" };
    }
  };

  const severityBadge = getSeverityBadge();

  // Format category name
  const formatCategory = (category: string | undefined) => {
    if (!category) return null;
    return category
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const categoryName = formatCategory(meta?.category);

  return (
    <div className="space-y-5">
      {/* Title + Severity Badge */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-semibold text-foreground leading-tight">
            {item.title}
          </h3>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${severityBadge.className}`}>
            {severityBadge.label}
          </span>
        </div>
      </div>

      {/* Score Change - visual comparison */}
      {scoreChange !== null && (
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
            {categoryName || "Score"} Change
          </p>
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{meta?.old_score}</p>
              <p className="text-xs text-muted-foreground">Before</p>
            </div>
            <div className={`flex items-center gap-1 ${isImprovement ? "text-success" : isDecline ? "text-destructive" : "text-muted-foreground"}`}>
              {isImprovement ? (
                <TrendingUp className="size-5" />
              ) : isDecline ? (
                <TrendingDown className="size-5" />
              ) : null}
              <span className="text-lg font-bold">
                {isImprovement ? "+" : ""}{scoreChange}
              </span>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{meta?.new_score}</p>
              <p className="text-xs text-muted-foreground">After</p>
            </div>
          </div>
        </div>
      )}

      {/* What this means - simple explanation */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        {isDecline ? (
          <>Your {categoryName?.toLowerCase() || "SEO"} score dropped. Review the report to identify issues.</>
        ) : isImprovement ? (
          <>Your {categoryName?.toLowerCase() || "SEO"} score improved. Great work!</>
        ) : (
          <>Review the SEO report for details.</>
        )}
      </p>
    </div>
  );
}

function DefaultContent({ item }: { item: InboxItem }) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <h3 className="text-xl font-semibold text-foreground leading-tight">{item.title}</h3>

      {/* Preview/Description */}
      <p className="text-base text-foreground/90 leading-relaxed">
        {item.preview || (
          <span className="text-muted-foreground italic">No additional details</span>
        )}
      </p>
    </div>
  );
}

// =============================================================================
// PRIMARY ACTION BY TYPE
// =============================================================================

function getPrimaryAction(
  item: InboxItem,
  onReply?: (id: string) => void
): React.ReactNode {
  switch (item.type) {
    case "message":
      return (
        <Button size="lg" className="w-full" onClick={() => onReply?.(item.id)}>
          <MessageSquare className="size-4 mr-2" />
          Reply
        </Button>
      );

    case "invoice":
      return (
        <div className="flex gap-3">
          <Button size="lg" className="flex-1">
            <Send className="size-4 mr-2" />
            Send Reminder
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href={item.href}>
              <ExternalLink className="size-4" />
            </Link>
          </Button>
        </div>
      );

    case "meeting":
      return (
        <Button size="lg" className="w-full" asChild>
          <Link href={(item.metadata?.meeting_url as string) || item.href}>
            <Video className="size-4 mr-2" />
            Join Meeting
          </Link>
        </Button>
      );

    case "proposal":
      return (
        <div className="flex gap-3">
          <Button size="lg" className="flex-1">
            <Send className="size-4 mr-2" />
            Send Follow-up
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href={item.href}>
              <ExternalLink className="size-4" />
            </Link>
          </Button>
        </div>
      );

    case "milestone":
      return (
        <div className="flex gap-3">
          <Button size="lg" className="flex-1" asChild>
            <Link href={item.href}>
              <Flag className="size-4 mr-2" />
              View Project
            </Link>
          </Button>
          <Button size="lg" variant="outline">
            <CheckCircle2 className="size-4 mr-2" />
            Mark Complete
          </Button>
        </div>
      );

    case "seo_alert":
      return (
        <Button size="lg" className="w-full" asChild>
          <Link href={item.href}>
            <TrendingUp className="size-4 mr-2" />
            View Full SEO Report
          </Link>
        </Button>
      );

    default:
      return (
        <Button size="lg" variant="outline" className="w-full" asChild>
          <Link href={item.href}>
            <ExternalLink className="size-4 mr-2" />
            View Details
          </Link>
        </Button>
      );
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface InboxPreviewPanelProps {
  item: InboxItem | null;
  isOpen: boolean;
  onClose: () => void;
  onArchive: (item: InboxItem) => void;
  onRestore?: (item: InboxItem) => void;
  onSnooze?: (item: InboxItem, until: Date) => void;
  onReply?: (id: string) => void;
}

export function InboxPreviewPanel({
  item,
  onArchive,
  onRestore,
  onSnooze,
  onReply,
}: InboxPreviewPanelProps) {
  const { viewMode } = useInbox();
  // Empty state - when no item is selected
  if (!item) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <div className="relative">
          {/* Inbox tray icon - styled like Linear */}
          <svg
            className="size-16 text-muted-foreground/30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Tray base */}
            <path d="M22 12h-6l-2 3h-4l-2-3H2" />
            {/* Tray outline */}
            <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
        </div>
        <p className="text-muted-foreground text-sm">
          Select a notification to view
        </p>
      </div>
    );
  }

  const whoName = getWhoName(item);
  const timeIndicator = formatTimeIndicator(item);

  // Render type-specific content
  const renderContent = () => {
    switch (item.type) {
      case "message":
        return <MessageContent item={item} />;
      case "invoice":
        return <InvoiceContent item={item} />;
      case "meeting":
        return <MeetingContent item={item} />;
      case "proposal":
        return <ProposalContent item={item} />;
      case "milestone":
        return <MilestoneContent item={item} />;
      case "seo_alert":
        return <SeoAlertContent item={item} />;
      default:
        return <DefaultContent item={item} />;
    }
  };

  // Get context line (project/client + time)
  const getContextLine = () => {
    const parts: string[] = [];
    if (item.project_name) parts.push(item.project_name);
    else if (item.client_name && item.type !== "message") parts.push(item.client_name);
    parts.push(timeIndicator);
    return parts.join(" · ");
  };

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-sm flex flex-col">
        {/* Header: WHO + Context + Actions - all in one clean block */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="size-10 shrink-0">
                <AvatarImage src={undefined} alt={whoName} />
                <AvatarFallback className="text-sm font-medium">
                  {getInitials(whoName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="font-semibold truncate">{whoName}</div>
                <div className="text-sm text-muted-foreground truncate">
                  {getContextLine()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {viewMode === "done" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRestore?.(item)}
                  title="Move back to inbox"
                  className="size-8"
                >
                  <Undo2 className="size-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onArchive(item)}
                  title="Mark as done"
                  className="size-8"
                >
                  <CheckCircle2 className="size-4" />
                </Button>
              )}
              {viewMode !== "done" && (
                <SnoozeDropdown item={item} onSnooze={onSnooze}>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Snooze"
                    className="size-8"
                  >
                    <Clock className="size-4" />
                  </Button>
                </SnoozeDropdown>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {item.client_id && (
                    <DropdownMenuItem asChild>
                      <Link href={`/studio/clients/${item.client_id}`}>
                        Go to client
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {item.project_id && (
                    <DropdownMenuItem asChild>
                      <Link href={`/studio/projects/${item.project_id}`}>
                        Go to project
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Content: THE FOCUS - clean, spacious */}
        <div className="flex-1 px-6 pb-6 overflow-y-auto">
          {renderContent()}
        </div>

        {/* Footer: Primary Action */}
        <div className="p-6 pt-4 border-t border-border">
          {getPrimaryAction(item, onReply)}
        </div>
      </div>
    </div>
  );
}
