"use client";

import { useState } from "react";
import { Play, MessageSquare, Link2, X, Loader2 } from "lucide-react";
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui";
import { cn } from "@repo/utils";
import type { SuggestedAction } from "../services/enrichment/types";

interface SuggestedActionsBarProps {
  actions: SuggestedAction[];
  onRunPlay?: (playSlug: string) => Promise<void>;
  onAskSalt?: (promptHint: string) => void;
  onLink?: () => void;
  onDismiss?: () => Promise<void>;
  className?: string;
}

export function SuggestedActionsBar({
  actions,
  onRunPlay,
  onAskSalt,
  onLink,
  onDismiss,
  className,
}: SuggestedActionsBarProps) {
  const [runningAction, setRunningAction] = useState<string | null>(null);

  const playAction = actions.find((a) => a.action === "route_to_play");
  const askSaltAction = actions.find((a) => a.action === "ask_salt");
  const dismissAction = actions.find((a) => a.action === "dismiss_noise");

  const handleRunPlay = async () => {
    if (!playAction || playAction.action !== "route_to_play" || !onRunPlay) return;
    setRunningAction("play");
    try {
      await onRunPlay(playAction.play_slug);
    } finally {
      setRunningAction(null);
    }
  };

  const handleAskSalt = () => {
    if (!askSaltAction || askSaltAction.action !== "ask_salt" || !onAskSalt) return;
    onAskSalt(askSaltAction.prompt_hint);
  };

  const handleDismiss = async () => {
    if (!onDismiss) return;
    setRunningAction("dismiss");
    try {
      await onDismiss();
    } finally {
      setRunningAction(null);
    }
  };

  return (
    <TooltipProvider>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {playAction && playAction.action === "route_to_play" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="default"
                onClick={handleRunPlay}
                disabled={runningAction !== null}
                className="gap-1.5 rounded-full"
              >
                {runningAction === "play" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Play className="size-3.5" strokeWidth={2.5} />
                )}
                <span className="text-xs font-medium">
                  Run Play
                  <span className="ml-1 opacity-70">{playAction.confidence}%</span>
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-xs">{playAction.reason}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {askSaltAction && askSaltAction.action === "ask_salt" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAskSalt}
                className="gap-1.5 rounded-full"
              >
                <MessageSquare className="size-3.5" strokeWidth={2} />
                <span className="text-xs font-medium">Ask Salt</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-xs">{askSaltAction.prompt_hint}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {onLink && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={onLink}
                className="gap-1.5 rounded-full"
              >
                <Link2 className="size-3.5" strokeWidth={2} />
                <span className="text-xs font-medium">Link</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Link to Memory record</p>
            </TooltipContent>
          </Tooltip>
        )}

        {(dismissAction || onDismiss) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                disabled={runningAction !== null}
                className="gap-1 rounded-full text-muted-foreground hover:text-foreground"
              >
                {runningAction === "dismiss" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <X className="size-3.5" strokeWidth={2} />
                )}
                <span className="text-xs">Dismiss</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">
                {dismissAction?.reason ?? "Mark as not actionable"}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
