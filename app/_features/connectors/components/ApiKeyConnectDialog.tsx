"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@repo/ui";
import type { ConnectorDefinition } from "@/app/_features/connectors";
import { ConnectorIcon } from "./connector-icons";

interface ApiKeyConnectDialogProps {
  definition: ConnectorDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Resolves true on success; the dialog closes itself. */
  onSubmit: (
    apiKey: string,
    extraFields: Record<string, string>,
  ) => Promise<boolean>;
}

/**
 * Connect flow for API-key connectors. Renders the secret-key input plus any
 * extra fields the connector's Composio initiation requires (catalog
 * `apiKeyForm`, e.g. Shopify's store subdomain). Values go straight to the
 * server action — never stored client-side beyond these controlled inputs.
 */
export function ApiKeyConnectDialog({
  definition,
  open,
  onOpenChange,
  onSubmit,
}: ApiKeyConnectDialogProps) {
  const [apiKey, setApiKey] = React.useState("");
  const [extraValues, setExtraValues] = React.useState<Record<string, string>>(
    {},
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setApiKey("");
      setExtraValues({});
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!definition) {
    return null;
  }

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
      onOpenChange(false);
    } else {
      setError("Connection failed. Check the details and try again.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="overflow-hidden rounded-2xl sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background">
              <ConnectorIcon id={definition.id} size={18} />
            </div>
            <DialogTitle>Connect {definition.name}</DialogTitle>
          </div>
          <DialogDescription className="pt-1 text-left">
            Paste a secret key from your {definition.name} dashboard. Salt
            stores it with its connection provider, never in your browser, and
            asks before anything changes in your account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {extraFields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={`connector-field-${field.name}`}>
                {field.label}
              </Label>
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
              {field.description && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {field.description}
                </p>
              )}
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
            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {submitting ? "Connecting" : `Connect ${definition.name}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
