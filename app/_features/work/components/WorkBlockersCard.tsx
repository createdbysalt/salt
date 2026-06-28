"use client";

import { useState } from "react";
import { AlertTriangle, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";
import { InlineSelect } from "@/app/_features/memory/components/AccountFieldEditors";
import type { WorkBlocker, WorkBlockerType } from "../types";
import { resolveBlocker, dismissBlocker, createBlocker } from "../actions/blockers";

const BLOCKER_TYPE_LABELS: Record<WorkBlockerType, string> = {
  awaiting_reply: "Awaiting reply",
  meeting_cancelled: "Meeting cancelled",
  approval_pending: "Approval pending",
  asset_pending: "Asset pending",
  payment_pending: "Payment pending",
  dependency: "Dependency",
  resource_unavailable: "Resource unavailable",
  custom: "Other",
};

const BLOCKER_TYPE_OPTIONS: WorkBlockerType[] = [
  "awaiting_reply",
  "approval_pending",
  "asset_pending",
  "payment_pending",
  "dependency",
  "resource_unavailable",
  "custom",
];

const BLOCKER_TYPE_SELECT_OPTIONS = BLOCKER_TYPE_OPTIONS.map((type) => ({
  value: type,
  label: BLOCKER_TYPE_LABELS[type],
}));

const inlineInputClass =
  "w-full bg-transparent border-0 border-b border-foreground/20 px-0 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/50 transition-colors";

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

interface BlockerItemProps {
  blocker: WorkBlocker;
  onResolve: (blockerId: string) => void;
  onDismiss: (blockerId: string) => void;
  isLoading: boolean;
}

function BlockerItem({ blocker, onResolve, onDismiss, isLoading }: BlockerItemProps) {
  const typeLabel = BLOCKER_TYPE_LABELS[blocker.blockerType] ?? BLOCKER_TYPE_LABELS.custom;

  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0 flex-1 border-l-2 border-warning/35 pl-3">
        <p className="break-words text-sm leading-snug text-foreground">{blocker.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {typeLabel}
          <span className="px-1.5 text-border/80">·</span>
          {formatTimeAgo(blocker.detectedAt)}
          {blocker.source === "salt_inferred" ? (
            <>
              <span className="px-1.5 text-border/80">·</span>
              Salt
            </>
          ) : null}
          {blocker.confidence != null && blocker.confidence < 0.9 ? (
            <>
              <span className="px-1.5 text-border/80">·</span>
              {Math.round(blocker.confidence * 100)}% confidence
            </>
          ) : null}
        </p>
        {blocker.detail ? (
          <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground/80">
            {blocker.detail}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-3 pt-0.5">
        <button
          type="button"
          onClick={() => onResolve(blocker.id)}
          disabled={isLoading}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          Resolve
        </button>
        <button
          type="button"
          onClick={() => onDismiss(blocker.id)}
          disabled={isLoading}
          className="text-xs text-muted-foreground/60 transition-colors hover:text-foreground disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

interface AddBlockerFormProps {
  workId: string;
  onAdd: (blocker: WorkBlocker) => void;
  onCancel: () => void;
}

function AddBlockerForm({ workId, onAdd, onCancel }: AddBlockerFormProps) {
  const [blockerType, setBlockerType] = useState<WorkBlockerType>("awaiting_reply");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = title.trim().length > 0 && !saving;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    try {
      const data = await createBlocker({
        workId,
        blockerType,
        title: title.trim(),
      });
      onAdd({
        id: data.id,
        workId: data.work_id,
        blockerType: data.blocker_type as WorkBlockerType,
        title: data.title,
        detail: data.detail ?? null,
        source: data.source as "user_flagged" | "salt_inferred",
        sourceEntityType: data.source_entity_type ?? null,
        sourceEntityId: data.source_entity_id ?? null,
        confidence: data.confidence ?? 1,
        status: data.status as "active",
        detectedAt: data.detected_at,
        resolvedAt: null,
        resolvedBy: null,
        resolutionNote: null,
      });
    } catch {
      toast.error("Failed to add blocker");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4"
    >
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Type
        </p>
        <InlineSelect
          value={blockerType}
          onChange={setBlockerType}
          options={BLOCKER_TYPE_SELECT_OPTIONS}
          popoverClassName="w-[min(16rem,calc(100vw-2rem))]"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="blocker-title"
          className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
        >
          What&apos;s blocking?
        </label>
        <input
          id="blocker-title"
          placeholder="e.g. Waiting on signed contract"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
          className={inlineInputClass}
          autoFocus
          disabled={saving}
        />
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
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : "Add blocker"}
        </Button>
      </div>
    </form>
  );
}

interface WorkBlockersCardProps {
  blockers: WorkBlocker[];
  workId: string;
  variant?: "card" | "embedded";
}

export function WorkBlockersCard({
  blockers: initialBlockers,
  workId,
  variant = "embedded",
}: WorkBlockersCardProps) {
  const [blockers, setBlockers] = useState(initialBlockers);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  const handleResolve = async (id: string) => {
    setLoadingIds((prev) => new Set([...prev, id]));
    try {
      await resolveBlocker(id);
      setBlockers((prev) => prev.filter((b) => b.id !== id));
    } catch (error) {
      console.error("Failed to resolve blocker:", error);
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
      await dismissBlocker(id);
      setBlockers((prev) => prev.filter((b) => b.id !== id));
    } catch (error) {
      console.error("Failed to dismiss blocker:", error);
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleAdd = (blocker: WorkBlocker) => {
    setBlockers((prev) => [blocker, ...prev]);
    setAdding(false);
  };

  const content = (
    <>
      {variant === "card" ? (
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <AlertTriangle
              className={cn("size-[18px] shrink-0", blockers.length > 0 ? "text-warning" : "text-muted-foreground")}
              strokeWidth={1.75}
            />
            <span className="chip">Blockers</span>
            {blockers.length > 0 && (
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                {blockers.length}
              </span>
            )}
          </div>
          {!adding && blockers.length > 0 && (
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
          {blockers.length > 0 && (
            <span className="mr-auto text-xs text-muted-foreground">
              {blockers.length} active
            </span>
          )}
          {!adding && blockers.length > 0 && (
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
          <AddBlockerForm
            workId={workId}
            onAdd={handleAdd}
            onCancel={() => setAdding(false)}
          />
        )}

        {blockers.length > 0 ? (
          <div className="divide-y divide-border/40 rounded-xl border border-border/50 px-4">
            {blockers.map((blocker) => (
              <BlockerItem
                key={blocker.id}
                blocker={blocker}
                onResolve={handleResolve}
                onDismiss={handleDismiss}
                isLoading={loadingIds.has(blocker.id)}
              />
            ))}
          </div>
        ) : null}

        {blockers.length === 0 && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-3 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            <Plus className="size-3.5" strokeWidth={2.25} />
            Add blocker
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
