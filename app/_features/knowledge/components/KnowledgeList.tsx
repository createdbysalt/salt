"use client";

import { Card, CardContent } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Plus, BookOpen } from "lucide-react";
import { KnowledgeCard } from "./KnowledgeCard";
import type { KnowledgeItemWithRelations } from "../types";

export interface KnowledgeListProps {
  items: KnowledgeItemWithRelations[];
  isLoading?: boolean;
  onAddItem?: () => void;
  onViewItem?: (item: KnowledgeItemWithRelations) => void;
  onEditItem?: (item: KnowledgeItemWithRelations) => void;
  onDeleteItem?: (item: KnowledgeItemWithRelations) => void;
  onTogglePin?: (item: KnowledgeItemWithRelations) => void;
  onTogglePrivacy?: (item: KnowledgeItemWithRelations) => void;
  layout?: "grid" | "list";
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
function EmptyState({ onAddItem }: { onAddItem?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="p-4 rounded-full bg-muted/50 mb-4">
        <BookOpen className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-1">No knowledge items yet</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        Start building your client&apos;s knowledge base by adding notes, documents,
        meeting transcripts, and more.
      </p>
      {onAddItem && (
        <Button onClick={onAddItem}>
          <Plus className="h-4 w-4 mr-2" />
          Add First Item
        </Button>
      )}
    </div>
  );
}

/**
 * KnowledgeList Component
 *
 * Displays a grid or list of knowledge items with loading and empty states.
 *
 * Usage:
 * ```tsx
 * <KnowledgeList
 *   items={items}
 *   onAddItem={() => setShowAddModal(true)}
 *   onViewItem={(item) => router.push(`/knowledge/${item.id}`)}
 * />
 * ```
 */
export function KnowledgeList({
  items,
  isLoading = false,
  onAddItem,
  onViewItem,
  onEditItem,
  onDeleteItem,
  onTogglePin,
  onTogglePrivacy,
  layout = "grid",
}: KnowledgeListProps) {
  // Loading state
  if (isLoading) {
    return (
      <div
        className={
          layout === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-3"
        }
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <KnowledgeCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return <EmptyState onAddItem={onAddItem} />;
  }

  // Separate pinned items to show first
  const pinnedItems = items.filter((item) => item.is_pinned);
  const unpinnedItems = items.filter((item) => !item.is_pinned);
  const sortedItems = [...pinnedItems, ...unpinnedItems];

  return (
    <div
      className={
        layout === "grid"
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          : "space-y-3"
      }
    >
      {sortedItems.map((item) => (
        <KnowledgeCard
          key={item.id}
          item={item}
          onView={onViewItem}
          onEdit={onEditItem}
          onDelete={onDeleteItem}
          onTogglePin={onTogglePin}
          onTogglePrivacy={onTogglePrivacy}
        />
      ))}
    </div>
  );
}
