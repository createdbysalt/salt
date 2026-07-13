"use client";

import type { ConnectorDefinition } from "@/app/_features/connectors";
import { cn } from "@repo/utils";
import { ApiKeyConnectForm } from "./ApiKeyConnectForm";
import { ConnectorConnectHelp } from "./ConnectorConnectHelp";

interface ConnectorApiKeyConnectSectionProps {
  definition: ConnectorDefinition;
  onSubmit: (
    apiKey: string,
    extraFields: Record<string, string>,
  ) => Promise<boolean>;
  /** Defaults to "Connect {name}". */
  heading?: string;
  submitLabel?: string;
  /** Tighter padding for the 280px detail sidebar. */
  layout?: "default" | "sidebar";
}

function connectCardClass(isSidebar: boolean) {
  return cn(
    "rounded-2xl border border-border/70 bg-muted/20",
    isSidebar ? "p-4" : "p-5",
  );
}

/** Guided API-key connect block for the connector detail page. */
export function ConnectorApiKeyConnectSection({
  definition,
  onSubmit,
  heading,
  submitLabel,
  layout = "default",
}: ConnectorApiKeyConnectSectionProps) {
  const defaultAction = `Connect ${definition.name}`;
  const isSidebar = layout === "sidebar";
  const actionLabel = submitLabel ?? defaultAction;
  const title = heading ?? defaultAction;

  if (isSidebar && definition.connectHelp) {
    return (
      <>
        <section className={cn(connectCardClass(isSidebar), "space-y-4")}>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <ApiKeyConnectForm
            definition={definition}
            onSubmit={onSubmit}
            variant="inline"
            submitLabel={actionLabel}
          />
        </section>
        <section className={cn(connectCardClass(isSidebar), "space-y-2")}>
          <h2 className="text-sm font-semibold text-foreground">How to connect</h2>
          <ConnectorConnectHelp
            content={definition.connectHelp}
            variant="steps"
          />
        </section>
      </>
    );
  }

  return (
    <section className={cn(connectCardClass(isSidebar), "space-y-4")}>
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {definition.connectHelp ? (
          <ConnectorConnectHelp
            content={definition.connectHelp}
            className={isSidebar ? "text-xs" : undefined}
          />
        ) : null}
      </div>
      <ApiKeyConnectForm
        definition={definition}
        onSubmit={onSubmit}
        variant="inline"
        submitLabel={actionLabel}
      />
    </section>
  );
}
