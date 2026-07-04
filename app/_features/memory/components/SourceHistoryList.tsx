"use client";

import { ExternalLink, Sparkles, User } from "lucide-react";
import Image from "next/image";
import { format, formatDistanceToNow } from "date-fns";
import type { SourceHistoryEntry } from "../queries/source-history";
import { getProviderDisplay } from "../utils/provider-display";

type SourceHistoryListProps = {
  history: SourceHistoryEntry[];
  maxItems?: number;
};

function getEventLabel(entry: SourceHistoryEntry): string {
  const providerDisplay = getProviderDisplay(entry.provider as any);

  switch (entry.eventType) {
    case "created":
      return entry.provider === "manual"
        ? "Created manually"
        : `Created from ${providerDisplay.label}`;
    case "synced":
      return `Synced from ${providerDisplay.label}`;
    case "extracted":
      return "Extracted by Salt";
    case "reclassified":
      return `Reclassified as ${providerDisplay.label}`;
    case "linked":
      return `Linked to ${providerDisplay.label}`;
    default:
      return `From ${providerDisplay.label}`;
  }
}

function SourceHistoryItem({ entry }: { entry: SourceHistoryEntry }) {
  const isExtraction = entry.eventType === "extracted" || entry.sourceOrigin === "extracted";
  const providerDisplay = getProviderDisplay(entry.provider as any);
  const sourcedDate = new Date(entry.sourcedAt);
  const timeAgo = formatDistanceToNow(sourcedDate, { addSuffix: true });
  const fullDate = format(sourcedDate, "MMM d, yyyy 'at' h:mm a");

  return (
    <div className="flex items-start gap-2 py-2 border-b border-border/50 last:border-0">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted/50">
        {isExtraction ? (
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        ) : providerDisplay.iconSrc ? (
          <Image
            src={providerDisplay.iconSrc}
            alt={providerDisplay.label}
            width={14}
            height={14}
            className="h-3.5 w-3.5 object-contain"
          />
        ) : (
          <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {getEventLabel(entry)}
          </span>
          {entry.appUrl && (
            <a
              href={entry.appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
          <span title={fullDate}>{timeAgo}</span>
          {entry.actorName && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <User className="h-2.5 w-2.5" />
                {entry.actorName}
              </span>
            </>
          )}
          {entry.context && (
            <>
              <span>·</span>
              <span>{entry.context}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function SourceHistoryList({ history, maxItems = 10 }: SourceHistoryListProps) {
  if (history.length === 0) {
    return null;
  }

  const displayItems = history.slice(0, maxItems);
  const hasMore = history.length > maxItems;

  return (
    <div className="divide-y divide-border/30">
      {displayItems.map((entry) => (
        <SourceHistoryItem key={entry.id} entry={entry} />
      ))}
      {hasMore && (
        <p className="pt-2 pl-7 text-xs text-muted-foreground">
          +{history.length - maxItems} more sources
        </p>
      )}
    </div>
  );
}
