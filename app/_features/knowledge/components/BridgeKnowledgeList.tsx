"use client";

import { Card, CardContent } from "@/app/_components/ui/card";
import { BookOpen } from "lucide-react";
import { BridgeKnowledgeCard } from "./BridgeKnowledgeCard";
import type { KnowledgeItemWithRelations } from "../types";

export interface BridgeKnowledgeListProps {
  items: KnowledgeItemWithRelations[];
  isLoading?: boolean;
  onViewItem?: (_item: KnowledgeItemWithRelations) => void;
  emptyMessage?: string;
  emptyDescription?: string;
}

/**
 * Loading skeleton for knowledge items
 */
function KnowledgeCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="pt-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-muted" />
            <div className="h-5 w-24 rounded-full bg-muted" />
          </div>
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-2/3 rounded bg-muted" />
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1.5">
              <div className="h-4 w-12 rounded bg-muted" />
              <div className="h-4 w-12 rounded bg-muted" />
            </div>
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Empty state when no knowledge items exist
 */
function EmptyState({
  message = "No knowledge items available",
  description = "Your studio will add helpful documents, notes, and resources here as they become available.",
}: {
  message?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="p-4 rounded-full bg-muted/50 mb-4">
        <BookOpen className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{message}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}

/**
 * BridgeKnowledgeList - Read-only knowledge list for client portal
 *
 * Displays knowledge items shared by the studio.
 * Clients can view items but not edit or delete them.
 */
export function BridgeKnowledgeList({
  items,
  isLoading = false,
  onViewItem,
  emptyMessage,
  emptyDescription,
}: BridgeKnowledgeListProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <KnowledgeCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return <EmptyState message={emptyMessage} description={emptyDescription} />;
  }

  // Separate pinned items to show first
  const pinnedItems = items.filter((item) => item.is_pinned);
  const unpinnedItems = items.filter((item) => !item.is_pinned);
  const sortedItems = [...pinnedItems, ...unpinnedItems];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedItems.map((item) => (
        <BridgeKnowledgeCard
          key={item.id}
          item={item}
          onView={onViewItem}
        />
      ))}
    </div>
  );
}
