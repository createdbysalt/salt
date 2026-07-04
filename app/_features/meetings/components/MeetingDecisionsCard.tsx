"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";
import { MentionInput } from "@/app/_features/memory/components/MentionInput";
import type { ResolvedEntity } from "@/app/_lib/notes";
import type { MeetingDecisionRecord } from "../queries";
import { addMeetingDecision } from "../actions/meeting-content";

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

interface DecisionItemProps {
  decision: MeetingDecisionRecord;
  onDismiss: (decisionId: string) => void;
  isLoading: boolean;
}

function DecisionItem({ decision, onDismiss, isLoading }: DecisionItemProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0 flex-1 border-l-2 border-sky/35 pl-3">
        <p className="break-words text-sm leading-snug text-foreground">{decision.text}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatTimeAgo(decision.createdAt)}
        </p>
        {decision.rationale && (
          <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground/80">
            {decision.rationale}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3 pt-0.5">
        <button
          type="button"
          onClick={() => onDismiss(decision.id)}
          disabled={isLoading}
          className="text-xs text-muted-foreground/60 transition-colors hover:text-foreground disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

interface AddDecisionFormProps {
  meetingId: string;
  onAdd: (decision: MeetingDecisionRecord) => void;
  onCancel: () => void;
  entities: ResolvedEntity[];
}

function AddDecisionForm({ meetingId, onAdd, onCancel, entities }: AddDecisionFormProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [rationale, setRationale] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = text.trim().length > 0 && !saving;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    try {
      const result = await addMeetingDecision({
        meetingId,
        text: text.trim(),
        rationale: rationale.trim() || undefined,
      });

      if (!result.ok) {
        toast.error(result.message || "Failed to add decision");
        return;
      }

      const newDecision: MeetingDecisionRecord = {
        id: result.data.id,
        text: text.trim(),
        rationale: rationale.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      onAdd(newDecision);
      toast.success("Decision added");
      router.refresh();
    } catch {
      toast.error("Failed to add decision");
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
        <label
          htmlFor="decision-text"
          className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
        >
          Decision
        </label>
        <MentionInput
          value={text}
          onChange={setText}
          placeholder="e.g. Approved the Q3 budget proposal (use @ to tag people)"
          entities={entities}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
          autoFocus
          disabled={saving}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="decision-rationale"
          className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
        >
          Rationale (optional)
        </label>
        <input
          id="decision-rationale"
          placeholder="Why was this decided?"
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          className={inlineInputClass}
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
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : "Add decision"}
        </Button>
      </div>
    </form>
  );
}

interface MeetingDecisionsCardProps {
  decisions: MeetingDecisionRecord[];
  meetingId: string;
  variant?: "card" | "embedded";
  entities?: ResolvedEntity[];
}

export function MeetingDecisionsCard({
  decisions: initialDecisions,
  meetingId,
  variant = "embedded",
  entities = [],
}: MeetingDecisionsCardProps) {
  const [decisions, setDecisions] = useState(initialDecisions);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const handleAddDecision = () => setAdding(true);
    window.addEventListener("meeting:add-decision", handleAddDecision);
    return () => window.removeEventListener("meeting:add-decision", handleAddDecision);
  }, []);

  const handleDismiss = async (id: string) => {
    setLoadingIds((prev) => new Set([...prev, id]));
    try {
      // TODO: Replace with server action
      setDecisions((prev) => prev.filter((d) => d.id !== id));
      toast.success("Decision removed");
    } catch (error) {
      console.error("Failed to remove decision:", error);
      toast.error("Failed to remove decision");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleAdd = (decision: MeetingDecisionRecord) => {
    setDecisions((prev) => [decision, ...prev]);
    setAdding(false);
  };

  const content = (
    <>
      {variant === "card" ? (
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Lightbulb
              className={cn("size-[18px] shrink-0", decisions.length > 0 ? "text-sky" : "text-muted-foreground")}
              strokeWidth={1.75}
            />
            <span className="chip">Decisions</span>
            {decisions.length > 0 && (
              <span className="rounded-full bg-sky/10 px-2 py-0.5 text-xs font-medium text-sky">
                {decisions.length}
              </span>
            )}
          </div>
          {!adding && decisions.length > 0 && (
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
          {decisions.length > 0 && (
            <span className="mr-auto text-xs text-muted-foreground">
              {decisions.length} decision{decisions.length !== 1 ? "s" : ""}
            </span>
          )}
          {!adding && decisions.length > 0 && (
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
          <AddDecisionForm
            meetingId={meetingId}
            onAdd={handleAdd}
            onCancel={() => setAdding(false)}
            entities={entities}
          />
        )}

        {decisions.length > 0 ? (
          <div className="divide-y divide-border/40 rounded-xl border border-border/50 px-4">
            {decisions.map((decision) => (
              <DecisionItem
                key={decision.id}
                decision={decision}
                onDismiss={handleDismiss}
                isLoading={loadingIds.has(decision.id)}
              />
            ))}
          </div>
        ) : null}

        {decisions.length === 0 && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-3 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            <Plus className="size-3.5" strokeWidth={2.25} />
            Add decision
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
