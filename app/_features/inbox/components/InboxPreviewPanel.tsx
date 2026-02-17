"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import {
  X,
  Archive,
  Clock,
  ExternalLink,
  Reply,
  MessageSquare,
  Calendar,
  Receipt,
  Flag,
  FileText,
  Brain,
  TrendingDown,
  Eye,
  Inbox,
  User,
  FolderKanban,
} from "lucide-react";
import { cn } from "@repo/utils";
import { Button, Badge, Separator } from "@repo/ui";
import { InboxModeBadge } from "./InboxModeBadge";
import type { InboxItem, InboxItemType } from "../types";

const TYPE_ICONS: Record<InboxItemType, typeof MessageSquare> = {
  message: MessageSquare,
  meeting: Calendar,
  invoice: Receipt,
  milestone: Flag,
  proposal: FileText,
  intelligence: Brain,
  seo_alert: TrendingDown,
  portal_activity: Eye,
  client_request: Inbox,
};

const TYPE_LABELS: Record<InboxItemType, string> = {
  message: "Message",
  meeting: "Meeting",
  invoice: "Invoice",
  milestone: "Milestone",
  proposal: "Proposal",
  intelligence: "Intelligence Alert",
  seo_alert: "SEO Alert",
  portal_activity: "Portal Activity",
  client_request: "Client Request",
};

interface InboxPreviewPanelProps {
  item: InboxItem | null;
  isOpen: boolean;
  onClose: () => void;
  onArchive: (id: string) => void;
  onSnooze: (id: string) => void;
  onReply?: (id: string) => void;
}

/**
 * InboxPreviewPanel - Slide-over detail panel (Linear Split Inbox pattern)
 *
 * Shows item details without leaving inbox:
 * - Quick actions: Archive, Snooze, Reply
 * - Full content preview
 * - Context links (Client, Project)
 * - Keyboard navigation: Esc to close, E to archive, R to reply
 *
 * Responsive:
 * - Desktop: 448px side panel
 * - Mobile: Full-screen overlay
 */
export function InboxPreviewPanel({
  item,
  isOpen,
  onClose,
  onArchive,
  onSnooze,
  onReply,
}: InboxPreviewPanelProps) {
  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen || !item) return;

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "e":
        case "E":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            onArchive(item.id);
          }
          break;
        case "h":
        case "H":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            onSnooze(item.id);
          }
          break;
        case "r":
        case "R":
          if (!e.metaKey && !e.ctrlKey && onReply && item.type === "message") {
            e.preventDefault();
            onReply(item.id);
          }
          break;
      }
    },
    [isOpen, item, onClose, onArchive, onSnooze, onReply]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!item) return null;

  const Icon = TYPE_ICONS[item.type];

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className={cn(
          "fixed inset-0 bg-background/80 backdrop-blur-sm z-40",
          "md:hidden",
          "transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          // Base styles
          "fixed top-0 right-0 h-full bg-background z-50",
          "flex flex-col",
          "border-l border-border/50",
          "shadow-2xl",
          // Responsive width
          "w-full md:w-[448px]",
          // Animation
          "transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <InboxModeBadge mode={item.mode} showIcon />
            <Badge variant="outline" className="gap-1.5">
              <Icon className="size-3" />
              {TYPE_LABELS[item.type]}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-muted-foreground"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Title & Meta */}
          <div>
            <h2 className="text-xl font-semibold tracking-tight mb-2">
              {item.title}
            </h2>
            {item.subtitle && (
              <p className="text-muted-foreground">{item.subtitle}</p>
            )}
            <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
              <span>
                {formatDistanceToNow(new Date(item.created_at), {
                  addSuffix: true,
                })}
              </span>
              <span>•</span>
              <span>{format(new Date(item.created_at), "MMM d, h:mm a")}</span>
            </div>
          </div>

          <Separator />

          {/* Preview Content */}
          {item.preview && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-muted-foreground leading-relaxed">
                {item.preview}
              </p>
            </div>
          )}

          {/* Context Links */}
          <div className="space-y-2">
            {item.client_id && item.client_name && (
              <Link
                href={`/studio/clients/${item.client_id}`}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg",
                  "bg-muted/30 hover:bg-muted/50",
                  "transition-colors duration-[160ms]"
                )}
              >
                <User className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="font-medium text-sm">{item.client_name}</p>
                </div>
              </Link>
            )}

            {item.project_id && item.project_name && (
              <Link
                href={`/studio/projects/${item.project_id}`}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg",
                  "bg-muted/30 hover:bg-muted/50",
                  "transition-colors duration-[160ms]"
                )}
              >
                <FolderKanban className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Project</p>
                  <p className="font-medium text-sm">{item.project_name}</p>
                </div>
              </Link>
            )}
          </div>

          {/* Snoozed info */}
          {item.snoozed_until && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 text-warning">
              <Clock className="size-4" />
              <span className="text-sm">
                Snoozed until {format(new Date(item.snoozed_until), "MMM d, h:mm a")}
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border/50 space-y-3">
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => onArchive(item.id)}
            >
              <Archive className="size-4" />
              Archive
              <kbd className="ml-auto px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                E
              </kbd>
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => onSnooze(item.id)}
            >
              <Clock className="size-4" />
              Snooze
              <kbd className="ml-auto px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                H
              </kbd>
            </Button>
          </div>

          {/* Type-specific actions */}
          <div className="flex items-center gap-2">
            {item.type === "message" && onReply && (
              <Button className="flex-1 gap-2" onClick={() => onReply(item.id)}>
                <Reply className="size-4" />
                Reply
                <kbd className="ml-auto px-1.5 py-0.5 rounded bg-primary-foreground/20 text-[10px] font-mono">
                  R
                </kbd>
              </Button>
            )}
            <Button variant="ghost" className="gap-2" asChild>
              <Link href={item.href} target="_blank">
                <ExternalLink className="size-4" />
                Open
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
