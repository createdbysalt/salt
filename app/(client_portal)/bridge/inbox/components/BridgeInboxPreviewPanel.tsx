"use client";

import * as React from "react";
import Link from "next/link";
import {
  X,
  Archive,
  Clock,
  RotateCcw,
  ExternalLink,
  MessageSquare,
  Mail,
  Receipt,
  Flag,
  Calendar,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@repo/utils";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@repo/ui";
import type { InboxItem } from "@/app/_features/inbox/types";
import { SNOOZE_OPTIONS } from "@/app/_features/inbox/types";

// =============================================================================
// HELPERS
// =============================================================================

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getTypeIcon(type: InboxItem["type"]) {
  switch (type) {
    case "message":
      return MessageSquare;
    case "email":
      return Mail;
    case "invoice":
      return Receipt;
    case "milestone":
      return Flag;
    case "meeting":
      return Calendar;
    default:
      return MessageSquare;
  }
}

function getTypeLabel(type: InboxItem["type"]): string {
  switch (type) {
    case "message":
      return "Message";
    case "email":
      return "Email";
    case "invoice":
      return "Invoice";
    case "milestone":
      return "Milestone";
    case "meeting":
      return "Meeting";
    default:
      return "Update";
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

interface BridgeInboxPreviewPanelProps {
  item: InboxItem | null;
  isOpen: boolean;
  isArchived?: boolean;
  onClose: () => void;
  onArchive?: (_item: InboxItem) => void;
  onRestore?: (_item: InboxItem) => void;
  onSnooze?: (_item: InboxItem, _until: Date) => void;
}

export function BridgeInboxPreviewPanel({
  item,
  isOpen,
  isArchived,
  onClose,
  onArchive,
  onRestore,
  onSnooze,
}: BridgeInboxPreviewPanelProps) {
  if (!isOpen || !item) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 bg-[var(--bridge-bg-surface)]">
        <div className="size-16 rounded-full bg-[var(--bridge-bg-elevated)] flex items-center justify-center mb-4">
          <MessageSquare className="size-8 text-[var(--bridge-text-subtle)]" />
        </div>
        <span className="text-[var(--bridge-font-size-lg)] font-medium text-[var(--bridge-text-secondary)]">
          Select an item
        </span>
        <span className="text-[var(--bridge-font-size-sm)] text-[var(--bridge-text-muted)] mt-1">
          Choose an update from the list to view details
        </span>
      </div>
    );
  }

  const TypeIcon = getTypeIcon(item.type);
  const typeLabel = getTypeLabel(item.type);

  return (
    <div className="flex flex-col h-full bg-[var(--bridge-bg-elevated)]">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--bridge-border-subtle)]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center size-10 rounded-[var(--bridge-radius-md)] bg-[var(--bridge-accent-muted)]">
            <TypeIcon className="size-5 text-[var(--bridge-accent)]" />
          </div>
          <div className="min-w-0">
            <span className="text-[var(--bridge-font-size-xs)] font-medium uppercase tracking-wide text-[var(--bridge-accent)]">
              {typeLabel}
            </span>
            <h2 className="text-[var(--bridge-font-size-lg)] font-semibold text-[var(--bridge-text-primary)] truncate">
              {item.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-9 border-[var(--bridge-border-subtle)]"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48" data-surface="bridge">
              {isArchived ? (
                <DropdownMenuItem onClick={() => onRestore?.(item)}>
                  <RotateCcw className="size-4 mr-2" />
                  Move to Inbox
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => onArchive?.(item)}>
                    <Archive className="size-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Clock className="size-4 mr-2" />
                      Snooze
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent data-surface="bridge">
                      {SNOOZE_OPTIONS.map((option) => (
                        <DropdownMenuItem
                          key={option.label}
                          onClick={() => onSnooze?.(item, option.getDate())}
                        >
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-9"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-6">
          {/* Meta info */}
          <div className="flex flex-wrap gap-4 text-[var(--bridge-font-size-sm)] text-[var(--bridge-text-muted)]">
            <span>{formatDate(item.created_at)}</span>
            {item.project_name && (
              <>
                <span className="text-[var(--bridge-border-default)]">|</span>
                <span>{item.project_name}</span>
              </>
            )}
          </div>

          {/* Subtitle */}
          {item.subtitle && (
            <div className="text-[var(--bridge-font-size-base)] text-[var(--bridge-text-secondary)]">
              {item.subtitle}
            </div>
          )}

          {/* Preview / Content */}
          {item.preview && (
            <div className="text-[var(--bridge-font-size-base)] text-[var(--bridge-text-primary)] leading-relaxed whitespace-pre-wrap">
              {(item.metadata?.full_content as string) || item.preview}
            </div>
          )}

          {/* Type-specific content */}
          {item.type === "invoice" && item.metadata && (
            <div className="bridge-card p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[var(--bridge-font-size-sm)] text-[var(--bridge-text-muted)]">
                  Amount Due
                </span>
                <span className="text-[var(--bridge-font-size-xl)] font-semibold text-[var(--bridge-text-primary)]">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: (item.metadata.currency as string) || "USD",
                  }).format((item.metadata.amount as number) || 0)}
                </span>
              </div>
              {typeof item.metadata.due_date === "string" && (
                <div className="flex justify-between items-center">
                  <span className="text-[var(--bridge-font-size-sm)] text-[var(--bridge-text-muted)]">
                    Due Date
                  </span>
                  <span className="text-[var(--bridge-font-size-sm)] text-[var(--bridge-text-primary)]">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(item.metadata.due_date))}
                  </span>
                </div>
              )}
            </div>
          )}

          {item.type === "meeting" && item.metadata && (
            <div className="bridge-card p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[var(--bridge-font-size-sm)] text-[var(--bridge-text-muted)]">
                  When
                </span>
                <span className="text-[var(--bridge-font-size-sm)] font-medium text-[var(--bridge-text-primary)]">
                  {new Intl.DateTimeFormat("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(item.metadata.start_time as string))}
                </span>
              </div>
              {typeof item.metadata.meeting_url === "string" && (
                <Button asChild className="w-full bridge-btn bridge-btn-primary">
                  <a
                    href={item.metadata.meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="size-4 mr-2" />
                    Join Meeting
                  </a>
                </Button>
              )}
            </div>
          )}

          {item.type === "milestone" && item.metadata && (
            <div className="bridge-card p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[var(--bridge-font-size-sm)] text-[var(--bridge-text-muted)]">
                  Status
                </span>
                <span
                  className={cn(
                    "text-[var(--bridge-font-size-sm)] font-medium capitalize",
                    item.metadata.status === "complete"
                      ? "text-[var(--bridge-success)]"
                      : item.metadata.status === "in_progress"
                        ? "text-[var(--bridge-accent)]"
                        : "text-[var(--bridge-text-secondary)]"
                  )}
                >
                  {(item.metadata.status as string)?.replace("_", " ")}
                </span>
              </div>
              {typeof item.metadata.due_date === "string" && (
                <div className="flex justify-between items-center">
                  <span className="text-[var(--bridge-font-size-sm)] text-[var(--bridge-text-muted)]">
                    Target Date
                  </span>
                  <span className="text-[var(--bridge-font-size-sm)] text-[var(--bridge-text-primary)]">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "long",
                      day: "numeric",
                    }).format(new Date(item.metadata.due_date))}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer with CTA */}
      <div className="shrink-0 px-6 py-4 border-t border-[var(--bridge-border-subtle)] bg-[var(--bridge-bg-surface)]">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--bridge-font-size-sm)] text-[var(--bridge-text-muted)]">
            View full details
          </span>
          <Button asChild variant="default" size="sm">
            <Link href={item.href}>
              <ExternalLink className="size-4 mr-2" />
              {item.type === "invoice"
                ? "View Invoice"
                : item.type === "meeting"
                  ? "View Meeting"
                  : item.type === "milestone"
                    ? "View Progress"
                    : "Open"}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
