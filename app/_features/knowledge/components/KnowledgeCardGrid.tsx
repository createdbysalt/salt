"use client";

import { memo } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  FileText,
  StickyNote,
  Link as LinkIcon,
  MessageSquare,
  ClipboardList,
  Image,
  FileSpreadsheet,
  File,
  Pin,
  Lock,
  MoreHorizontal,
  ExternalLink,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import type { KnowledgeType, KnowledgeItemWithRelations } from "../types";

interface KnowledgeCardGridProps {
  items: KnowledgeItemWithRelations[];
  isLoading?: boolean;
  onViewItem?: (item: KnowledgeItemWithRelations) => void;
  onEditItem?: (item: KnowledgeItemWithRelations) => void;
  onDeleteItem?: (item: KnowledgeItemWithRelations) => void;
  onAddItem?: () => void;
}

// Type icon mapping
const TYPE_ICONS: Record<KnowledgeType, React.ReactNode> = {
  document: <FileText className="h-8 w-8" />,
  discovery_note: <StickyNote className="h-8 w-8" />,
  meeting_transcript: <MessageSquare className="h-8 w-8" />,
  intake_response: <ClipboardList className="h-8 w-8" />,
  link: <LinkIcon className="h-8 w-8" />,
  insight: <StickyNote className="h-8 w-8" />,
  decision: <FileText className="h-8 w-8" />,
  feedback: <MessageSquare className="h-8 w-8" />,
  asset: <Image className="h-8 w-8" />,
};

// Type colors
const TYPE_COLORS: Record<KnowledgeType, string> = {
  document: "text-blue-400",
  discovery_note: "text-amber-400",
  meeting_transcript: "text-purple-400",
  intake_response: "text-emerald-400",
  link: "text-sky-400",
  insight: "text-amber-400",
  decision: "text-orange-400",
  feedback: "text-pink-400",
  asset: "text-indigo-400",
};

// Type labels
const TYPE_LABELS: Record<KnowledgeType, string> = {
  document: "Document",
  discovery_note: "Note",
  meeting_transcript: "Transcript",
  intake_response: "Intake",
  link: "Link",
  insight: "Insight",
  decision: "Decision",
  feedback: "Feedback",
  asset: "Asset",
};

// Get file icon based on extension
function getFileIcon(title: string, type: KnowledgeType): React.ReactNode {
  if (type !== "document" && type !== "asset") {
    return TYPE_ICONS[type];
  }

  const ext = title.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return <FileText className="h-8 w-8" />;
    case "doc":
    case "docx":
      return <FileText className="h-8 w-8" />;
    case "xls":
    case "xlsx":
      return <FileSpreadsheet className="h-8 w-8" />;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
      return <Image className="h-8 w-8" />;
    default:
      return <File className="h-8 w-8" />;
  }
}

const KnowledgeCard = memo(function KnowledgeCard({
  item,
  onView,
  onEdit,
  onDelete,
}: {
  item: KnowledgeItemWithRelations;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const icon = getFileIcon(item.title, item.type);
  const colorClass = TYPE_COLORS[item.type] || "text-muted-foreground";
  const typeLabel = TYPE_LABELS[item.type] || "File";

  return (
    <div
      className="group relative bg-card border border-border/50 rounded-lg p-4 hover:border-border hover:shadow-sm transition-all cursor-pointer"
      onClick={onView}
    >
      {/* Indicators */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {item.is_pinned && (
          <Pin className="h-3 w-3 text-amber-500 fill-amber-500" />
        )}
        {item.is_private && <Lock className="h-3 w-3 text-muted-foreground" />}
      </div>

      {/* Icon */}
      <div className={`mb-3 ${colorClass}`}>{icon}</div>

      {/* Title */}
      <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-1 pr-6">
        {item.title}
      </h4>

      {/* Preview/Description */}
      {item.content && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {item.content.substring(0, 100)}
        </p>
      )}

      {/* Meta */}
      <div className="flex items-center justify-between mt-auto pt-2">
        <span className="text-[10px] text-muted-foreground/70">
          {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
        </span>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full bg-muted ${colorClass}`}
        >
          {typeLabel}
        </span>
      </div>

      {/* Hover Actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onView?.();
              }}
              className="text-xs gap-2"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="text-xs gap-2"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="text-xs gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

// Loading skeleton for card
function CardSkeleton() {
  return (
    <div className="bg-card border border-border/50 rounded-lg p-4 animate-pulse">
      <div className="h-8 w-8 bg-muted rounded mb-3" />
      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
      <div className="h-3 bg-muted rounded w-full mb-1" />
      <div className="h-3 bg-muted rounded w-2/3 mb-3" />
      <div className="flex justify-between pt-2">
        <div className="h-3 w-16 bg-muted rounded" />
        <div className="h-4 w-12 bg-muted rounded-full" />
      </div>
    </div>
  );
}

// Empty state
function EmptyState({ onAdd }: { onAdd?: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <FileText className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        No knowledge items yet
      </p>
      {onAdd && (
        <Button size="sm" variant="outline" onClick={onAdd}>
          Add your first item
        </Button>
      )}
    </div>
  );
}

export function KnowledgeCardGrid({
  items,
  isLoading,
  onViewItem,
  onEditItem,
  onDeleteItem,
  onAddItem,
}: KnowledgeCardGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState onAdd={onAddItem} />;
  }

  // Separate pinned items
  const pinnedItems = items.filter((item) => item.is_pinned);
  const unpinnedItems = items.filter((item) => !item.is_pinned);

  return (
    <div className="space-y-4">
      {/* Pinned Section */}
      {pinnedItems.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Pin className="h-3 w-3 text-amber-500" />
            <span className="text-xs font-medium text-muted-foreground">
              Pinned
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {pinnedItems.map((item) => (
              <KnowledgeCard
                key={item.id}
                item={item}
                onView={() => onViewItem?.(item)}
                onEdit={() => onEditItem?.(item)}
                onDelete={() => onDeleteItem?.(item)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular Items */}
      {unpinnedItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {unpinnedItems.map((item) => (
            <KnowledgeCard
              key={item.id}
              item={item}
              onView={() => onViewItem?.(item)}
              onEdit={() => onEditItem?.(item)}
              onDelete={() => onDeleteItem?.(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
