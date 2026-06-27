"use client";

import { useState, useTransition } from "react";
import { Calendar, ListTodo, Loader2, Plus, User } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@repo/ui";
import { cn } from "@repo/utils";
import { memoryCheckboxClassName } from "@/app/_features/memory/components/DataTable";
import type { MeetingActionItemRecord } from "../queries";
import { addMeetingActionItem, toggleMeetingActionItem } from "../actions";

type MeetingActionItemsTabProps = {
  meetingId: string;
  actionItems: MeetingActionItemRecord[];
};

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground border-border",
};

export function MeetingActionItemsTab({ meetingId, actionItems }: MeetingActionItemsTabProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [text, setText] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "">("");
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (!text.trim()) {
      toast.error("Action item text is required");
      return;
    }

    startTransition(async () => {
      const result = await addMeetingActionItem({
        meetingId,
        text: text.trim(),
        assignee: assignee.trim() || undefined,
        dueDate: dueDate || undefined,
        priority: priority || undefined,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success("Action item added");
      setIsAdding(false);
      setText("");
      setAssignee("");
      setDueDate("");
      setPriority("");
    });
  };

  const handleToggle = (item: MeetingActionItemRecord) => {
    startTransition(async () => {
      const result = await toggleMeetingActionItem({
        actionItemId: item.id,
        completed: !item.completed,
      });

      if (!result.ok) {
        toast.error(result.message);
      }
    });
  };

  const completedCount = actionItems.filter((item) => item.completed).length;

  if (actionItems.length === 0 && !isAdding) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ListTodo className="mb-4 size-12 text-muted-foreground/40" strokeWidth={1.5} />
        <h3 className="text-lg font-medium text-foreground">No action items</h3>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Track follow-up tasks and to-dos from this meeting.
        </p>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="mt-6 inline-flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-card px-4 text-sm font-medium transition hover:bg-muted"
        >
          <Plus className="size-3.5" strokeWidth={2.5} />
          Add action item
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress header */}
      {actionItems.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {completedCount}/{actionItems.length} completed
          </span>
        </div>
      )}

      {/* Action items list */}
      {actionItems.length > 0 && (
        <ul className="space-y-2">
          {actionItems.map((item) => (
            <li
              key={item.id}
              className={cn(
                "rounded-xl border p-3 transition-colors",
                item.completed
                  ? "border-muted bg-muted/30"
                  : "border-border/60 bg-background",
              )}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => handleToggle(item)}
                  className={cn("mt-0.5", memoryCheckboxClassName)}
                  disabled={isPending}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm",
                      item.completed && "text-muted-foreground line-through",
                    )}
                  >
                    {item.text}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {item.priority && (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
                          PRIORITY_STYLES[item.priority],
                        )}
                      >
                        {item.priority}
                      </span>
                    )}
                    {item.assignee && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="size-3" />
                        {item.assignee}
                      </span>
                    )}
                    {item.dueDate && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="size-3" />
                        {item.dueDate}
                      </span>
                    )}
                  </div>
                  {item.context && (
                    <p className="mt-2 rounded-lg bg-muted/50 p-2 text-xs italic text-muted-foreground">
                      &ldquo;{item.context}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add form */}
      {isAdding ? (
        <div className="rounded-xl border border-border/60 bg-background p-4">
          <div className="space-y-3">
            <div>
              <label htmlFor="action-text" className="mb-1 block text-xs font-medium text-muted-foreground">
                Action item *
              </label>
              <input
                id="action-text"
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="action-assignee" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Assignee
                </label>
                <input
                  id="action-assignee"
                  type="text"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="Who's responsible?"
                  className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="action-due" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Due date
                </label>
                <input
                  id="action-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Priority</label>
              <div className="flex gap-2">
                {(["low", "medium", "high"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(priority === p ? "" : p)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium capitalize transition",
                      priority === p
                        ? PRIORITY_STYLES[p]
                        : "border-border/60 text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setText("");
                  setAssignee("");
                  setDueDate("");
                  setPriority("");
                }}
                className="h-8 rounded-full px-3 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending || !text.trim()}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-sm font-medium text-background transition hover:bg-foreground/90 disabled:opacity-60"
              >
                {isPending && <Loader2 className="size-3 animate-spin" />}
                Add
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <Plus className="size-3.5" />
          Add action item
        </button>
      )}
    </div>
  );
}
