"use client";

import { useState, useTransition } from "react";
import { Switch } from "@repo/ui";
import { cn } from "@repo/utils";
import { togglePlaybookEnabled } from "../actions/playbook-settings";

interface PlaybookEnabledToggleProps {
  playbookSlug: string;
  initialEnabled: boolean;
  disabled?: boolean;
  compact?: boolean;
  showLabel?: boolean;
  variant?: "switch" | "pill";
  /** Drop the outer pill chrome so the toggle can sit in a control cluster. */
  grouped?: boolean;
}

export function PlaybookEnabledToggle({
  playbookSlug,
  initialEnabled,
  disabled = false,
  compact = false,
  showLabel = true,
  variant = "switch",
  grouped = false,
}: PlaybookEnabledToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    setEnabled(checked);
    startTransition(async () => {
      const result = await togglePlaybookEnabled(playbookSlug, checked);
      if (!result.success) {
        setEnabled(!checked);
      }
    });
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          handleToggle(!enabled);
        }}
        disabled={disabled || isPending}
        aria-pressed={enabled}
        aria-label={enabled ? "Disable playbook" : "Enable playbook"}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
          grouped
            ? enabled
              ? "text-muted-foreground hover:bg-background/80"
              : "text-muted-foreground/70 hover:bg-background/60"
            : enabled
              ? "border border-border/50 bg-background/80 text-muted-foreground backdrop-blur-sm hover:border-border"
              : "border border-border/40 bg-muted/50 text-muted-foreground/70 backdrop-blur-sm hover:border-border/60",
          (disabled || isPending) && "opacity-50 cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            enabled ? "bg-emerald-500" : "bg-muted-foreground/35"
          )}
        />
        {enabled ? "On" : "Off"}
      </button>
    );
  }

  return (
    <div
      className={cn("flex items-center", compact ? "gap-2" : "gap-3")}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={disabled || isPending}
        size={compact ? "sm" : "default"}
        aria-label={enabled ? "Disable playbook" : "Enable playbook"}
        className={cn(isPending && "opacity-50")}
      />
      {showLabel ? (
        <span
          className={cn(
            "text-muted-foreground",
            compact ? "text-[11px] font-medium" : "text-sm"
          )}
        >
          {enabled ? "Enabled" : "Disabled"}
        </span>
      ) : null}
    </div>
  );
}
