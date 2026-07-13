"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui";
import type { ConnectorDefinition } from "@/app/_features/connectors";
import { ConnectorIcon } from "./connector-icons";
import { ApiKeyConnectForm } from "./ApiKeyConnectForm";

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
 * Connect flow for simple API-key connectors (no guided connectHelp).
 * Connectors with multi-step setup use inline detail-page forms instead.
 */
export function ApiKeyConnectDialog({
  definition,
  open,
  onOpenChange,
  onSubmit,
}: ApiKeyConnectDialogProps) {
  if (!definition) {
    return null;
  }

  const handleSubmit = async (
    apiKey: string,
    extraFields: Record<string, string>,
  ): Promise<boolean> => {
    const ok = await onSubmit(apiKey, extraFields);
    if (ok) {
      onOpenChange(false);
    }
    return ok;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

        <ApiKeyConnectForm
          definition={definition}
          onSubmit={handleSubmit}
          variant="dialog"
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
