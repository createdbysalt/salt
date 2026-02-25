"use client";

import Link from "next/link";
import {
  Receipt,
  CheckCircle2,
  UserPlus,
  FileCheck,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import type { RecentWin } from "@/app/actions/insights/types";

interface RecentWinsProps {
  wins: RecentWin[];
}

const WIN_ICONS = {
  invoice_paid: Receipt,
  project_completed: CheckCircle2,
  new_client: UserPlus,
  proposal_accepted: FileCheck,
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RecentWins({ wins }: RecentWinsProps) {
  if (wins.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Recent Wins
          </CardTitle>
          <CardDescription>Your achievements will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Sparkles className="size-8 mb-3 opacity-50" />
            <p className="text-sm font-medium">No wins yet</p>
            <p className="text-xs mt-1">
              Complete projects, onboard clients, and close deals to see your
              progress here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          Recent Wins
        </CardTitle>
        <CardDescription>Last 14 days</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {wins.map((win) => {
          const Icon = WIN_ICONS[win.type];
          return (
            <Link
              key={win.id}
              href={win.href}
              className="flex items-start gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-muted/50"
            >
              <div className="mt-0.5 rounded-full bg-primary/10 p-1.5">
                <Icon className="size-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight truncate">
                  {win.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {win.subtitle} · {formatRelativeTime(win.timestamp)}
                </p>
              </div>
              {win.amount && (
                <span className="text-sm font-medium text-primary tabular-nums">
                  +${win.amount.toLocaleString()}
                </span>
              )}
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
