"use client";

import { Button } from "@/app/_components/ui/button";
import { Check, ChevronRight, Plus } from "lucide-react";
import { cn } from "@repo/utils";
import type { CreatedClient } from "./AddClientSheet";

interface AddClientSuccessStepProps {
  client: CreatedClient;
  onInviteToBridge?: () => void;
  onCreateProject?: () => void;
  onSendInvoice?: () => void;
  onViewProfile: () => void;
  onAddAnother: () => void;
  onDone: () => void;
}

interface ActionItem {
  label: string;
  description: string;
  onClick?: () => void;
}

export function AddClientSuccessStep({
  client,
  onInviteToBridge,
  onCreateProject,
  onSendInvoice,
  onViewProfile,
  onAddAnother,
  onDone,
}: AddClientSuccessStepProps) {
  const isProspect = client.lifecycleStage === "lead";

  // Context-aware actions
  const actions: ActionItem[] = isProspect
    ? [
        {
          label: "View profile",
          description: "See their full profile and add notes",
          onClick: onViewProfile,
        },
      ]
    : [
        ...(onInviteToBridge
          ? [
              {
                label: "Invite to Bridge",
                description: "Send them access to the client portal",
                onClick: onInviteToBridge,
              },
            ]
          : []),
        ...(onCreateProject
          ? [
              {
                label: "Create project",
                description: "Start a new project with this client",
                onClick: onCreateProject,
              },
            ]
          : []),
        {
          label: "View profile",
          description: "See their full profile",
          onClick: onViewProfile,
        },
      ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6">
        {/* Success Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div
            className={cn(
              "flex items-center justify-center",
              "size-14 rounded-full mb-4",
              "bg-primary/10 text-primary"
            )}
          >
            <Check className="size-7" strokeWidth={2} />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {client.name} added
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{client.email}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Added as {isProspect ? "prospect" : "client"}
          </p>
        </div>

        {/* Next Steps */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Next steps
          </h4>
          <div className="rounded-lg border bg-card divide-y">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3",
                  "text-left transition-colors",
                  "hover:bg-accent/50",
                  "focus-visible:outline-none focus-visible:bg-accent"
                )}
              >
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">{action.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {action.description}
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-border">
        <Button variant="ghost" size="sm" onClick={onAddAnother} className="gap-1.5">
          <Plus className="size-4" />
          Add another
        </Button>
        <Button onClick={onDone}>Done</Button>
      </div>
    </div>
  );
}
