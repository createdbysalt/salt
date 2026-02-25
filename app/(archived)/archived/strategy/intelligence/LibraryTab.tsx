"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/app/_components/ui/card";
import { Input } from "@/app/_components/ui/input";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import {
  BookOpen,
  Search,
  TrendingUp,
  Wrench,
  Calendar,
  Bookmark,
  BookmarkX,
  Tag,
} from "lucide-react";
import { removeFromLibrary } from "@/app/_features/intelligence/actions";
import type {
  GetSavedIntelligenceData,
  IntelligenceEventWithRelations,
} from "@/app/_features/intelligence/types";

interface LibraryTabProps {
  initialData: GetSavedIntelligenceData;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getTypeConfig(type: string) {
  if (type === "strategic") {
    return {
      icon: TrendingUp,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      label: "Strategic",
    };
  }
  return {
    icon: Wrench,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    label: "Technical",
  };
}

function LibraryCard({
  event,
  onRemove,
  isPending,
}: {
  event: IntelligenceEventWithRelations;
  onRemove: () => void;
  isPending: boolean;
}) {
  const config = getTypeConfig(event.event_type);
  const Icon = config.icon;

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md ${config.bgColor}`}>
                <Icon className={`h-4 w-4 ${config.color}`} />
              </div>
              <Badge variant="outline" className="text-xs">
                {config.label}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onRemove}
              disabled={isPending}
            >
              <BookmarkX className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>

          {/* Title & Summary */}
          <div>
            <h3 className="font-medium line-clamp-2">{event.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {event.summary}
            </p>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Saved {formatDate(event.saved_at ?? event.created_at)}
            </span>
            {event.project?.name && (
              <span className="truncate">{event.project.name}</span>
            )}
          </div>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {event.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function LibraryTab({ initialData }: LibraryTabProps) {
  const [events, setEvents] = useState(initialData.events);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "strategic" | "technical">("all");
  const [isPending, startTransition] = useTransition();

  // Apply client-side filters
  const filteredEvents = events.filter((event) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        event.title.toLowerCase().includes(searchLower) ||
        event.summary.toLowerCase().includes(searchLower) ||
        event.tags?.some((tag) => tag.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }

    // Type filter
    if (typeFilter !== "all" && event.event_type !== typeFilter) {
      return false;
    }

    return true;
  });

  const handleRemove = (eventId: string) => {
    startTransition(async () => {
      const result = await removeFromLibrary(eventId);
      if (result.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      }
    });
  };

  // Empty state
  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <BookOpen className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Your Library is Empty</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Save important intelligence from the Feed to build your reference library.
              Saved items are searchable and can be tagged for easy retrieval.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bookmark className="h-4 w-4" />
              <span>Click "Save" on any feed item to add it here</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search saved intelligence..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) =>
                setTypeFilter(value as "all" | "strategic" | "technical")
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="strategic">Strategic</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                No saved intelligence matches your search. Try different keywords or
                clear the filters.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <LibraryCard
              key={event.id}
              event={event}
              onRemove={() => handleRemove(event.id)}
              isPending={isPending}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {initialData.hasMore && filteredEvents.length === events.length && (
        <div className="text-center py-4">
          <Button variant="outline" disabled>
            Load more...
          </Button>
        </div>
      )}
    </div>
  );
}
