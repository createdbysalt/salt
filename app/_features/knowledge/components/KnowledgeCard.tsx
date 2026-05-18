"use client";

import { Card, CardContent } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import {
  ClipboardList,
  Lightbulb,
  MessageSquare,
  FileText,
  Link,
  Sparkles,
  CheckCircle,
  MessageCircle,
  Image,
  Pin,
  EyeOff,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import type { KnowledgeItemWithRelations, KnowledgeType } from "../types";
import { KNOWLEDGE_TYPE_CONFIG, KNOWLEDGE_CATEGORY_CONFIG } from "../types";

/**
 * Map knowledge types to Lucide icons
 */
const typeIconMap: Record<KnowledgeType, React.ComponentType<{ className?: string }>> = {
  intake_response: ClipboardList,
  discovery_note: Lightbulb,
  meeting_transcript: MessageSquare,
  document: FileText,
  link: Link,
  insight: Sparkles,
  decision: CheckCircle,
  feedback: MessageCircle,
  asset: Image,
};

/**
 * Map semantic color tokens to Tailwind classes
 * Uses design system tokens from DESIGN.md
 */
function getColorClasses(color: string): { bg: string; text: string; border: string } {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    info: { bg: "bg-info/10", text: "text-info", border: "border-info/20" },
    warning: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/20" },
    success: { bg: "bg-success/10", text: "text-success", border: "border-success/20" },
    accent: { bg: "bg-accent/10", text: "text-accent", border: "border-accent/20" },
    muted: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" },
  };
  return colorMap[color] || colorMap.muted;
}

/**
 * Format date to relative time
 */
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Truncate text to a maximum length
 */
function truncateText(text: string | null, maxLength: number = 150): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

export interface KnowledgeCardProps {
  item: KnowledgeItemWithRelations;
  onView?: (item: KnowledgeItemWithRelations) => void;
  onEdit?: (item: KnowledgeItemWithRelations) => void;
  onDelete?: (item: KnowledgeItemWithRelations) => void;
  onTogglePin?: (item: KnowledgeItemWithRelations) => void;
  onTogglePrivacy?: (item: KnowledgeItemWithRelations) => void;
}

export function KnowledgeCard({
  item,
  onView,
  onEdit,
  onDelete,
  onTogglePin,
  onTogglePrivacy,
}: KnowledgeCardProps) {
  const typeConfig = KNOWLEDGE_TYPE_CONFIG[item.type];
  const colorClasses = getColorClasses(typeConfig.color);
  const Icon = typeIconMap[item.type];
  const categoryConfig = item.category ? KNOWLEDGE_CATEGORY_CONFIG[item.category] : null;

  const excerpt = item.ai_summary || truncateText(item.content);

  return (
    <Card
      className={`group relative hover:border-foreground/20 transition-colors cursor-pointer ${
        item.is_pinned ? "ring-1 ring-warning/30" : ""
      }`}
      onClick={() => onView?.(item)}
    >
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* Header row with type icon and actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={`p-1.5 rounded-md shrink-0 ${colorClasses.bg}`}>
                <Icon className={`h-4 w-4 ${colorClasses.text}`} />
              </div>
              <Badge
                variant="outline"
                className={`${colorClasses.bg} ${colorClasses.text} border-0 text-xs font-medium`}
              >
                {typeConfig.label}
              </Badge>
              {item.is_pinned && (
                <Pin className="h-3.5 w-3.5 text-warning shrink-0 fill-warning" />
              )}
              {item.is_private && (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
            </div>

            {/* Actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => onView?.(item)}>
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(item)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTogglePin?.(item)}>
                  {item.is_pinned ? "Unpin" : "Pin"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTogglePrivacy?.(item)}>
                  {item.is_private ? "Make visible to client" : "Make private"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete?.(item)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Title */}
          <h3 className="font-medium text-sm leading-tight line-clamp-2">
            {item.title}
          </h3>

          {/* Excerpt */}
          {excerpt && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {excerpt}
            </p>
          )}

          {/* Tags and metadata */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              {categoryConfig && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {categoryConfig.label}
                </Badge>
              )}
              {item.tags.slice(0, 2).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 text-muted-foreground"
                >
                  {tag}
                </Badge>
              ))}
              {item.tags.length > 2 && (
                <span className="text-[10px] text-muted-foreground">
                  +{item.tags.length - 2}
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatTimeAgo(item.created_at)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
