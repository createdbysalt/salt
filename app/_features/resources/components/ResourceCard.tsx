"use client";

import { useState, useTransition } from "react";
import {
  ExternalLink,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Switch,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { getResourceIcon } from "@/app/_lib/resources/icons";
import { RESOURCE_TYPE_LABELS, type ResourceType } from "@/app/_lib/resources/types";
import { canBeLive } from "@/app/_lib/resources/url-detector";
import { updateResourceMode, removeResource, refreshResourceMetadata } from "../actions";

interface ResourceCardProps {
  id: string;
  name: string;
  resourceType: ResourceType;
  resourceUrl?: string;
  mode: "static" | "live";
  lastActivityAt?: string;
  lastActivitySummary?: string;
  entityType: "person" | "org" | "work" | "billing" | "meeting" | "note" | "space";
  entityId: string;
  onRemoved?: () => void;
  onModeChanged?: (mode: "static" | "live") => void;
}

export function ResourceCard({
  id,
  name,
  resourceType,
  resourceUrl,
  mode,
  lastActivityAt,
  lastActivitySummary,
  entityType,
  entityId,
  onRemoved,
  onModeChanged,
}: ResourceCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentMode, setCurrentMode] = useState(mode);

  const Icon = getResourceIcon(resourceType);
  const typeLabel = RESOURCE_TYPE_LABELS[resourceType];
  const supportsLive = canBeLive(resourceType);
  const isLive = currentMode === "live";

  const handleModeToggle = (checked: boolean) => {
    const newMode = checked ? "live" : "static";
    setCurrentMode(newMode);

    startTransition(async () => {
      const result = await updateResourceMode({
        resourceId: id,
        mode: newMode,
      });

      if (result.success) {
        toast.success(newMode === "live" ? "Live mode enabled" : "Switched to static mode");
        onModeChanged?.(newMode);
      } else {
        setCurrentMode(mode);
        toast.error("Failed to update mode");
      }
    });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    startTransition(async () => {
      const result = await refreshResourceMetadata(id);
      setIsRefreshing(false);

      if (result.success) {
        toast.success("Metadata refreshed");
      } else {
        toast.error("Failed to refresh");
      }
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeResource({
        resourceId: id,
        entityType,
        entityId,
      });

      if (result.success) {
        toast.success("Resource removed");
        onRemoved?.();
      } else {
        toast.error("Failed to remove");
      }
    });
  };

  const formatLastActivity = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="group relative rounded-xl border border-border/60 bg-card/50 p-3 transition hover:border-border">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-5 text-muted-foreground" strokeWidth={1.75} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{name}</p>
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                <span className="size-1.5 rounded-full bg-success" />
                Live
              </span>
            )}
          </div>

          <p className="mt-0.5 truncate text-xs text-muted-foreground">{typeLabel}</p>

          {isLive && lastActivityAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              {lastActivitySummary
                ? `${lastActivitySummary} • ${formatLastActivity(lastActivityAt)}`
                : `Last activity: ${formatLastActivity(lastActivityAt)}`}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {resourceUrl && (
            <a
              href={resourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground/70 hover:bg-muted hover:text-foreground"
              title="Open in new tab"
            >
              <ExternalLink className="size-4" strokeWidth={2} />
            </a>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={isPending}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground/70 hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="size-4" strokeWidth={2} />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {supportsLive && (
                <>
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-sm">Live mode</span>
                    <Switch
                      checked={isLive}
                      onCheckedChange={handleModeToggle}
                      disabled={isPending}
                    />
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={cn("mr-2 size-4", isRefreshing && "animate-spin")} />
                Refresh metadata
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleRemove}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
