"use client";

import { useState, useTransition } from "react";
import { Switch } from "@repo/ui";
import { cn } from "@repo/utils";
import { setCareCapabilityEnabled } from "../care/actions";
import type { CareCapability } from "../care/types";

/**
 * Enable/disable switch for a Memory Care capability. Writes through the
 * care settings action (`profile_playbook_settings` keyed by the care
 * settings slug) — no playbook engine involvement.
 */

interface CareCapabilityToggleProps {
  workspaceId: string;
  capability: CareCapability;
  initialEnabled: boolean;
}

export function CareCapabilityToggle({
  workspaceId,
  capability,
  initialEnabled,
}: CareCapabilityToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    setEnabled(checked);
    startTransition(async () => {
      try {
        await setCareCapabilityEnabled(workspaceId, capability, checked);
      } catch {
        setEnabled(!checked);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={isPending}
        size="sm"
        aria-label={enabled ? "Disable capability" : "Enable capability"}
        className={cn(isPending && "opacity-50")}
      />
      <span className="text-[11px] font-medium text-muted-foreground">
        {enabled ? "Enabled" : "Disabled"}
      </span>
    </div>
  );
}
