"use client";

import { useMemo } from "react";
import { cn } from "@repo/utils";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { KnowledgeRow } from "./KnowledgeRow";
import type { KnowledgeItemWithRelations } from "../types";

interface KnowledgeDenseListProps {
  items: KnowledgeItemWithRelations[];
  isLoading?: boolean;
  onAddItem?: () => void;
  onViewItem?: (item: KnowledgeItemWithRelations) => void;
  onEditItem?: (item: KnowledgeItemWithRelations) => void;
  onDeleteItem?: (item: KnowledgeItemWithRelations) => void;
  onTogglePin?: (item: KnowledgeItemWithRelations) => void;
  onTogglePrivacy?: (item: KnowledgeItemWithRelations) => void;
  className?: string;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg animate-pulse"
        >
          <div className="h-4 w-4 rounded bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-48 rounded bg-muted" />
            <div className="h-3 w-32 rounded bg-muted" />
          </div>
          <div className="h-5 w-16 rounded-full bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onAddItem }: { onAddItem?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="p-4 rounded-full bg-muted/50 mb-4">
        <BookOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-base mb-1">No items yet</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">
        Add notes, upload files, or save links to build your knowledge base.
      </p>
      {onAddItem && (
        <Button onClick={onAddItem} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Add first item
        </Button>
      )}
    </div>
  );
}

export function KnowledgeDenseList({
  items,
  isLoading = false,
  onAddItem,
  onViewItem,
  onEditItem,
  onDeleteItem,
  onTogglePin,
  onTogglePrivacy,
  className,
}: KnowledgeDenseListProps) {
  // Separate pinned items to show first
  const { pinnedItems, unpinnedItems } = useMemo(() => {
    const pinned = items.filter((item) => item.is_pinned);
    const unpinned = items.filter((item) => !item.is_pinned);
    return { pinnedItems: pinned, unpinnedItems: unpinned };
  }, [items]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (items.length === 0) {
    return <EmptyState onAddItem={onAddItem} />;
  }

  return (
    <div className={cn("space-y-1", className)}>
      {/* Pinned Section */}
      {pinnedItems.length > 0 && (
        <>
          <div className="px-3 py-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
              Pinned
            </span>
          </div>
          {pinnedItems.map((item) => (
            <KnowledgeRow
              key={item.id}
              item={item}
              onView={onViewItem}
              onEdit={onEditItem}
              onDelete={onDeleteItem}
              onTogglePin={onTogglePin}
              onTogglePrivacy={onTogglePrivacy}
            />
          ))}
          {unpinnedItems.length > 0 && (
            <div className="h-px bg-border/50 mx-3 my-2" />
          )}
        </>
      )}

      {/* Unpinned Items */}
      {unpinnedItems.map((item) => (
        <KnowledgeRow
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
