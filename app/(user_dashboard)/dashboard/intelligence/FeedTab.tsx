"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { TrendingUp, Sparkles, Bookmark, CheckCircle } from "lucide-react";
import {
  IntelligenceStreamItem,
  type IntelligenceEvent as StreamEvent,
} from "@/app/_features/intelligence/components/intelligence-stream-item";
import {
  IntelligenceFilters,
  type FilterState,
} from "@/app/_features/intelligence/components/intelligence-filters";
import {
  dismissEvent,
  archiveEvent,
  saveToLibrary,
  markEventActioned,
} from "@/app/_features/intelligence/actions";
import type {
  GetIntelligenceFeedData,
  IntelligenceEventWithRelations,
} from "@/app/_features/intelligence/types";

interface FeedTabProps {
  initialData: GetIntelligenceFeedData;
}

// Helper to group events by time
function groupEventsByTime(
  events: IntelligenceEventWithRelations[]
): { label: string; events: IntelligenceEventWithRelations[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: Record<string, IntelligenceEventWithRelations[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    Earlier: [],
  };

  for (const event of events) {
    const eventDate = new Date(event.created_at);
    if (eventDate >= today) {
      groups.Today.push(event);
    } else if (eventDate >= yesterday) {
      groups.Yesterday.push(event);
    } else if (eventDate >= thisWeek) {
      groups["This Week"].push(event);
    } else {
      groups.Earlier.push(event);
    }
  }

  return Object.entries(groups)
    .filter(([_, events]) => events.length > 0)
    .map(([label, events]) => ({ label, events }));
}

// Convert our event type to the stream item's expected type
function toStreamEvent(event: IntelligenceEventWithRelations): StreamEvent {
  return {
    id: event.id,
    type: event.event_type,
    urgency: event.urgency,
    project_id: event.project_id ?? "",
    project_name: event.project?.name ?? "Unknown Project",
    client_name: event.client?.name,
    title: event.title,
    summary: event.summary,
    details: event.details,
    impact: event.impact ?? undefined,
    recommendation: event.recommendation ?? undefined,
    created_at: event.created_at,
    dismissed_at: event.dismissed_at ?? undefined,
    archived_at: event.archived_at ?? undefined,
  };
}

export function FeedTab({ initialData }: FeedTabProps) {
  const [events, setEvents] = useState(initialData.events);
  const [filters, setFilters] = useState<FilterState>({
    type: "all",
    urgency: "all",
    timeRange: "7d",
  });
  const [isPending, startTransition] = useTransition();

  // Apply client-side filters for immediate feedback
  const filteredEvents = events.filter((event) => {
    if (filters.type !== "all" && event.event_type !== filters.type) return false;
    if (filters.urgency === "critical" && event.urgency !== "critical") return false;
    return true;
  });

  const groupedEvents = groupEventsByTime(filteredEvents);

  // Action handlers
  const handleDismiss = (eventId: string) => {
    startTransition(async () => {
      const result = await dismissEvent(eventId);
      if (result.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      }
    });
  };

  const handleArchive = (eventId: string) => {
    startTransition(async () => {
      const result = await archiveEvent(eventId);
      if (result.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      }
    });
  };

  const handleSave = (eventId: string) => {
    startTransition(async () => {
      const result = await saveToLibrary({ eventId });
      if (result.ok) {
        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, is_saved: true } : e))
        );
      }
    });
  };

  const handleCreateTask = (eventId: string) => {
    startTransition(async () => {
      await markEventActioned(eventId);
      // TODO: Open task creation modal with pre-filled data
      // eslint-disable-next-line no-console
      console.warn("Create task from event (not yet implemented):", eventId);
    });
  };

  // Empty state
  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <TrendingUp className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Intelligence Events Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              The Intelligence Feed will display real-time strategic and technical
              intelligence across all your projects. Critical alerts, competitive
              insights, performance regressions, and SEO opportunities—all surfaced
              proactively.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>Intelligence events will appear here as they're generated</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filtered empty state
  if (filteredEvents.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <IntelligenceFilters onFilterChange={setFilters} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Matching Events</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                No intelligence events match your current filters. Try adjusting the
                filters or check back later.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <IntelligenceFilters onFilterChange={setFilters} />
        </CardContent>
      </Card>

      {/* Grouped Events */}
      {groupedEvents.map((group) => (
        <div key={group.label} className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {group.label}
          </h3>
          <div className="space-y-4">
            {group.events.map((event) => (
              <div key={event.id} className="relative">
                <IntelligenceStreamItem
                  event={toStreamEvent(event)}
                  onInvestigate={() => console.log("Investigate:", event.id)}
                  onCreateTask={() => handleCreateTask(event.id)}
                  onDismiss={() => handleDismiss(event.id)}
                  onArchive={() => handleArchive(event.id)}
                />
                {/* Save to Library button */}
                {!event.is_saved && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-4 right-12"
                    onClick={() => handleSave(event.id)}
                    disabled={isPending}
                  >
                    <Bookmark className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Load More */}
      {initialData.hasMore && (
        <div className="text-center py-4">
          <Button variant="outline" disabled>
            Load more...
          </Button>
        </div>
      )}
    </div>
  );
}
