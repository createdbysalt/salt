"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Brain, Sparkles, Shield, ShieldCheck, ShieldOff } from "lucide-react";
import {
  Button,
  Label,
  Slider,
} from "@repo/ui";
import { SettingsPage } from "../SettingsPage";
import { SettingsSection } from "../SettingsSection";
import { SettingsCard } from "../SettingsCard";
import {
  getWorkspaceTrustLevel,
  updateWorkspaceTrustLevel,
  type WorkspaceTrustLevel,
} from "./plays-actions";
import {
  getMemoryCareSettings,
  updateMemoryCareThreshold,
} from "@/app/_features/memory/care/actions";

interface PlaysSectionProps {
  workspaceId: string;
  initialThreshold?: number;
  initialTrustLevel?: WorkspaceTrustLevel;
}

const THRESHOLD_LABELS: Record<number, { label: string; description: string }> = {
  50: {
    label: "More autonomous",
    description: "Salt acts faster with less evidence. Good for low-risk records.",
  },
  65: {
    label: "Balanced",
    description: "Salt waits for moderate evidence before acting.",
  },
  85: {
    label: "Conservative",
    description: "Salt accumulates strong evidence before acting. Recommended for most users.",
  },
  100: {
    label: "Always ask",
    description: "Salt never applies changes on its own; everything waits in Watching.",
  },
};

function getThresholdMeta(value: number) {
  if (value >= 95) return THRESHOLD_LABELS[100];
  if (value >= 75) return THRESHOLD_LABELS[85];
  if (value >= 55) return THRESHOLD_LABELS[65];
  return THRESHOLD_LABELS[50];
}

export function PlaysSection({ workspaceId, initialThreshold, initialTrustLevel }: PlaysSectionProps) {
  const [threshold, setThreshold] = useState(initialThreshold ?? 85);
  const [savedThreshold, setSavedThreshold] = useState(initialThreshold ?? 85);
  const [trustLevel, setTrustLevel] = useState<WorkspaceTrustLevel>(initialTrustLevel ?? "read_only");
  const [isLoading, setIsLoading] = useState(!initialThreshold);
  const [isPending, startTransition] = useTransition();
  const [isTrustPending, startTrustTransition] = useTransition();

  useEffect(() => {
    if (!initialThreshold) {
      loadSettings();
    }
  }, [initialThreshold]);

  async function loadSettings() {
    try {
      const [careSettings, trustValue] = await Promise.all([
        getMemoryCareSettings(workspaceId),
        getWorkspaceTrustLevel(workspaceId),
      ]);
      setThreshold(careSettings.threshold);
      setSavedThreshold(careSettings.threshold);
      setTrustLevel(trustValue);
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }

  function handleTrustChange(newLevel: WorkspaceTrustLevel) {
    setTrustLevel(newLevel);
    startTrustTransition(async () => {
      try {
        await updateWorkspaceTrustLevel(workspaceId, newLevel);
        const messages: Record<WorkspaceTrustLevel, string> = {
          read_only: "Salt is now in read-only mode",
          act_with_approval: "Salt will ask before every action",
          trust: "Salt will act automatically, asking only when needed",
        };
        toast.success(messages[newLevel]);
      } catch {
        setTrustLevel(trustLevel); // Revert on error
        toast.error("Failed to update trust level");
      }
    });
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateMemoryCareThreshold(workspaceId, threshold);
        setSavedThreshold(threshold);
        toast.success("Autonomy settings saved");
      } catch {
        toast.error("Failed to save settings");
      }
    });
  }

  const hasChanges = threshold !== savedThreshold;
  const meta = getThresholdMeta(threshold);

  return (
    <SettingsPage title="Plays">
      <SettingsSection
        title="Salt Autonomy"
        description="Control how confident Salt needs to be before automatically updating your records."
      >
        <SettingsCard>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6 p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-muted-foreground" />
                    <Label className="text-base font-medium">
                      Auto-apply threshold
                    </Label>
                  </div>
                  <span className="text-2xl font-semibold tabular-nums">
                    {threshold}%
                  </span>
                </div>

                <Slider
                  value={[threshold]}
                  onValueChange={([value]) => setThreshold(value)}
                  min={50}
                  max={100}
                  step={5}
                  className="w-full"
                />

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>More autonomous</span>
                  <span>Always ask</span>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{meta.label}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {meta.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  When Salt is confident enough (based on accumulated evidence from
                  emails, meetings, and other sources), it can automatically update
                  records without asking.
                </p>
                <p>
                  Changes are always visible in{" "}
                  <span className="font-medium text-foreground">Memory → Filter → Handled</span>,
                  where you can roll them back if needed.
                </p>
              </div>

              {hasChanges && (
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={isPending}
                    className="min-w-[100px]"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="Connector Trust"
        description="Control whether Salt can take actions through your connected apps."
      >
        <SettingsCard>
          <div className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              {trustLevel === "trust" ? (
                <ShieldOff className="h-5 w-5 text-primary" />
              ) : trustLevel === "act_with_approval" ? (
                <ShieldCheck className="h-5 w-5 text-primary" />
              ) : (
                <Shield className="h-5 w-5 text-muted-foreground" />
              )}
              <Label className="text-base font-medium">
                Action permissions
              </Label>
              {isTrustPending && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => handleTrustChange("read_only")}
                disabled={isTrustPending}
                className={`rounded-lg border-2 p-4 text-left transition-colors ${
                  trustLevel === "read_only"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">Read</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Salt can search and read, but never take actions.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleTrustChange("act_with_approval")}
                disabled={isTrustPending}
                className={`rounded-lg border-2 p-4 text-left transition-colors ${
                  trustLevel === "act_with_approval"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="font-medium">Ask</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Salt can take actions, but always asks for your approval first.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleTrustChange("trust")}
                disabled={isTrustPending}
                className={`rounded-lg border-2 p-4 text-left transition-colors ${
                  trustLevel === "trust"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <ShieldOff className="h-4 w-4" />
                  <span className="font-medium">Trust</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Salt acts automatically. Only asks when a tool or playbook step requires approval.
                </p>
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              This applies to all connected apps. In Trust mode, you can configure which tools require approval in each connector's settings.
            </p>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="Coming soon"
        description="Additional plays settings are being developed."
      >
        <SettingsCard>
          <div className="space-y-3 p-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-2 size-1.5 rounded-full bg-muted-foreground/50" />
                <span>Approval defaults for specific playbooks</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2 size-1.5 rounded-full bg-muted-foreground/50" />
                <span>Custom playbook run preferences</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2 size-1.5 rounded-full bg-muted-foreground/50" />
                <span>Field-level trust settings</span>
              </li>
            </ul>
          </div>
        </SettingsCard>
      </SettingsSection>
    </SettingsPage>
  );
}
