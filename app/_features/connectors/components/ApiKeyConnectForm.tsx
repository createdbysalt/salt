"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, Input, Label } from "@repo/ui";
import type { ConnectorDefinition } from "@/app/_features/connectors";

interface ApiKeyConnectFormProps {
  definition: ConnectorDefinition;
  /** Resolves true on success; the form resets itself. */
  onSubmit: (
    apiKey: string,
    extraFields: Record<string, string>,
  ) => Promise<boolean>;
  /** Inline on the detail page, or compact inside the dialog. */
  variant?: "inline" | "dialog";
  submitLabel?: string;
  onCancel?: () => void;
}

/**
 * Secret-key connect form for API-key connectors. Values go straight to the
 * server action — never stored client-side beyond these controlled inputs.
 */
export function ApiKeyConnectForm({
  definition,
  onSubmit,
  variant = "inline",
  submitLabel,
  onCancel,
}: ApiKeyConnectFormProps) {
  const [apiKey, setApiKey] = React.useState("");
  const [extraValues, setExtraValues] = React.useState<Record<string, string>>(
    {},
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const extraFields = definition.apiKeyForm?.extraFields ?? [];
  const extrasComplete = extraFields.every(
    (field) => (extraValues[field.name] ?? "").trim().length > 0,
  );
  const canSubmit = apiKey.trim().length > 0 && extrasComplete && !submitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    setError(null);
    const trimmedExtras: Record<string, string> = {};
    for (const field of extraFields) {
      trimmedExtras[field.name] = (extraValues[field.name] ?? "").trim();
    }
    const ok = await onSubmit(apiKey.trim(), trimmedExtras);
    if (ok) {
      setApiKey("");
      setExtraValues({});
      setSubmitting(false);
    } else {
      setError("Connection failed. Check the details and try again.");
      setSubmitting(false);
    }
  };

  const defaultSubmitLabel = submitLabel ?? `Connect ${definition.name}`;
  const isInline = variant === "inline";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isInline ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Salt stores your key with its connection provider, never in your
          browser, and asks before anything changes in your account.
        </p>
      ) : null}

      {extraFields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={`connector-field-${field.name}`}>{field.label}</Label>
          <Input
            id={`connector-field-${field.name}`}
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder={field.placeholder}
            value={extraValues[field.name] ?? ""}
            onChange={(event) =>
              setExtraValues((previous) => ({
                ...previous,
                [field.name]: event.target.value,
              }))
            }
            disabled={submitting}
          />
          {field.description ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {field.description}
            </p>
          ) : null}
        </div>
      ))}

      <div className="space-y-2">
        <Label htmlFor="connector-api-key">
          {definition.apiKeyForm?.keyLabel ?? "Secret key"}
        </Label>
        <Input
          id="connector-api-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder={
            definition.apiKeyForm?.keyPlaceholder ?? "Paste your API key"
          }
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          disabled={submitting}
          aria-invalid={error ? true : undefined}
        />
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div
        className={
          isInline ? "pt-1" : "flex items-center justify-end gap-2 pt-1"
        }
      >
        {!isInline && onCancel ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
        ) : null}
        <Button
          type="submit"
          disabled={!canSubmit}
          className={isInline ? "rounded-full px-5" : undefined}
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          {submitting ? "Connecting" : defaultSubmitLabel}
        </Button>
      </div>
    </form>
  );
}
