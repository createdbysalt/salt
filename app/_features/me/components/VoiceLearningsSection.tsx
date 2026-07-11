"use client";

import { useState, useTransition } from "react";
import { Brain, Trash2, Loader2, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";
import { forgetOperatorFact } from "../actions";
import type { OperatorMemoryFact } from "../types";

type VoiceLearningsSectionProps = {
  learnings: OperatorMemoryFact[];
};

export function VoiceLearningsSection({ learnings }: VoiceLearningsSectionProps) {
  const [pending, startTransition] = useTransition();
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleLearnings = learnings.filter((l) => !dismissed.has(l.id));

  const handleForget = (fact: OperatorMemoryFact) => {
    setDismissing(fact.id);
    startTransition(async () => {
      const result = await forgetOperatorFact(fact.id);
      setDismissing(null);
      if (result.ok) {
        setDismissed((prev) => new Set([...prev, fact.id]));
        toast.success("Pattern forgotten");
      } else {
        toast.error(result.message);
      }
    });
  };

  if (visibleLearnings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-6 text-center">
        <div className="mx-auto size-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
          <Brain className="size-6 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No patterns learned yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs mx-auto">
          When you edit play drafts, Salt learns your preferences and saves them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {visibleLearnings.map((fact) => {
        const provenance = fact.provenance as { channel?: string; play_run_id?: string } | null;
        const isDeleting = dismissing === fact.id;

        return (
          <div
            key={fact.id}
            className={cn(
              "group flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3 transition-opacity",
              isDeleting && "opacity-50",
            )}
          >
            <div className="size-8 shrink-0 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <MessageSquareText className="size-4 text-violet-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-snug">{fact.value}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] text-muted-foreground">
                  Learned from editing
                  {provenance?.channel && ` a ${provenance.channel} draft`}
                </span>
                <span className="text-[10px] text-muted-foreground/50">
                  {new Date(fact.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
              onClick={() => handleForget(fact)}
              disabled={pending}
              title="Forget this pattern"
            >
              {isDeleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
