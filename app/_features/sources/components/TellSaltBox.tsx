"use client";

import * as React from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";
import type { CustomizeArea } from "@/app/_features/capture/adapters/rule-entities";
import { parseRuleInput } from "@/app/_features/capture/adapters/parse-rule-input";
import { addConnectorRule } from "@/app/_features/connectors/actions/rules";
import { updateCaptureGatePolicy } from "@/app/_features/capture/actions/gate-policy";
import {
  compileTellSaltInstruction,
  type TellSaltCompiledKnob,
} from "../actions/tell-salt";
import { previewForKnob, ruleTargetFor } from "../utils/tell-salt-knobs";
import {
  extractDirection,
  type RuleDirection,
} from "../utils/tell-salt-direction";
import { planTellSaltSubmission } from "../utils/tell-salt-submission";
import { suggestionsForArea } from "../utils/tell-salt-suggestions";

/**
 * Tell Salt box (Sources → Customize) — one conversational box per area.
 *
 * The direction toggle lives IN the composer, where the submit button used
 * to be — visible before a word is typed, so where a rule lands is never a
 * surprise. The active choice wears the aurora style and doubles as the
 * apply button (Enter works too). Leading intent words ("keep out …",
 * "always let in …") preset the toggle as the user types, and the live
 * line below renders the exact write as a sentence ("I'll keep out
 * anything from spammy-agency.com.") the moment the input parses. Parsed
 * values apply immediately (rules are one-click removable, so a hasty
 * Enter costs nothing); only LLM-compiled sentences keep the confirm gate,
 * where a multi-knob write genuinely needs it.
 */

const DIRECTION_OPTIONS: readonly { value: RuleDirection; label: string }[] = [
  { value: "deny", label: "Keep out" },
  { value: "allow", label: "Always let in" },
];

export function TellSaltBox({
  area,
  onApplied,
  existingKeys = [],
}: {
  /** The box's scope: the area view it sits on, or null for workspace-wide. */
  area: CustomizeArea | null;
  onApplied: () => void;
  /** Entity keys already ruled — matching suggestions hide themselves. */
  existingKeys?: readonly string[];
}) {
  const [value, setValue] = React.useState("");
  const [direction, setDirection] = React.useState<RuleDirection>("deny");
  const [confirm, setConfirm] = React.useState<TellSaltCompiledKnob[] | null>(
    null,
  );
  const [busy, setBusy] = React.useState(false);
  const [reroute, setReroute] = React.useState<string | null>(null);
  const [refusal, setRefusal] = React.useState<string | null>(null);

  // Leading intent words ("keep out …") preset the direction and are
  // stripped before parsing; the original text still goes to the compiler
  // untouched when the remainder isn't a parseable value.
  const detection = React.useMemo(() => extractDirection(value), [value]);
  const effectiveInput = detection?.rest ?? value;
  const effectiveDirection = detection?.direction ?? direction;
  const parsed = React.useMemo(
    () => parseRuleInput(effectiveInput, area),
    [effectiveInput, area],
  );

  const showLiveLine = value.trim().length > 0 && !confirm && !reroute;
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

  // Flipping the toggle while intent words are still in the box resolves
  // them into the choice — the words come out so they can't fight it.
  const pickDirection = (next: RuleDirection) => {
    if (detection) setValue(detection.rest);
    setDirection(next);
  };

  const applyKnobs = async (knobs: TellSaltCompiledKnob[]) => {
    setBusy(true);
    for (const knob of knobs) {
      if (knob.kind === "connector_rule") {
        const result = await addConnectorRule({
          provider: null,
          area: knob.area,
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
    toast.success(
      `Got it — ${knobs.map((knob) => previewForKnob(knob)).join(" ")}`,
    );
    reset();
    onApplied();
  };

  const submit = async (override?: string) => {
    const raw = (override ?? value).trim();
    const input = (extractDirection(raw)?.rest ?? raw).trim();
    const plan = planTellSaltSubmission(input, area);

    // A parsed value applies straight away — the live sentence already
    // showed the exact write, direction included.
    if (plan.kind === "confirm-rule") {
      await applyKnobs([
        {
          kind: "connector_rule",
          ruleType: extractDirection(raw)?.direction ?? direction,
          entityType: plan.entityType,
          entityKey: plan.entityKey,
          area,
          preview: "",
        },
      ]);
      return;
    }
    if (plan.kind === "hint") return;

    setBusy(true);
    setRefusal(null);
    const result = await compileTellSaltInstruction({
      instruction: raw,
      area,
    });
    setBusy(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (result.outcome === "compiled") {
      setConfirm(result.knobs);
    } else if (result.outcome === "rerouted") {
      setReroute(result.message);
    } else {
      setRefusal(result.message);
    }
  };

  return (
    <div className="space-y-1.5">
      {/* Styled after the Memory → Customize composer: an inset rounded-full
          pill with an aurora spark. The direction toggle IS the submit —
          it sits where the old Tell Salt button lived, wears the same
          aurora style on the active choice, and clicking the active choice
          applies (Enter works too). */}
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
        <div
          role="group"
          aria-label="Rule direction"
          className="flex shrink-0 items-center gap-1 rounded-full border border-border/60 bg-muted/80 p-1 text-sm font-semibold shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] dark:border-border dark:bg-background/80"
        >
          {DIRECTION_OPTIONS.map((option) => {
            const active = effectiveDirection === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                title={active ? "Apply" : `Switch to ${option.label}`}
                disabled={busy || (active && value.trim().length === 0)}
                onClick={() => {
                  if (active) {
                    void submit();
                  } else {
                    pickDirection(option.value);
                  }
                }}
                className={cn(
                  "rounded-full px-4 py-2 transition disabled:cursor-not-allowed disabled:opacity-40",
                  active
                    ? "surface-aurora text-white shadow-md hover:brightness-105"
                    : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                )}
              >
                <span className="relative z-10 inline-flex items-center">
                  {active && busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    option.label
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Subtle one-click ideas under the composer — a click fills the box
          and applies, teaching that the composer's direction toggle is how
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

      {showLiveLine ? (
        <p
          aria-live="polite"
          className="min-h-4 text-xs leading-snug text-muted-foreground"
        >
          {parsed.ok
            ? `I'll ${
                effectiveDirection === "deny" ? "keep out" : "always let in"
              } ${ruleTargetFor(parsed.entityType, parsed.entityKey)}.`
            : parsed.hint}
        </p>
      ) : null}

      {confirm ? (
        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
          <p aria-live="polite" className="text-sm leading-snug">
            Got it —{" "}
            {confirm.map((knob) => previewForKnob(knob)).join(" ")}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="rounded-full px-4"
              disabled={busy}
              onClick={() => void applyKnobs(confirm)}
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
