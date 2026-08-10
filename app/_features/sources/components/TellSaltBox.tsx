"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
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
}: {
  area: CustomizeArea | null;
  /** Null = workspace-wide write. */
  provider: string | null;
  onApplied: () => void;
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

  const reset = () => {
    setValue("");
    setConfirm(null);
    setReroute(null);
    setRefusal(null);
    setDirection("deny");
  };

  const submit = async () => {
    const plan = planTellSaltSubmission(value, area);
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
      instruction: value.trim(),
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
      <div className="flex items-center gap-2">
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
          className="h-9 w-full max-w-md rounded-full border border-border/60 bg-background px-3.5 text-sm outline-none transition hover:border-border focus:ring-4 focus:ring-foreground/5"
        />
        <Button
          type="button"
          size="sm"
          className="rounded-full px-4"
          disabled={busy || value.trim().length === 0}
          onClick={() => void submit()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Tell Salt"}
        </Button>
      </div>

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
