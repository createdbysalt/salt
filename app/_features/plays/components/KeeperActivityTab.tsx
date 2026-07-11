"use client";

import { useMemo, useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  BookMarked,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@repo/ui";
import { cn } from "@repo/utils";
import type { ActivityEntryRow } from "../types";

type KeeperActivityTabProps = {
  initialActivity: ActivityEntryRow[];
  totalCount: number;
  hasMore: boolean;
  onLoadMore: (_offset: number) => Promise<ActivityEntryRow[]>;
};

type DayGroup = "Today" | "Yesterday" | "Earlier this week" | "Earlier";

function getDayGroup(iso: string): DayGroup {
  const date = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const entryDay = new Date(date);
  entryDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - entryDay.getTime()) / 86_400_000);

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "Earlier this week";
  return "Earlier";
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatActionLabel(action: string): string {
  const labels: Record<string, string> = {
    auto_applied: "Auto-applied",
    approved: "Approved",
    ran: "Executed",
    dismissed: "Dismissed",
    queued: "Queued",
    scheduled: "Scheduled",
    field_filled: "Field filled",
    record_created: "Record created",
    record_updated: "Record updated",
  };
  return labels[action] ?? action.replace(/_/g, " ");
}

function getActionBadgeStyle(action: string): string {
  switch (action) {
    case "auto_applied":
    case "ran":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
    case "approved":
      return "bg-sky/15 text-sky";
    case "dismissed":
      return "bg-muted text-muted-foreground";
    case "scheduled":
    case "queued":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    default:
      return "bg-foreground/8 text-foreground";
  }
}

function ActivityCard({ entry }: { entry: ActivityEntryRow }) {
  const [expanded, setExpanded] = useState(false);
  const playbookSlug =
    typeof entry.metadata?.playbook_slug === "string"
      ? entry.metadata.playbook_slug
      : null;

  return (
    <div className="group rounded-lg border border-border/60 bg-card p-4 transition-colors hover:bg-muted/30">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-sm">{entry.title}</span>
            <Badge
              variant="outline"
              className={cn("text-[10px] shrink-0 border-0", getActionBadgeStyle(entry.action))}
            >
              {formatActionLabel(entry.action)}
            </Badge>
            {playbookSlug && (
              <Badge variant="outline" className="text-[10px] shrink-0">
                {playbookSlug.replace(/-/g, " ")}
              </Badge>
            )}
          </div>
          {entry.detail && (
            <p className="text-sm text-muted-foreground line-clamp-2">{entry.detail}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {formatTime(entry.created_at)} ·{" "}
            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {entry.source_url && (
            <a
              href={entry.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition"
              title="View source"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          {entry.metadata && Object.keys(entry.metadata).length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-8 px-2"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {expanded && entry.metadata && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs font-medium text-muted-foreground mb-2">Details</p>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(entry.metadata)
              .filter(([, v]) => v != null && v !== "")
              .slice(0, 6)
              .map(([key, value]) => (
                <div key={key}>
                  <dt className="text-muted-foreground">
                    {key.replace(/_/g, " ")}
                  </dt>
                  <dd className="font-medium truncate">{String(value)}</dd>
                </div>
              ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function ActivityGroup({
  label,
  entries,
}: {
  label: DayGroup;
  entries: ActivityEntryRow[];
}) {
  if (entries.length === 0) return null;

  return (
    <section className="space-y-3">
      <header className="flex items-center gap-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
          {label}
        </p>
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {entries.length}
        </span>
      </header>
      <div className="space-y-2">
        {entries.map((entry) => (
          <ActivityCard key={entry.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}

export function KeeperActivityTab({
  initialActivity,
  totalCount,
  hasMore: initialHasMore,
  onLoadMore,
}: KeeperActivityTabProps) {
  const [activity, setActivity] = useState(initialActivity);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const groups: Record<DayGroup, ActivityEntryRow[]> = {
      Today: [],
      Yesterday: [],
      "Earlier this week": [],
      Earlier: [],
    };

    for (const entry of activity) {
      const group = getDayGroup(entry.created_at);
      groups[group].push(entry);
    }

    return groups;
  }, [activity]);

  const handleLoadMore = () => {
    startTransition(async () => {
      const currentOffset = activity.length;
      const more = await onLoadMore(currentOffset);
      if (more.length === 0) {
        setHasMore(false);
      } else {
        setActivity((prev) => [...prev, ...more]);
        if (more.length < 50) {
          setHasMore(false);
        }
      }
    });
  };

  if (activity.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookMarked className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-medium mb-2">No activity yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            When Keeper playbooks run — filling fields, creating records, or updating
            Memory — those actions will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Playbook Activity
            <Badge variant="secondary" className="ml-2">
              {totalCount} total
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            All actions taken by Keeper playbooks across your Memory records.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <ActivityGroup label="Today" entries={grouped.Today} />
          <ActivityGroup label="Yesterday" entries={grouped.Yesterday} />
          <ActivityGroup label="Earlier this week" entries={grouped["Earlier this week"]} />
          <ActivityGroup label="Earlier" entries={grouped.Earlier} />

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoading}
                className="min-w-[140px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
