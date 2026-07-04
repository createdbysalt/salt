"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ListChecks, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";
import { MentionInput } from "@/app/_features/memory/components/MentionInput";
import { PersonSearchCombobox } from "@/app/_features/memory/components/PersonSearchCombobox";
import type { ResolvedEntity } from "@/app/_lib/notes";
import type { MeetingActionItemRecord } from "../queries";
import { addMeetingActionItem, toggleMeetingActionItem } from "../actions/meeting-content";

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

const PRIORITY_STYLES: Record<string, string> = {
  low: "text-muted-foreground",
  medium: "text-warning",
  high: "text-destructive",
};

const formLabelClass =
  "text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground";

const inlineFormShellClass =
  "space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4";

function PrioritySelect({
  value,
  onChange,
}: {
  value: "low" | "medium" | "high";
  onChange: (value: "low" | "medium" | "high") => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRIORITY_OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition",
              active
                ? "border-primary/20 bg-primary/10 text-primary"
                : "border-border/40 bg-muted/60 text-foreground/70 hover:bg-muted hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "1 week ago";
  return `${Math.floor(diffDays / 7)} weeks ago`;
}

interface ActionItemProps {
  item: MeetingActionItemRecord;
  onComplete: (itemId: string) => void;
  onDismiss: (itemId: string) => void;
  isLoading: boolean;
}

function ActionItem({ item, onComplete, onDismiss, isLoading }: ActionItemProps) {
  const priorityLabel = item.priority ? PRIORITY_OPTIONS.find((p) => p.value === item.priority)?.label : null;

  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <button
          type="button"
          onClick={() => onComplete(item.id)}
          disabled={isLoading || item.completed}
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition",
            item.completed
              ? "border-success bg-success text-white"
              : "border-border hover:border-success hover:bg-success/10",
          )}
        >
          {item.completed && <Check className="size-3" strokeWidth={3} />}
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "break-words text-sm leading-snug",
              item.completed ? "text-muted-foreground line-through" : "text-foreground",
            )}
          >
            {item.text}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {item.assignee && <span>{item.assignee}</span>}
            {item.dueDate && (
              <>
                {item.assignee && <span className="text-border/80">·</span>}
                <span>Due {new Date(item.dueDate).toLocaleDateString()}</span>
              </>
            )}
            {priorityLabel && (
              <>
                <span className="text-border/80">·</span>
                <span className={PRIORITY_STYLES[item.priority ?? "low"]}>{priorityLabel}</span>
              </>
            )}
            <span className="text-border/80">·</span>
            <span>{formatTimeAgo(item.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 pt-0.5">
        {!item.completed && (
          <button
            type="button"
            onClick={() => onComplete(item.id)}
            disabled={isLoading}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            Complete
          </button>
        )}
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          disabled={isLoading}
          className="text-xs text-muted-foreground/60 transition-colors hover:text-foreground disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

interface AddActionItemFormProps {
  meetingId: string;
  onAdd: (item: MeetingActionItemRecord) => void;
  onCancel: () => void;
  entities: ResolvedEntity[];
}

function AddActionItemForm({ meetingId, onAdd, onCancel, entities }: AddActionItemFormProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [saving, setSaving] = useState(false);

  const canSubmit = text.trim().length > 0 && !saving;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    try {
      const result = await addMeetingActionItem({
        meetingId,
        text: text.trim(),
        assignee: assignee.trim() || undefined,
        priority,
      });

      if (!result.ok) {
        toast.error(result.message || "Failed to add action item");
        return;
      }

      const newItem: MeetingActionItemRecord = {
        id: result.data.id,
        text: text.trim(),
        assignee: assignee.trim() || undefined,
        priority,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      onAdd(newItem);
      toast.success("Action item added");
      router.refresh();
    } catch {
      toast.error("Failed to add action item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={inlineFormShellClass}>
      <div className="space-y-1">
        <label htmlFor="action-text" className={formLabelClass}>
          Action item
        </label>
        <MentionInput
          value={text}
          onChange={setText}
          placeholder="e.g. Send revised proposal by Friday (use @ to tag people)"
          entities={entities}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
          autoFocus
          disabled={saving}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className={formLabelClass}>Assignee</label>
          <PersonSearchCombobox
            value={assignee}
            onChange={setAssignee}
            placeholder="Search people..."
          />
        </div>
        <div className="space-y-2">
          <label className={formLabelClass}>Priority</label>
          <PrioritySelect value={priority} onChange={setPriority} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" className="h-8 px-4" disabled={!canSubmit}>
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : "Add action item"}
        </Button>
      </div>
    </form>
  );
}

interface MeetingActionItemsCardProps {
  actionItems: MeetingActionItemRecord[];
  meetingId: string;
  variant?: "card" | "embedded";
  entities?: ResolvedEntity[];
}

export function MeetingActionItemsCard({
  actionItems: initialItems,
  meetingId,
  variant = "embedded",
  entities = [],
}: MeetingActionItemsCardProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const handleAddAction = () => setAdding(true);
    window.addEventListener("meeting:add-action", handleAddAction);
    return () => window.removeEventListener("meeting:add-action", handleAddAction);
  }, []);

  const handleComplete = async (id: string) => {
    setLoadingIds((prev) => new Set([...prev, id]));
    try {
      const result = await toggleMeetingActionItem({
        actionItemId: id,
        completed: true,
      });

      if (!result.ok) {
        toast.error(result.message || "Failed to complete action item");
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, completed: true, completedAt: new Date().toISOString() }
            : item,
        ),
      );
      toast.success("Action item completed");
      router.refresh();
    } catch (error) {
      console.error("Failed to complete action item:", error);
      toast.error("Failed to complete action item");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDismiss = async (id: string) => {
    setLoadingIds((prev) => new Set([...prev, id]));
    try {
      // TODO: Replace with server action
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Action item removed");
    } catch (error) {
      console.error("Failed to remove action item:", error);
      toast.error("Failed to remove action item");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleAdd = (item: MeetingActionItemRecord) => {
    setItems((prev) => [item, ...prev]);
    setAdding(false);
  };

  const pendingCount = items.filter((item) => !item.completed).length;
  const completedCount = items.filter((item) => item.completed).length;

  const content = (
    <>
      {variant === "card" ? (
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <ListChecks
              className={cn("size-[18px] shrink-0", pendingCount > 0 ? "text-flame" : "text-muted-foreground")}
              strokeWidth={1.75}
            />
            <span className="chip">Action Items</span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-flame/10 px-2 py-0.5 text-xs font-medium text-flame">
                {pendingCount}
              </span>
            )}
          </div>
          {!adding && items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 gap-1 text-xs text-muted-foreground"
              onClick={() => setAdding(true)}
            >
              <Plus className="size-3" />
              Add
            </Button>
          )}
        </header>
      ) : (
        <div className="flex items-center justify-end gap-2">
          {items.length > 0 && (
            <span className="mr-auto text-xs text-muted-foreground">
              {pendingCount} pending{completedCount > 0 ? `, ${completedCount} done` : ""}
            </span>
          )}
          {!adding && items.length > 0 && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="size-3.5" strokeWidth={2.25} />
              Add
            </button>
          )}
        </div>
      )}

      <div className="space-y-3">
        {adding && (
          <AddActionItemForm
            meetingId={meetingId}
            onAdd={handleAdd}
            onCancel={() => setAdding(false)}
            entities={entities}
          />
        )}

        {items.length > 0 ? (
          <div className="divide-y divide-border/40 rounded-xl border border-border/50 px-4">
            {items.map((item) => (
              <ActionItem
                key={item.id}
                item={item}
                onComplete={handleComplete}
                onDismiss={handleDismiss}
                isLoading={loadingIds.has(item.id)}
              />
            ))}
          </div>
        ) : null}

        {items.length === 0 && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-3 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            <Plus className="size-3.5" strokeWidth={2.25} />
            Add action item
          </button>
        )}
      </div>
    </>
  );

  if (variant === "card") {
    return <section className="glass-card rounded-3xl p-6 lg:p-7">{content}</section>;
  }

  return <div className="space-y-3">{content}</div>;
}
