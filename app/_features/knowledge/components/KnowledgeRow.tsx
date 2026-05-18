"use client";

import { memo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@repo/utils";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import {
  FileText,
  MessageSquare,
  Link as LinkIcon,
  ClipboardList,
  Lightbulb,
  CircleCheckBig,
  MessageCircle,
  Upload,
  MoreHorizontal,
  Pin,
  PinOff,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  ExternalLink,
  Download,
} from "lucide-react";
import type { KnowledgeItemWithRelations, KnowledgeType } from "../types";

const TYPE_ICONS: Record<KnowledgeType, React.ReactNode> = {
  document: <FileText className="h-4 w-4" />,
  discovery_note: <MessageSquare className="h-4 w-4" />,
  meeting_transcript: <ClipboardList className="h-4 w-4" />,
  link: <LinkIcon className="h-4 w-4" />,
  insight: <Lightbulb className="h-4 w-4" />,
  decision: <CircleCheckBig className="h-4 w-4" />,
  feedback: <MessageCircle className="h-4 w-4" />,
  intake_response: <ClipboardList className="h-4 w-4" />,
  asset: <Upload className="h-4 w-4" />,
};

const TYPE_LABELS: Record<KnowledgeType, string> = {
  document: "Document",
  discovery_note: "Note",
  meeting_transcript: "Transcript",
  link: "Link",
  insight: "Insight",
  decision: "Decision",
  feedback: "Feedback",
  intake_response: "Intake",
  asset: "Asset",
};

/**
 * Semantic badge classes for knowledge types
 * Uses design system tokens from DESIGN.md
 */
const TYPE_BADGE_CLASSES: Record<KnowledgeType, string> = {
  document: "bg-muted text-muted-foreground",
  discovery_note: "bg-warning/10 text-warning",
  meeting_transcript: "bg-accent/10 text-accent",
  link: "bg-info/10 text-info",
  insight: "bg-accent/10 text-accent",
  decision: "bg-success/10 text-success",
  feedback: "bg-warning/10 text-warning",
  intake_response: "bg-info/10 text-info",
  asset: "bg-muted text-muted-foreground",
};

interface KnowledgeRowProps {
  item: KnowledgeItemWithRelations;
  onView?: (item: KnowledgeItemWithRelations) => void;
  onEdit?: (item: KnowledgeItemWithRelations) => void;
  onDelete?: (item: KnowledgeItemWithRelations) => void;
  onTogglePin?: (item: KnowledgeItemWithRelations) => void;
  onTogglePrivacy?: (item: KnowledgeItemWithRelations) => void;
}

export const KnowledgeRow = memo(function KnowledgeRow({
  item,
  onView,
  onEdit,
  onDelete,
  onTogglePin,
  onTogglePrivacy,
}: KnowledgeRowProps) {
  const hasUrl = item.source_url || item.type === "link";
  const isFile = item.type === "document" || item.type === "asset";

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 rounded-lg",
        "hover:bg-muted/50 transition-colors cursor-pointer",
        item.is_pinned && "bg-muted/30"
      )}
      onClick={() => onView?.(item)}
    >
      {/* Type Icon */}
      <div className="flex-shrink-0 text-muted-foreground">
        {TYPE_ICONS[item.type]}
      </div>

      {/* Title + Content Preview */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">
            {item.title}
          </span>
          {item.is_pinned && (
            <Pin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          )}
          {item.is_private && (
            <EyeOff className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          )}
        </div>
        {item.content && (
          <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-md">
            {item.content.substring(0, 100)}
            {item.content.length > 100 && "..."}
          </p>
        )}
      </div>

      {/* Type Badge */}
      <Badge
        variant="secondary"
        className={cn(
          "text-[10px] px-1.5 py-0 h-5 font-medium flex-shrink-0",
          TYPE_BADGE_CLASSES[item.type]
        )}
      >
        {TYPE_LABELS[item.type]}
      </Badge>

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="hidden md:flex items-center gap-1 flex-shrink-0">
          {item.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {item.tags.length > 2 && (
            <span className="text-[10px] text-muted-foreground">
              +{item.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Date */}
      <span className="text-xs text-muted-foreground flex-shrink-0 w-20 text-right hidden sm:block">
        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
      </span>

      {/* Actions */}
      <div
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            {onView && (
              <DropdownMenuItem onClick={() => onView(item)}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View
              </DropdownMenuItem>
            )}
            {hasUrl && item.source_url && (
              <DropdownMenuItem asChild>
                <a href={item.source_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open link
                </a>
              </DropdownMenuItem>
            )}
            {isFile && (
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {onTogglePin && (
              <DropdownMenuItem onClick={() => onTogglePin(item)}>
                {item.is_pinned ? (
                  <>
                    <PinOff className="h-4 w-4 mr-2" />
                    Unpin
                  </>
                ) : (
                  <>
                    <Pin className="h-4 w-4 mr-2" />
                    Pin to top
                  </>
                )}
              </DropdownMenuItem>
            )}
            {onTogglePrivacy && (
              <DropdownMenuItem onClick={() => onTogglePrivacy(item)}>
                {item.is_private ? (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Make visible
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Make private
                  </>
                )}
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(item)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
