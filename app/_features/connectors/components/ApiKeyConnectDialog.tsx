"use client";

import * as React from "react";
import { ExternalLink, Loader2 } from "lucide-react";
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
import { CONNECTOR_ICONS } from "./connector-icons";

interface ApiKeyConnectDialogProps {
  definition: ConnectorDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Resolves true on success; the dialog closes itself. */
  onSubmit: (apiKey: string) => Promise<boolean>;
}

/**
 * Connect flow for API-key connectors (Stripe). The key goes straight to the
 * server action — it is never stored client-side beyond this controlled input.
 */
export function ApiKeyConnectDialog({
  definition,
  open,
  onOpenChange,
  onSubmit,
}: ApiKeyConnectDialogProps) {
  const [apiKey, setApiKey] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setApiKey("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!definition) {
    return null;
  }

  const iconMeta = CONNECTOR_ICONS[definition.id];
  const Icon = iconMeta?.Icon;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || apiKey.trim().length === 0) {
      return;
    }
    setSubmitting(true);
    setError(null);
    const ok = await onSubmit(apiKey.trim());
    if (ok) {
      onOpenChange(false);
    } else {
      setError("Connection failed. Check the key and try again.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background">
                <Icon className="size-[18px]" color={iconMeta.color} />
              </div>
            )}
            <DialogTitle>Connect {definition.name}</DialogTitle>
          </div>
          <DialogDescription className="pt-1 text-left">
            Paste a secret key from your {definition.name} dashboard. Salt
            stores it with its connection provider, never in your browser, and
            asks before anything changes in your account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="connector-api-key">Secret key</Label>
            <Input
              id="connector-api-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="rk_live_… or sk_live_…"
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
            {definition.id === "stripe" && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                A restricted key keeps Salt on a short leash — grant read
                access plus write on Customers, Invoices, and Subscriptions.{" "}
                <a
                  href="https://dashboard.stripe.com/apikeys/create"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 font-medium text-foreground underline underline-offset-2 hover:opacity-80"
                >
                  Create one in Stripe
                  <ExternalLink className="size-3" aria-hidden />
                </a>
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
            <Button type="submit" disabled={submitting || apiKey.trim().length === 0}>
              {submitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {submitting ? "Connecting" : `Connect ${definition.name}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
