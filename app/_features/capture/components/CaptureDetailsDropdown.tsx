"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ExternalLink, Mail, Copy, Check } from "lucide-react";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";
import { SignalBadges } from "./SignalBadges";
import { LinkedRecordsSection } from "./LinkedRecordsSection";
import type { EnrichedMetadata, PlayFitScore } from "../services/enrichment/types";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

interface CaptureDetailsDropdownProps {
  enrichedMetadata: EnrichedMetadata | null;
  reasoning?: string;
  onLinkNew?: () => void;
  className?: string;
}

export function CaptureDetailsDropdown({
  enrichedMetadata,
  reasoning,
  onLinkNew,
  className,
}: CaptureDetailsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!enrichedMetadata) return null;

  const {
    recipients,
    thread,
    signals_matched,
    linked_records,
    play_fit,
    deep_link,
  } = enrichedMetadata;

  const hasContent =
    signals_matched.length > 0 ||
    linked_records.length > 0 ||
    Object.keys(play_fit).length > 0 ||
    recipients ||
    reasoning;

  if (!hasContent) return null;

  const handleCopyLink = async () => {
    if (!deep_link) return;
    await navigator.clipboard.writeText(deep_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const playFitEntries = Object.entries(play_fit) as [string, PlayFitScore][];
  const sortedPlayFit = playFitEntries.sort((a, b) => b[1].score - a[1].score);

  return (
    <div className={cn("border-t border-border/40", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition hover:bg-muted/50"
      >
        <span className="text-[13px] font-medium text-foreground">
          View Details
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: APPLE_EASE }}
            className="overflow-hidden"
          >
            <div className="space-y-4 px-4 pb-4">
              {/* Full Context */}
              {recipients && (recipients.to.length > 0 || recipients.cc.length > 0) && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Recipients
                  </p>
                  <div className="text-sm text-foreground/80">
                    {recipients.to.length > 0 && (
                      <p>
                        <span className="text-muted-foreground">To:</span>{" "}
                        {recipients.to.join(", ")}
                      </p>
                    )}
                    {recipients.cc.length > 0 && (
                      <p>
                        <span className="text-muted-foreground">CC:</span>{" "}
                        {recipients.cc.join(", ")}
                      </p>
                    )}
                  </div>
                  {thread && (
                    <p className="text-xs text-muted-foreground">
                      {thread.is_reply && "Reply · "}
                      {thread.message_count && `${thread.message_count} messages in thread`}
                    </p>
                  )}
                </div>
              )}

              {/* Deep Links */}
              {deep_link && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="gap-1.5 rounded-full"
                  >
                    <a href={deep_link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3" strokeWidth={2} />
                      <span className="text-xs">View in app</span>
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyLink}
                    className="gap-1.5 rounded-full"
                  >
                    {copied ? (
                      <Check className="size-3 text-green-600" strokeWidth={2} />
                    ) : (
                      <Copy className="size-3" strokeWidth={2} />
                    )}
                    <span className="text-xs">{copied ? "Copied" : "Copy link"}</span>
                  </Button>
                </div>
              )}

              {/* Signals */}
              {signals_matched.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Signals Detected
                  </p>
                  <SignalBadges signals={signals_matched} />
                </div>
              )}

              {/* Linked Records */}
              <LinkedRecordsSection
                records={linked_records}
                onLinkNew={onLinkNew}
              />

              {/* Play Fit */}
              {sortedPlayFit.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Play Fit
                  </p>
                  <div className="space-y-2">
                    {sortedPlayFit.slice(0, 3).map(([slug, fit]) => (
                      <div key={slug} className="flex items-start gap-2">
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                            fit.score >= 80
                              ? "bg-flame/15 text-flame"
                              : fit.score >= 60
                                ? "bg-sky/15 text-sky"
                                : "bg-muted text-muted-foreground"
                          )}
                        >
                          {fit.score}%
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </p>
                          <p className="text-xs text-muted-foreground">{fit.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reasoning */}
              {reasoning && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Why Salt Suggested This
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/85">
                    {reasoning}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
