"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Label, Switch } from "@repo/ui";
import type { ProfilePlaybookSettings } from "@/app/_features/plays/playbooks/records-engine/types";
import { updateProfilePlaybookSettings } from "@/app/_features/people/actions/profile-fields";

type ProfilePlaybookSettingsFormProps = {
  blueprintSlug: string;
  settings: ProfilePlaybookSettings | null;
  onSaved: (settings: ProfilePlaybookSettings) => void;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function ProfilePlaybookSettingsForm({
  blueprintSlug,
  settings,
  onSaved,
}: ProfilePlaybookSettingsFormProps) {
  const [threshold, setThreshold] = useState(settings?.autoApplyThreshold ?? 85);
  const [aiFallback, setAiFallback] = useState(settings?.aiFallbackEnabled ?? true);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Keep the latest values that should NOT retrigger autosave in refs, so the
  // effect only depends on the user-driven controls (threshold, aiFallback).
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      const current = settingsRef.current;
      setStatus("saving");
      setError(null);
      const result = await updateProfilePlaybookSettings({
        blueprintSlug,
        contextFacts: current?.contextFacts ?? {},
        autoApplyThreshold: threshold,
        aiFallbackEnabled: aiFallback,
      });
      if (!result.ok) {
        setStatus("error");
        setError(result.message);
        return;
      }
      setStatus("saved");
      onSavedRef.current({
        autoApplyThreshold: threshold,
        aiFallbackEnabled: aiFallback,
        contextFacts: current?.contextFacts ?? {},
        fillRulesOverride: current?.fillRulesOverride ?? null,
        activeSections: current?.activeSections ?? ["relationship_type", "title", "org_link"],
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [threshold, aiFallback, blueprintSlug]);

  return (
    <div className="space-y-10">
      <section className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <SectionHeader
            title="Automation"
            description="Control when Salt acts on its own versus asking you first. Changes save automatically."
          />
          <SaveStatusIndicator status={status} />
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="threshold">Auto-apply threshold</Label>
            <span className="text-sm font-semibold tabular-nums">{threshold}%</span>
          </div>
          <input
            id="threshold"
            type="range"
            min={50}
            max={100}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-foreground"
          />
          <p className="text-xs text-muted-foreground">
            When Salt is this confident or more, it applies the change on its own. Below that, it waits
            for your review.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Fill gaps Salt is confident about</p>
            <p className="text-xs text-muted-foreground">
              When no rule matches, Salt infers the value from context and shows why. It
              only auto-applies above your threshold — anything less waits for your review.
            </p>
          </div>
          <Switch checked={aiFallback} onCheckedChange={setAiFallback} />
        </div>
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === "saving") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Saving…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="size-3.5 text-foreground" />
        Saved
      </span>
    );
  }
  return null;
}
