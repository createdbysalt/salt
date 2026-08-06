"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@repo/utils";
import { Switch, Label } from "@repo/ui";
import type {
  ConnectorEmailMode,
  ConnectorTrustSettings,
} from "@/app/_features/connectors";

export function PermissionPill({
  label,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-foreground/20 bg-muted text-foreground"
          : "border-border/60 text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

export function ConnectorCaptureSection({
  name,
  connected,
  enabled,
  saving,
  disabled,
  onChange,
}: {
  name: string;
  connected: boolean;
  enabled: boolean;
  saving: boolean;
  disabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const switchId = "capture-toggle";

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Label
            htmlFor={switchId}
            className="text-sm font-semibold text-foreground cursor-pointer"
          >
            Memory capture
          </Label>
          {saving ? (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        <Switch
          id={switchId}
          checked={enabled}
          onCheckedChange={onChange}
          disabled={disabled}
          aria-label="Toggle memory capture"
        />
      </div>

      <p className="text-xs leading-snug text-muted-foreground">
        {enabled
          ? `Salt learns from ${name} — new items feed your Memory as captures. Turn off any time.`
          : `Salt won't learn from ${name} until you turn this on.`}
      </p>

      {!connected ? (
        <p className="text-xs text-muted-foreground">
          Connect this app to manage capture.
        </p>
      ) : null}
    </section>
  );
}

export function ConnectorPermissionsSection({
  isEmailProvider,
  connected,
  settings,
  saving,
  disabled,
  settingsLink,
  onEmailModeChange,
}: {
  /** True for email providers (Gmail, Outlook) that support draft/send mode. */
  isEmailProvider: boolean;
  connected: boolean;
  settings: ConnectorTrustSettings | undefined;
  saving: boolean;
  disabled: boolean;
  /** Optional richer Settings affordance (e.g. a Link on the detail page). */
  settingsLink?: React.ReactNode;
  onEmailModeChange: (emailMode: ConnectorEmailMode) => void;
}) {
  // Trust is workspace-global (one switch in Settings); this section only
  // reflects it and manages the email mode for email providers.
  const trustLevel = settings?.trustLevel ?? "read_only";
  const emailMode = settings?.emailMode ?? "draft";

  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">Permissions</h3>
        {saving ? (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      <p className="text-xs leading-snug text-muted-foreground">
        {trustLevel === "read_only"
          ? "Salt is in read-only mode — it can look, never act. Change this for all connectors in Settings → Connectors."
          : "Salt can act — every action waits for your approval first. Change this for all connectors in Settings → Connectors."}
      </p>

      {settingsLink}

      {isEmailProvider ? (
        <div className="space-y-1.5">
          <div
            className="flex flex-wrap gap-1.5"
            role="radiogroup"
            aria-label="Email mode"
          >
            <PermissionPill
              label="Draft"
              selected={emailMode === "draft"}
              disabled={disabled || trustLevel === "read_only"}
              onSelect={() => onEmailModeChange("draft")}
            />
            <PermissionPill
              label="Send"
              selected={emailMode === "send"}
              disabled={disabled || trustLevel === "read_only"}
              onSelect={() => onEmailModeChange("send")}
            />
          </div>
          <p className="text-xs leading-snug text-muted-foreground">
            {emailMode === "draft"
              ? "Salt prepares drafts — nothing sends until you do."
              : "Salt can send email after you approve each message."}
          </p>
        </div>
      ) : null}

      {!connected ? (
        <p className="text-xs text-muted-foreground">
          Connect this app to manage its permissions.
        </p>
      ) : null}
    </section>
  );
}
