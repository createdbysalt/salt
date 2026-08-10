"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import type { CustomizeArea } from "@/app/_features/capture/adapters/rule-entities";
import { parseRuleInput } from "@/app/_features/capture/adapters/parse-rule-input";
import { addConnectorRule } from "@/app/_features/connectors/actions/rules";

/**
 * Smart rule input (Sources → Customize, Phase 2) — one box per section
 * ("Always let in" / "Keep out"). The rule type comes from the section; the
 * entity type is parsed from the value live: the detection line under the
 * input shows what the value will become ("Domain · everyone at acme.com"),
 * and unparseable input keeps Add disabled with a hint — never a guess.
 *
 * Replaces the pane's AddRuleForm (rule-type pills + entity-type pills) —
 * the entity_type vocabulary no longer leaks into the UI.
 */
export function RuleInputBox({
  provider,
  area,
  ruleType,
  label,
  onAdded,
}: {
  /** Null = workspace-wide rule (the "All connectors" view). */
  provider: string | null;
  area: CustomizeArea | null;
  ruleType: "allow" | "deny";
  /** Section label — drives the accessible names ("Always let in"). */
  label: string;
  onAdded: () => void;
}) {
  const [value, setValue] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const parsed = React.useMemo(
    () => parseRuleInput(value, area),
    [value, area],
  );
  const showFeedback = value.trim().length > 0;

  const submit = async () => {
    if (!parsed.ok) return;
    setSaving(true);
    const result = await addConnectorRule({
      provider,
      ruleType,
      entityType: parsed.entityType,
      entityKey: parsed.entityKey,
    });
    setSaving(false);
    if (result.success) {
      setValue("");
      onAdded();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
          }}
          placeholder="name@example.com, @example.com, *pattern*, #channel"
          aria-label={`${label} rule`}
          className="h-9 w-full max-w-xs rounded-full border border-border/60 bg-background px-3.5 text-sm outline-none transition hover:border-border focus:ring-4 focus:ring-foreground/5"
        />
        <Button
          type="button"
          size="sm"
          className="rounded-full px-4"
          disabled={saving || !parsed.ok}
          onClick={() => void submit()}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : "Add"}
        </Button>
      </div>
      <p
        aria-live="polite"
        className="min-h-4 text-xs leading-snug text-muted-foreground"
      >
        {showFeedback ? (parsed.ok ? parsed.preview : parsed.hint) : null}
      </p>
    </div>
  );
}
