"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { TrendingUp, Sparkles } from "lucide-react";
import { Badge } from "@/app/_components/ui/badge";
import {
  IntelligenceStreamItem,
  type IntelligenceEvent,
} from "@/app/_features/intelligence/components/intelligence-stream-item";
import {
  IntelligenceFilters,
  type FilterState,
} from "@/app/_features/intelligence/components/intelligence-filters";

export default function IntelligenceStreamPage() {
  const [filters, setFilters] = useState<FilterState>({
    type: "all",
    urgency: "all",
    timeRange: "7d",
  });

  // Mock data - will be replaced with real events from database
  const mockEvents: IntelligenceEvent[] = [];

  const filteredEvents = mockEvents.filter((event) => {
    if (filters.type !== "all" && event.type !== filters.type) return false;
    if (filters.urgency === "critical" && event.urgency !== "critical") return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">Intelligence Stream</h1>
          <Badge variant="secondary" className="font-semibold">
            NEW
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Live feed of strategic + technical intelligence across all projects
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <IntelligenceFilters onFilterChange={setFilters} />
        </CardContent>
      </Card>

      {/* Intelligence Feed */}
      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <TrendingUp className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No Intelligence Events Yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                The Intelligence Stream will display real-time strategic and technical
                intelligence across all your projects. Critical alerts, competitive insights,
                performance regressions, and SEO opportunities—all surfaced proactively.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>Intelligence events will appear here as they're generated</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <IntelligenceStreamItem
              key={event.id}
              event={event}
              onInvestigate={(id) => console.log("Investigate:", id)}
              onCreateTask={(id) => console.log("Create task:", id)}
              onDismiss={(id) => console.log("Dismiss:", id)}
              onArchive={(id) => console.log("Archive:", id)}
            />
          ))}
          <div className="text-center py-4">
            <Button variant="outline">Load more...</Button>
          </div>
        </div>
      )}
    </div>
  );
}
