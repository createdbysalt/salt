"use client";

import { Card, CardContent } from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import {
  ClipboardList,
  Lightbulb,
  MessageSquare,
  FileText,
  Link as LinkIcon,
  Sparkles,
  CheckCircle,
  MessageCircle,
  Image,
  Pin,
  ExternalLink,
} from "lucide-react";
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
  link: LinkIcon,
  insight: Sparkles,
  decision: CheckCircle,
  feedback: MessageCircle,
  asset: Image,
};

/**
 * Map semantic color tokens to Tailwind classes
 * Uses design system tokens from DESIGN.md
 */
function getColorClasses(color: string): { bg: string; text: string } {
  const colorMap: Record<string, { bg: string; text: string }> = {
    info: { bg: "bg-info/10", text: "text-info" },
    warning: { bg: "bg-warning/10", text: "text-warning" },
    success: { bg: "bg-success/10", text: "text-success" },
    accent: { bg: "bg-accent/10", text: "text-accent" },
    muted: { bg: "bg-muted", text: "text-muted-foreground" },
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

export interface TableKnowledgeCardProps {
  item: KnowledgeItemWithRelations;
  onView?: (_item: KnowledgeItemWithRelations) => void;
}

/**
 * TableKnowledgeCard - Read-only knowledge card for client portal
 *
 * Simplified version without edit/delete actions.
 * Shows the knowledge item content with optional link to view details.
 */
export function TableKnowledgeCard({ item, onView }: TableKnowledgeCardProps) {
  const typeConfig = KNOWLEDGE_TYPE_CONFIG[item.type];
  const colorClasses = getColorClasses(typeConfig.color);
  const Icon = typeIconMap[item.type];
  const categoryConfig = item.category ? KNOWLEDGE_CATEGORY_CONFIG[item.category] : null;

  const excerpt = item.ai_summary || truncateText(item.content);
  const hasExternalLink = item.type === "link" && item.source_url;

  const handleClick = () => {
    if (hasExternalLink) {
      window.open(item.source_url!, "_blank", "noopener,noreferrer");
    } else if (onView) {
      onView(item);
    }
  };

  return (
    <Card
      className={`group relative hover:border-foreground/20 transition-colors ${
        hasExternalLink || onView ? "cursor-pointer" : ""
      } ${item.is_pinned ? "ring-1 ring-warning/30" : ""}`}
      onClick={handleClick}
    >
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* Header row with type icon */}
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
            </div>

            {/* External link indicator */}
            {hasExternalLink && (
              <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            )}
          </div>

          {/* Title */}
          <h3 className="font-medium text-sm leading-tight line-clamp-2">
            {item.title}
          </h3>

          {/* Excerpt */}
          {excerpt && (
            <p className="text-xs text-muted-foreground line-clamp-3">
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
