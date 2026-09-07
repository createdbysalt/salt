"use client";

import { useTransition } from "react";
import { Loader2, Pencil, Play } from "lucide-react";
import { toast } from "sonner";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui";
import { playbookRunToast } from "../lib/manual-run-context";
import { runPlaybookNow } from "../actions/run-playbook-now";
import { PlaybookEnabledToggle } from "./PlaybookEnabledToggle";

interface PlaybookHeroControlsProps {
  slug: string;
  enabled: boolean;
  isLocked: boolean;
  runnable: boolean;
  onEdit: () => void;
  onRan?: () => void;
}

export function PlaybookHeroControls({
  slug,
  enabled,
  isLocked,
  runnable,
  onEdit,
  onRan,
}: PlaybookHeroControlsProps) {
  const [isPending, startTransition] = useTransition();

  function handlePlay() {
    startTransition(async () => {
      const result = await runPlaybookNow(slug);
      if (!result.ok) {
        toast(result.message);
        return;
      }
      const copy = playbookRunToast(result.data);
      toast(copy.title, copy.description ? { description: copy.description } : undefined);
      if (result.data.status === "success" || result.data.status === "paused") {
        onRan?.();
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {runnable ? (
        <Button
          type="button"
          size="sm"
          aria-label="Run playbook"
          aria-busy={isPending}
          disabled={isPending}
          onClick={handlePlay}
          className="rounded-full"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Play className="size-3.5 fill-current" />
          )}
          {isPending ? "Running" : "Run"}
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="sm"
              aria-label="Run playbook"
              disabled
              className="rounded-full"
            >
              <Play className="size-3.5 fill-current" />
              Run
            </Button>
          </TooltipTrigger>
          <TooltipContent>This play is not wired yet</TooltipContent>
        </Tooltip>
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label="Edit playbook"
        onClick={onEdit}
        className="rounded-full"
      >
        <Pencil className="size-3.5" />
        Edit
      </Button>

      <div className="flex h-8 items-center border-l border-border/60 pl-3">
        {isLocked ? (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
            title={
              runnable
                ? "System playbook. Always on."
                : "System playbook. Execution is not wired yet."
            }
          >
            <span
              className={
                runnable
                  ? "size-1.5 rounded-full bg-emerald-500"
                  : "size-1.5 rounded-full bg-muted-foreground/40"
              }
            />
            {runnable ? "Always on" : "Not active yet"}
          </span>
        ) : (
          <PlaybookEnabledToggle
            playbookSlug={slug}
            initialEnabled={enabled}
            compact
          />
        )}
      </div>
    </div>
  );
}
