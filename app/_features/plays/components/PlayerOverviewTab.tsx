"use client";

import { useCallback, useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import { Loader2, Save, ShieldCheck, Sparkles } from "lucide-react";
import { Button, Label, Textarea } from "@repo/ui";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import type { PlayerWithVisual } from "../players/visual";
import { PLAYER_COLOR_SOFT } from "../players/visual";
import type { PlayerContextRow } from "../players/queries";
import { savePlayerContext } from "../actions";

interface PlayerOverviewTabProps {
  player: PlayerWithVisual;
  context: PlayerContextRow | null;
}

type ContextFieldProps = {
  id: string;
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
};

function ContextFieldCard({
  id,
  label,
  hint,
  placeholder,
  value,
  onChange,
  rows,
}: ContextFieldProps) {
  const hasValue = value.trim().length > 0;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card/80 p-4 shadow-sm transition-colors sm:p-5",
        hasValue ? "border-border/70" : "border-border/50",
      )}
    >
      <div className="mb-3 space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        <p className="text-xs leading-snug text-muted-foreground">{hint}</p>
      </div>
      <Textarea
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        rows={rows}
        className="resize-none border-border/50 bg-background/60"
      />
    </div>
  );
}

export function PlayerOverviewTab({ player, context }: PlayerOverviewTabProps) {
  const [isPending, startTransition] = useTransition();

  const [domainKnowledge, setDomainKnowledge] = useState(
    context?.domain_knowledge ?? "",
  );
  const [tonePreferences, setTonePreferences] = useState(
    context?.tone_preferences ?? "",
  );
  const [workflowPreferences, setWorkflowPreferences] = useState(
    context?.workflow_preferences ?? "",
  );

  const hasChanges =
    domainKnowledge !== (context?.domain_knowledge ?? "") ||
    tonePreferences !== (context?.tone_preferences ?? "") ||
    workflowPreferences !== (context?.workflow_preferences ?? "");

  const handleSave = useCallback(() => {
    startTransition(async () => {
      const contextDoc = [domainKnowledge, tonePreferences, workflowPreferences]
        .filter(Boolean)
        .join("\n\n");

      const result = await savePlayerContext({
        playerSlug: player.slug,
        domain_knowledge: domainKnowledge || null,
        tone_preferences: tonePreferences || null,
        workflow_preferences: workflowPreferences || null,
        context_doc: contextDoc || null,
      });

      if (result.success) {
        toast.success("Player context saved");
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }, [domainKnowledge, tonePreferences, workflowPreferences, player.slug]);

  return (
    <div className="space-y-10">
      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {player.role}
          </p>
          <h2 className="font-display text-2xl tracking-tight text-foreground">
            What {player.name} does
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-foreground/75">
            {player.job}
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-background/40 px-4 py-3.5">
          <div
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-xl",
              PLAYER_COLOR_SOFT[player.color],
            )}
          >
            <ShieldCheck className="size-4" strokeWidth={2} />
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Approval behavior
            </p>
            <p className="mt-1 text-sm leading-snug text-foreground/80">
              {player.approvalBehavior}
            </p>
          </div>
        </div>
      </section>

      <div className="border-t border-border/50" />

      <section className="space-y-6">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-2xl",
              PLAYER_COLOR_SOFT[player.color],
            )}
          >
            <Sparkles className="size-5" strokeWidth={2} />
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="font-display text-2xl tracking-tight text-foreground">
              Teach {player.name}
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-foreground/75">
              Context you add here is injected into every playbook run for {player.name}.
              This is where Salt learns how you like things done.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <ContextFieldCard
            id="domain"
            label="Domain knowledge"
            hint={`What does ${player.name} need to know about your business?`}
            placeholder={`Industry terms, common entities, business rules specific to ${player.name.toLowerCase()} work...`}
            value={domainKnowledge}
            onChange={setDomainKnowledge}
            rows={4}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <ContextFieldCard
              id="tone"
              label="Tone preferences"
              hint={`How should ${player.name} communicate on your behalf?`}
              placeholder="How should messages sound? Formal, casual, direct..."
              value={tonePreferences}
              onChange={setTonePreferences}
              rows={4}
            />
            <ContextFieldCard
              id="workflow"
              label="Workflow preferences"
              hint={`When and how should ${player.name} act?`}
              placeholder="Timing, channels, approval preferences..."
              value={workflowPreferences}
              onChange={setWorkflowPreferences}
              rows={4}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border/40 pt-5">
          {hasChanges ? (
            <p className="mr-auto text-xs text-muted-foreground">Unsaved changes</p>
          ) : null}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isPending}
            className="gap-2"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {isPending ? "Saving..." : "Save context"}
          </Button>
        </div>
      </section>
    </div>
  );
}
