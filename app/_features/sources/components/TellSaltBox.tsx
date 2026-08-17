"use client";

import * as React from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import type { CustomizeArea } from "@/app/_features/capture/adapters/rule-entities";
import type { ConnectorRuleEntityType } from "@/app/_features/capture/adapters/types";
import { parseRuleInput } from "@/app/_features/capture/adapters/parse-rule-input";
import { addConnectorRule } from "@/app/_features/connectors/actions/rules";
import { updateCaptureGatePolicy } from "@/app/_features/capture/actions/gate-policy";
import {
  compileTellSaltInstruction,
  type TellSaltCompiledKnob,
} from "../actions/tell-salt";
import { previewForKnob } from "../utils/tell-salt-knobs";
import { planTellSaltSubmission } from "../utils/tell-salt-submission";
import { suggestionsForArea } from "../utils/tell-salt-suggestions";

/**
 * Tell Salt box (Sources → Customize, Phase S2) — one conversational box
 * per area. Values ("spammy-agency.com", "subject:invoice") parse
 * deterministically as the user types; sentences ("keep out anything from
 * spammy agencies") compile through the LLM route. Every path ends at the
 * same confirm gate — a plain-language sentence naming the exact write,
 * with [Looks right] / [Not quite] — so nothing lands by guesswork.
 *
 * A bare value carries no intent, so the confirm state offers the
 * direction toggle (Keep out / Always let in); the sentence updates live.
 */

type ConfirmState =
  | {
      source: "deterministic";
      entityType: ConnectorRuleEntityType;
      entityKey: string;
    }
  | { source: "compiled"; knobs: TellSaltCompiledKnob[] };

export function TellSaltBox({
  area,
  provider,
  onApplied,
  existingKeys = [],
}: {
  area: CustomizeArea | null;
  /** Null = workspace-wide write. */
  provider: string | null;
  onApplied: () => void;
  /** Entity keys already ruled — matching suggestions hide themselves. */
  existingKeys?: readonly string[];
}) {
  const [value, setValue] = React.useState("");
  const [direction, setDirection] = React.useState<"deny" | "allow">("deny");
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [reroute, setReroute] = React.useState<string | null>(null);
  const [refusal, setRefusal] = React.useState<string | null>(null);

  const parsed = React.useMemo(
    () => parseRuleInput(value, area),
    [value, area],
  );
  const showFeedback = value.trim().length > 0 && !confirm && !reroute;
  const suggestions = React.useMemo(
    () => suggestionsForArea(area, existingKeys),
    [area, existingKeys],
  );
  const showSuggestions =
    suggestions.length > 0 &&
    value.trim().length === 0 &&
    !confirm &&
    !reroute &&
    !refusal;

  const reset = () => {
    setValue("");
    setConfirm(null);
    setReroute(null);
    setRefusal(null);
    setDirection("deny");
  };

  const submit = async (override?: string) => {
    const input = (override ?? value).trim();
    const plan = planTellSaltSubmission(input, area);
    if (plan.kind === "confirm-rule") {
      setConfirm({
        source: "deterministic",
        entityType: plan.entityType,
        entityKey: plan.entityKey,
      });
      setRefusal(null);
      return;
    }
    if (plan.kind === "hint") return;

    setBusy(true);
    setRefusal(null);
    const result = await compileTellSaltInstruction({
      instruction: input,
      area,
    });
    setBusy(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (result.outcome === "compiled") {
      setConfirm({ source: "compiled", knobs: result.knobs });
    } else if (result.outcome === "rerouted") {
      setReroute(result.message);
    } else {
      setRefusal(result.message);
    }
  };

  const applyKnobs = async (knobs: TellSaltCompiledKnob[]) => {
    setBusy(true);
    for (const knob of knobs) {
      if (knob.kind === "connector_rule") {
        const result = await addConnectorRule({
          provider: knob.provider ?? provider,
          ruleType: knob.ruleType,
          entityType: knob.entityType,
          entityKey: knob.entityKey,
        });
        if (!result.success) {
          setBusy(false);
          toast.error(result.error);
          return;
        }
      } else {
        const result = await updateCaptureGatePolicy({
          email: { [knob.setting]: knob.value },
        });
        if (!result.success) {
          setBusy(false);
          toast.error(result.error);
          return;
        }
      }
    }
    setBusy(false);
    reset();
    onApplied();
  };

  const confirmDeterministic = async () => {
    if (!confirm || confirm.source !== "deterministic") return;
    const knob: TellSaltCompiledKnob = {
      kind: "connector_rule",
      ruleType: direction,
      entityType: confirm.entityType,
      entityKey: confirm.entityKey,
      provider,
      preview: "",
    };
    await applyKnobs([knob]);
  };

  const confirmSentence = (): string | null => {
    if (!confirm) return null;
    if (confirm.source === "compiled") {
      return confirm.knobs.map((knob) => knob.preview).join(" ");
    }
    return previewForKnob({
      kind: "connector_rule",
      ruleType: direction,
      entityType: confirm.entityType,
      entityKey: confirm.entityKey,
      provider,
    });
  };

  const sentence = confirmSentence();

  return (
    <div className="space-y-1.5">
      {/* Styled after the Memory → Customize composer: an inset rounded-full
          pill with an aurora spark and an active-pill submit. */}
      <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/70 p-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] transition focus-within:border-foreground/25 focus-within:bg-background dark:border-border dark:bg-background/60 dark:focus-within:bg-muted/40">
        <span className="surface-aurora grid size-8 shrink-0 place-items-center rounded-full">
          <Sparkles className="relative z-10 size-4 text-white" />
        </span>
        <input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setConfirm(null);
            setReroute(null);
            setRefusal(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !busy) void submit();
          }}
          placeholder="Tell me what to watch for…"
          aria-label="Tell Salt"
          disabled={busy}
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || value.trim().length === 0}
          className="surface-aurora shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 hover:shadow disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="relative z-10 inline-flex items-center">
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Tell Salt"}
          </span>
        </button>
      </div>

      {/* Subtle one-click ideas under the composer — a click fills the box
          and submits, so the confirm gate's direction toggle teaches how
          let-in vs keep-out is chosen. Chips hide once the same key is
          already a rule. */}
      {showSuggestions ? (
        <div className="flex flex-wrap items-center gap-1.5 pl-2 pt-1">
          <span className="text-xs text-muted-foreground/70">Try:</span>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={busy}
              onClick={() => {
                setValue(suggestion);
                setConfirm(null);
                setReroute(null);
                setRefusal(null);
                void submit(suggestion);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/60 px-3 py-1 text-xs text-muted-foreground transition hover:border-foreground/30 hover:bg-muted/50 hover:text-foreground disabled:opacity-50"
            >
              <Plus className="size-3" />
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      {showFeedback ? (
        <p
          aria-live="polite"
          className="min-h-4 text-xs leading-snug text-muted-foreground"
        >
          {parsed.ok ? parsed.preview : parsed.hint}
        </p>
      ) : null}

      {confirm && sentence ? (
        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
          <p aria-live="polite" className="text-sm leading-snug">
            Got it — {sentence}
          </p>
          {confirm.source === "deterministic" ? (
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                aria-pressed={direction === "deny"}
                onClick={() => setDirection("deny")}
                className={`rounded-full px-2.5 py-1 transition ${
                  direction === "deny"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Keep out
              </button>
              <button
                type="button"
                aria-pressed={direction === "allow"}
                onClick={() => setDirection("allow")}
                className={`rounded-full px-2.5 py-1 transition ${
                  direction === "allow"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Always let in
              </button>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="rounded-full px-4"
              disabled={busy}
              onClick={() =>
                void (confirm.source === "deterministic"
                  ? confirmDeterministic()
                  : applyKnobs(confirm.knobs))
              }
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Looks right"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-full px-4"
              disabled={busy}
              onClick={() => setConfirm(null)}
            >
              Not quite
            </Button>
          </div>
        </div>
      ) : null}

      {reroute ? (
        <p aria-live="polite" className="text-xs leading-snug text-muted-foreground">
          {reroute}{" "}
          <a href="/memory?tab=customize" className="underline underline-offset-2">
            Add it on Memory
          </a>
        </p>
      ) : null}

      {refusal ? (
        <p aria-live="polite" className="text-xs leading-snug text-muted-foreground">
          {refusal}
        </p>
      ) : null}
    </div>
  );
}
