"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import { Checkbox } from "@/app/_components/ui/checkbox";
import {
  ListTodo,
  User,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@repo/utils";
import type { ActionItemsListProps, ActionItemPriority } from "../types";

/**
 * Priority badge color mapping
 */
const PRIORITY_STYLES: Record<ActionItemPriority, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground border-border",
};

const PRIORITY_LABELS: Record<ActionItemPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

/**
 * ActionItemsList - Displays extracted action items from a meeting
 *
 * Shows action items with assignee, due date, priority, and context.
 * Supports toggling completion status.
 *
 * @example
 * ```tsx
 * <ActionItemsList
 *   actionItems={items}
 *   onToggleComplete={(id) => handleToggle(id)}
 * />
 * ```
 */
export function ActionItemsList({
  actionItems,
  onToggleComplete,
  className,
}: ActionItemsListProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (!actionItems || actionItems.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTodo className="h-4 w-4" />
            Action Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <ListTodo className="mb-3 h-12 w-12 opacity-50" />
            <p className="text-sm">No action items identified</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedCount = actionItems.filter((item) => item.completed).length;
  const totalCount = actionItems.length;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTodo className="h-4 w-4" />
            Action Items
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {completedCount}/{totalCount} completed
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actionItems.map((item) => {
            const isExpanded = expandedItems.has(item.id);
            const hasContext = item.context && item.context.trim().length > 0;

            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  item.completed
                    ? "border-muted bg-muted/30"
                    : "border-border bg-background"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => onToggleComplete?.(item.id)}
                    className="mt-0.5"
                    aria-label={`Mark "${item.text}" as ${item.completed ? "incomplete" : "complete"}`}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Action text */}
                    <p
                      className={cn(
                        "text-sm",
                        item.completed && "text-muted-foreground line-through"
                      )}
                    >
                      {item.text}
                    </p>

                    {/* Metadata row */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {/* Priority */}
                      {item.priority && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            PRIORITY_STYLES[item.priority]
                          )}
                        >
                          {PRIORITY_LABELS[item.priority]}
                        </Badge>
                      )}

                      {/* Assignee */}
                      {item.assignee && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {item.assignee}
                        </span>
                      )}

                      {/* Due date */}
                      {item.dueDate && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {item.dueDate}
                        </span>
                      )}

                      {/* Context toggle */}
                      {hasContext && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(item.id)}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3" />
                              Hide context
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3" />
                              Show context
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Expanded context */}
                    {isExpanded && hasContext && (
                      <div className="mt-3 rounded-md bg-muted/50 p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground italic">
                            &ldquo;{item.context}&rdquo;
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
