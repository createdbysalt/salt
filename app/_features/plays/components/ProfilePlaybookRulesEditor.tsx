"use client";

import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@repo/ui";
import type {
  ProfileFillRulesDocument,
  ProfilePlaybookSettings,
} from "@/app/_features/plays/playbooks/records-engine/types";
import { saveProfileRulesOverride } from "@/app/_features/people/actions/profile-fields";
import { cn } from "@repo/utils";

type ProfilePlaybookRulesEditorProps = {
  blueprintSlug: string;
  systemRules: ProfileFillRulesDocument | null;
  settings: ProfilePlaybookSettings | null;
  onSaved: (settings: ProfilePlaybookSettings) => void;
};

export function ProfilePlaybookRulesEditor({
  blueprintSlug,
  systemRules,
  settings,
  onSaved,
}: ProfilePlaybookRulesEditorProps) {
  const [showJson, setShowJson] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasOverride = Boolean(settings?.fillRulesOverride);
  const effectiveRules = settings?.fillRulesOverride ?? systemRules;

  async function handleReset() {
    setPending(true);
    setError(null);
    const result = await saveProfileRulesOverride({
      blueprintSlug,
      fillRulesOverride: null,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved({
      autoApplyThreshold: settings?.autoApplyThreshold ?? 85,
      aiFallbackEnabled: settings?.aiFallbackEnabled ?? true,
      contextFacts: settings?.contextFacts ?? {},
      fillRulesOverride: null,
      activeSections: settings?.activeSections ?? ["relationship_type", "title", "org_link"],
    });
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Rule configuration</p>
          <p className="text-xs text-muted-foreground">
            {effectiveRules
              ? `${effectiveRules.rules.length} rules across ${effectiveRules.fields.length} fields.`
              : "No rules loaded."}{" "}
            Repeated manual corrections become proposed rule changes for your review.
          </p>
        </div>
        {hasOverride && (
          <Button type="button" variant="outline" size="sm" onClick={handleReset} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : "Reset to default"}
          </Button>
        )}
      </div>

      {hasOverride && (
        <span className="inline-flex items-center rounded-full bg-flame/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-flame">
          Workspace override active
        </span>
      )}

      {effectiveRules && (
        <div className="border-t border-border/50 pt-3">
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
            onClick={() => setShowJson((value) => !value)}
          >
            <ChevronDown
              className={cn("size-3.5 transition-transform", showJson && "rotate-180")}
            />
            {showJson ? "Hide" : "Show"} raw JSON
          </button>

          {showJson && (
            <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-background/80 border border-border/50 p-3 text-[11px] leading-relaxed">
              {JSON.stringify(effectiveRules, null, 2)}
            </pre>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
