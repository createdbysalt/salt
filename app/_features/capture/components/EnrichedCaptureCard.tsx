"use client";

import { motion } from "framer-motion";
import {
  Mail,
  Calendar,
  MessageSquare,
  CreditCard,
  FileText,
  Folder,
  Users,
  LayoutGrid,
  Reply,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@repo/utils";
import { SuggestedActionsBar } from "./SuggestedActionsBar";
import { CaptureDetailsDropdown } from "./CaptureDetailsDropdown";
import type { EnrichedMetadata } from "../services/enrichment/types";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

/** Source type to icon mapping */
const SOURCE_ICONS: Record<string, LucideIcon> = {
  gmail: Mail,
  outlook: Mail,
  yahoo_mail: Mail,
  googlecalendar: Calendar,
  outlook_calendar: Calendar,
  cal: Calendar,
  calendly: Calendar,
  slack: MessageSquare,
  stripe: CreditCard,
  quickbooks: CreditCard,
  xero: CreditCard,
  googledrive: Folder,
  dropbox: Folder,
  onedrive: Folder,
  notion: FileText,
  googledocs: FileText,
  asana: LayoutGrid,
  linear: LayoutGrid,
  jira: LayoutGrid,
  fireflies: Users,
  otter: Users,
};

/** Source type to label mapping */
const SOURCE_LABELS: Record<string, string> = {
  gmail: "Email",
  outlook: "Email",
  yahoo_mail: "Email",
  googlecalendar: "Calendar",
  outlook_calendar: "Calendar",
  cal: "Calendar",
  calendly: "Calendar",
  slack: "Slack",
  stripe: "Billing",
  quickbooks: "Billing",
  xero: "Billing",
  googledrive: "Drive",
  dropbox: "Dropbox",
  onedrive: "OneDrive",
  notion: "Notion",
  googledocs: "Docs",
  asana: "Asana",
  linear: "Linear",
  jira: "Jira",
  fireflies: "Meeting",
  otter: "Meeting",
};

interface EnrichedCaptureCardProps {
  id: string;
  sourceType: string;
  title: string | null;
  snippet: string | null;
  senderName: string | null;
  senderEmail: string | null;
  senderClassification?: string;
  occurredAt: string | null;
  confidence: number;
  enrichedMetadata: EnrichedMetadata | null;
  reasoning?: string;
  onRunPlay?: (playSlug: string) => Promise<void>;
  onAskSalt?: (promptHint: string) => void;
  onLink?: () => void;
  onDismiss?: () => Promise<void>;
  className?: string;
}

export function EnrichedCaptureCard({
  id,
  sourceType,
  title,
  snippet,
  senderName,
  senderEmail,
  senderClassification,
  occurredAt,
  confidence,
  enrichedMetadata,
  reasoning,
  onRunPlay,
  onAskSalt,
  onLink,
  onDismiss,
  className,
}: EnrichedCaptureCardProps) {
  const SourceIcon = SOURCE_ICONS[sourceType] ?? Mail;
  const sourceLabel = SOURCE_LABELS[sourceType] ?? "Capture";

  const isReply = enrichedMetadata?.thread?.is_reply ?? false;
  const hasAttachments = (enrichedMetadata?.attachments?.length ?? 0) > 0;

  const relativeTime = occurredAt
    ? formatRelativeTime(new Date(occurredAt))
    : null;

  const senderDisplay = senderName || senderEmail || "Unknown";

  return (
    <motion.article
      key={id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: APPLE_EASE }}
      className={cn(
        "glass-card focus-card overflow-hidden rounded-3xl",
        className
      )}
    >
      {/* Actions Bar (always visible at top) */}
      {enrichedMetadata && enrichedMetadata.suggested_actions.length > 0 && (
        <div className="border-b border-border/40 bg-muted/30 px-5 py-3">
          <SuggestedActionsBar
            actions={enrichedMetadata.suggested_actions}
            onRunPlay={onRunPlay}
            onAskSalt={onAskSalt}
            onLink={onLink}
            onDismiss={onDismiss}
          />
        </div>
      )}

      {/* Card Body (minimal, scannable) */}
      <div className="p-5 lg:p-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-muted">
              <SourceIcon className="size-[18px]" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold tracking-tight">
                  Captured from {sourceLabel}
                </span>
                {senderClassification && senderClassification !== "unknown" && (
                  <span className="chip bg-flame/15 text-flame">
                    {senderClassification}
                  </span>
                )}
                {isReply && (
                  <span className="chip bg-sky/15 text-sky">
                    <Reply className="size-3" strokeWidth={2.5} />
                    Reply
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[12px] tabular-nums text-muted-foreground">
                {relativeTime}
                {confidence > 0 && ` · ${confidence}% confidence`}
              </p>
            </div>
          </div>
        </header>

        {/* Sender & Subject */}
        <div className="mt-4">
          <p className="text-sm font-medium text-foreground">
            <span className="text-muted-foreground">From:</span> {senderDisplay}
            {senderEmail && senderName && (
              <span className="text-muted-foreground"> &lt;{senderEmail}&gt;</span>
            )}
          </p>
          {title && (
            <p className="mt-1 text-base font-semibold tracking-tight text-foreground">
              {title}
            </p>
          )}
        </div>

        {/* Snippet/Preview */}
        {snippet && (
          <blockquote className="mt-3 text-sm leading-relaxed text-foreground/80">
            &ldquo;{snippet.slice(0, 200)}
            {snippet.length > 200 && "..."}
            &rdquo;
          </blockquote>
        )}
      </div>

      {/* Details Dropdown */}
      <CaptureDetailsDropdown
        enrichedMetadata={enrichedMetadata}
        reasoning={reasoning}
        onLinkNew={onLink}
      />
    </motion.article>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
