"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { MeetingDecisionRecord } from "../queries";
import { addMeetingDecision } from "../actions";

type MeetingDecisionsListProps = {
  meetingId: string;
  decisions: MeetingDecisionRecord[];
};

export function MeetingDecisionsList({ meetingId, decisions }: MeetingDecisionsListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [text, setText] = useState("");
  const [rationale, setRationale] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (!text.trim()) {
      toast.error("Decision text is required");
      return;
    }

    startTransition(async () => {
      const result = await addMeetingDecision({
        meetingId,
        text: text.trim(),
        rationale: rationale.trim() || undefined,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success("Decision added");
      setIsAdding(false);
      setText("");
      setRationale("");
    });
  };

  if (decisions.length === 0 && !isAdding) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="mb-4 size-12 text-muted-foreground/40" strokeWidth={1.5} />
        <h3 className="text-lg font-medium text-foreground">No decisions recorded</h3>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Log key decisions made during this meeting to keep track of what was agreed.
        </p>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="mt-6 inline-flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-card px-4 text-sm font-medium transition hover:bg-muted"
        >
          <Plus className="size-3.5" strokeWidth={2.5} />
          Add decision
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Existing decisions */}
      {decisions.length > 0 && (
        <ul className="space-y-3">
          {decisions.map((decision) => (
            <li
              key={decision.id}
              className="rounded-xl border border-border/60 bg-background p-4"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-success/10 text-success">
                  <CheckCircle2 className="size-3.5" strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{decision.text}</p>
                  {decision.rationale && (
                    <p className="mt-1 text-sm text-muted-foreground">{decision.rationale}</p>
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
              <label htmlFor="decision-text" className="mb-1 block text-xs font-medium text-muted-foreground">
                Decision *
              </label>
              <input
                id="decision-text"
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What was decided?"
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="decision-rationale" className="mb-1 block text-xs font-medium text-muted-foreground">
                Rationale (optional)
              </label>
              <textarea
                id="decision-rationale"
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="Why was this decided?"
                className="min-h-[80px] w-full resize-none rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setText("");
                  setRationale("");
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
          Add decision
        </button>
      )}
    </div>
  );
}
