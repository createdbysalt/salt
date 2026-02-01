/**
 * OnboardingChecklist Component
 *
 * A checklist component for tracking client onboarding progress.
 * Used by studio owners to manage and complete onboarding tasks.
 *
 * Features:
 * - Displays checklist items with checkboxes
 * - Items can be marked complete (when editable)
 * - Shows progress percentage
 * - Handles required vs optional items
 * - Supports item action URLs (links, booking, etc.)
 */

"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card";
import { Progress } from "@/app/_components/ui/progress";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import { Checkbox } from "@/app/_components/ui/checkbox";
import {
  CheckCircle2,
  Circle,
  ClipboardList,
  ExternalLink,
  Calendar,
  Upload,
  FileText,
  Link as LinkIcon,
  Loader2,
  Asterisk,
} from "lucide-react";
import type { OnboardingChecklistProps, ChecklistItem } from "../types";

/**
 * Get icon for checklist item type
 */
function getItemIcon(type?: ChecklistItem["type"]) {
  switch (type) {
    case "link":
      return LinkIcon;
    case "upload":
      return Upload;
    case "booking":
      return Calendar;
    case "form":
      return FileText;
    case "task":
    default:
      return Circle;
  }
}

/**
 * Calculate progress from items
 */
function calculateProgress(items: ChecklistItem[]) {
  const totalItems = items.length;
  const completedItems = items.filter((item) => item.completed).length;
  const requiredItems = items.filter((item) => item.required);
  const completedRequiredItems = requiredItems.filter((item) => item.completed).length;
  const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return {
    totalItems,
    completedItems,
    requiredItems: requiredItems.length,
    completedRequiredItems,
    percentage,
  };
}

/**
 * OnboardingChecklist - Track and manage client onboarding progress
 *
 * @param checklistId - The checklist ID (for server actions)
 * @param items - Array of checklist items
 * @param status - Current checklist status
 * @param onItemToggle - Callback when an item is toggled
 * @param editable - Whether items can be toggled (default: true)
 */
export function OnboardingChecklist({
  checklistId: _checklistId,
  items,
  status,
  onItemToggle,
  editable = true,
}: OnboardingChecklistProps) {
  // Track pending item toggles
  const [pendingItems, setPendingItems] = useState<Set<string>>(new Set());
  const [_isPending, startTransition] = useTransition();

  // Sort items by order
  const sortedItems = [...items].sort((a, b) => a.order - b.order);

  // Calculate progress
  const progress = calculateProgress(items);

  // Check if checklist is completed
  const isCompleted = status === "completed";
  const isCancelled = status === "cancelled";

  /**
   * Handle item checkbox toggle
   */
  const handleItemToggle = (itemId: string, currentCompleted: boolean) => {
    if (!editable || !onItemToggle || pendingItems.has(itemId)) {
      return;
    }

    // Mark item as pending
    setPendingItems((prev) => new Set(prev).add(itemId));

    // Call the toggle callback
    startTransition(async () => {
      try {
        await onItemToggle(itemId, !currentCompleted);
      } finally {
        // Remove from pending
        setPendingItems((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      }
    });
  };

  return (
    <Card className={isCompleted ? "border-success/30 bg-success/5" : undefined}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${
                isCompleted
                  ? "bg-success/10"
                  : isCancelled
                  ? "bg-muted"
                  : "bg-primary/10"
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <ClipboardList
                  className={`h-5 w-5 ${isCancelled ? "text-muted-foreground" : "text-primary"}`}
                />
              )}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg">Onboarding Checklist</CardTitle>
              <CardDescription>
                {isCompleted
                  ? "All tasks completed!"
                  : isCancelled
                  ? "Checklist cancelled"
                  : `${progress.completedItems} of ${progress.totalItems} tasks complete`}
              </CardDescription>
            </div>
          </div>

          {/* Status badge */}
          <Badge
            variant={
              isCompleted
                ? "default"
                : isCancelled
                ? "secondary"
                : "outline"
            }
            className={isCompleted ? "bg-success hover:bg-success" : undefined}
          >
            {status === "pending" && "Not Started"}
            {status === "in_progress" && "In Progress"}
            {status === "completed" && "Completed"}
            {status === "cancelled" && "Cancelled"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">{progress.percentage}%</span>
          </div>
          <Progress
            value={progress.percentage}
            className={`h-2 ${isCompleted ? "[&>div]:bg-success" : ""}`}
          />
          {progress.requiredItems > 0 && (
            <p className="text-xs text-muted-foreground">
              {progress.completedRequiredItems} of {progress.requiredItems} required tasks
              completed
            </p>
          )}
        </div>

        {/* Checklist Items */}
        <div className="space-y-1 pt-2">
          {sortedItems.map((item) => {
            const Icon = getItemIcon(item.type);
            const isItemPending = pendingItems.has(item.id);
            const canToggle = editable && !isCompleted && !isCancelled;

            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors ${
                  canToggle ? "hover:bg-muted/50" : ""
                } ${item.completed ? "opacity-70" : ""}`}
              >
                {/* Checkbox or loading indicator */}
                <div className="pt-0.5">
                  {isItemPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Checkbox
                      id={`item-${item.id}`}
                      checked={item.completed}
                      onCheckedChange={() =>
                        handleItemToggle(item.id, item.completed)
                      }
                      disabled={!canToggle || isItemPending}
                      className={item.completed ? "border-success data-[state=checked]:bg-success" : ""}
                    />
                  )}
                </div>

                {/* Item content */}
                <label
                  htmlFor={`item-${item.id}`}
                  className={`flex-1 min-w-0 ${canToggle ? "cursor-pointer" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 shrink-0 ${
                      item.completed ? "text-muted-foreground" : "text-primary"
                    }`} />
                    <span
                      className={`text-sm font-medium ${
                        item.completed
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {item.title}
                    </span>
                    {item.required && !item.completed && (
                      <span title="Required">
                        <Asterisk className="h-3 w-3 text-destructive" />
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                      {item.description}
                    </p>
                  )}
                  {item.completed && item.completed_at && (
                    <p className="text-xs text-muted-foreground/60 mt-0.5 ml-6">
                      Completed {new Date(item.completed_at).toLocaleDateString()}
                    </p>
                  )}
                </label>

                {/* Action button for items with action_url */}
                {item.action_url && !item.completed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-8 px-2"
                    asChild
                  >
                    <a
                      href={item.action_url}
                      target={item.action_url.startsWith("http") ? "_blank" : undefined}
                      rel={item.action_url.startsWith("http") ? "noopener noreferrer" : undefined}
                    >
                      {item.type === "booking" ? (
                        <>
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          Book
                        </>
                      ) : item.type === "upload" ? (
                        <>
                          <Upload className="h-3.5 w-3.5 mr-1" />
                          Upload
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Open
                        </>
                      )}
                    </a>
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {sortedItems.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No checklist items</p>
          </div>
        )}

        {/* Completion message */}
        {isCompleted && (
          <div className="rounded-lg bg-success/10 border border-success/20 p-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
            <p className="text-sm font-medium text-success">
              Onboarding complete!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              All tasks have been completed successfully.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OnboardingChecklist;
