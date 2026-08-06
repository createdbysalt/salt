"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, Loader2, Play, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import type { UserPlaybookDraft } from "@/app/_features/plays/playbooks/user-playbook-draft";
import { saveUserPlaybookAction } from "@/app/_features/plays/playbooks/actions/save-user-playbook";

type PlaybookDraftCardProps = {
  draft: UserPlaybookDraft;
  navigateOnSave?: boolean;
  onComplete?: (href: string) => void;
};

export function PlaybookDraftCard({
  draft: initialDraft,
  navigateOnSave = true,
  onComplete,
}: PlaybookDraftCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [savedHref, setSavedHref] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    setSavedHref(null);
    setShowDetails(false);
  }, [initialDraft]);

  const validationErrors = initialDraft.validationErrors ?? [];
  const requiredActions = initialDraft.requiredActions ?? [];

  const stepCount = initialDraft.definition.steps.length;
  const actStepCount = initialDraft.definition.steps.filter(
    (s) => s.kind === "act",
  ).length;

  function saveDraft() {
    startTransition(async () => {
      const result = await saveUserPlaybookAction(initialDraft);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      if (onComplete) {
        toast.success("Playbook saved");
        onComplete(result.data.href);
      } else {
        setSavedHref(result.data.href);
        toast.success("Playbook saved — find it in Plays → Customize");
        if (navigateOnSave) {
          router.push(result.data.href);
        }
      }
      router.refresh();
    });
  }

  if (savedHref) {
    return (
      <div
        className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-3.5 py-3"
        data-testid="playbook-draft-card"
      >
        <div className="flex items-center gap-2 text-sm text-foreground">
          <CheckCircle2
            className="size-4 text-emerald-600"
            strokeWidth={2.25}
          />
          <span className="font-medium">Saved to Playbooks</span>
        </div>
      </div>
    );
  }

  if (!initialDraft.isValid) {
    return (
      <div
        className="overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/5 shadow-[var(--shadow-card)]"
        data-testid="playbook-draft-card"
      >
        <div className="px-3.5 py-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
            <Zap className="size-3.5" strokeWidth={2.25} />
            Playbook has errors
          </div>
          <p className="mt-2 font-display text-lg tracking-tight text-foreground">
            {initialDraft.name || "Untitled Playbook"}
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-amber-700 dark:text-amber-300">
            {validationErrors.map((error, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 block size-1.5 shrink-0 rounded-full bg-amber-500" />
                {error}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)]"
      data-testid="playbook-draft-card"
    >
      <div className="surface-aurora relative px-3.5 py-3 text-white">
        <div className="relative z-10 min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
            <Play className="size-3.5" strokeWidth={2.25} />
            Playbook ready
          </div>
          <p className="mt-2 truncate font-display text-xl tracking-tight">
            {initialDraft.name}
          </p>
          <p className="mt-1 truncate text-sm text-white/80">
            {stepCount} step{stepCount !== 1 ? "s" : ""} ·{" "}
            {actStepCount} action{actStepCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="space-y-3 px-3.5 py-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          {initialDraft.description}
        </p>

        {showDetails && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                When to use
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">
                {initialDraft.whenToUse}
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Procedure
              </p>
              <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-foreground/85">
                {initialDraft.procedureMd}
              </pre>
            </div>

            {requiredActions.length > 0 && (
              <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Required actions
                </p>
                <p className="mt-1.5 text-sm text-foreground/85">
                  {requiredActions.join(", ")}
                </p>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          User playbooks always require approval before running.
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={saveDraft}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-3.5 text-sm font-medium text-background transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={2.25} />
            ) : null}
            Save to Playbooks
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowDetails((open) => !open)}
            className="inline-flex h-8 w-full items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            {showDetails ? "Hide details" : "Show details"}
            <ChevronDown
              className={cn("size-3.5 transition", showDetails && "rotate-180")}
              strokeWidth={2.25}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
