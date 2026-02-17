"use client";

import Link from "next/link";
import { Sparkles, Clock, CheckCircle2, Coffee, Inbox, FolderKanban, Users } from "lucide-react";
import { cn } from "@repo/utils";
import { Button, Card, CardContent } from "@repo/ui";
import type { InboxState } from "../types";

interface InboxEmptyStateProps {
  state: InboxState;
  hasFilters?: boolean;
}

const EMPTY_STATE_CONFIG: Record<
  InboxState,
  {
    icon: typeof Sparkles;
    title: string;
    description: string;
    cta?: { label: string; href: string; icon: typeof FolderKanban };
  }
> = {
  inbox: {
    icon: Sparkles,
    title: "All caught up",
    description: "Your inbox is empty. Time to do deep work or grab that coffee you've been putting off.",
    cta: { label: "Go to Projects", href: "/studio/projects", icon: FolderKanban },
  },
  snoozed: {
    icon: Clock,
    title: "Nothing snoozed",
    description: "Items you snooze will appear here until their reminder time.",
  },
  done: {
    icon: CheckCircle2,
    title: "Nothing archived yet",
    description: "Completed items will appear here for 30 days, then move to searchable history.",
  },
};

/**
 * InboxEmptyState - Celebratory empty state per tab
 *
 * Different messages for:
 * - Inbox: Celebratory "all caught up" with confetti
 * - Snoozed: Informational about snooze feature
 * - Done: Informational about archive retention
 */
export function InboxEmptyState({ state, hasFilters = false }: InboxEmptyStateProps) {
  const config = EMPTY_STATE_CONFIG[state];
  const Icon = config.icon;

  // Filtered empty state (no matches)
  if (hasFilters) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted/50 p-3 mb-4">
              <Inbox className="size-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">
              No items match your filters.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Celebratory state for empty inbox
  if (state === "inbox") {
    return (
      <Card className="border-dashed overflow-hidden">
        <CardContent className="py-20 relative">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />

          <div className="relative flex flex-col items-center justify-center text-center">
            {/* Animated icon */}
            <div
              className={cn(
                "rounded-full bg-primary/10 p-5 mb-6",
                "animate-pulse"
              )}
            >
              <Sparkles className="size-10 text-primary" />
            </div>

            <h2 className="text-2xl font-semibold mb-2 tracking-tight">
              {config.title}
            </h2>

            <p className="text-muted-foreground mb-8 max-w-sm">
              {config.description}
            </p>

            {/* Quick stats or CTA */}
            <div className="flex items-center gap-3">
              {config.cta && (
                <Button asChild>
                  <Link href={config.cta.href}>
                    <config.cta.icon className="size-4 mr-2" />
                    {config.cta.label}
                  </Link>
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link href="/studio/clients">
                  <Users className="size-4 mr-2" />
                  View Clients
                </Link>
              </Button>
            </div>

            {/* Subtle coffee hint */}
            <div className="mt-12 flex items-center gap-2 text-xs text-muted-foreground/60">
              <Coffee className="size-3" />
              <span>Maybe it&apos;s coffee time?</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Standard empty state for snoozed/done
  return (
    <Card className="border-dashed">
      <CardContent className="py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-muted/50 p-4 mb-4">
            <Icon className="size-8 text-muted-foreground" />
          </div>

          <h3 className="text-lg font-medium mb-2">{config.title}</h3>

          <p className="text-sm text-muted-foreground max-w-xs">
            {config.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
