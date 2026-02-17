"use client";

import { Button } from "@/app/_components/ui/button";
import {
  Check,
  Mail,
  FolderPlus,
  Receipt,
  User,
  Plus,
  Brain,
  Sparkles,
} from "lucide-react";
import { cn } from "@repo/utils";
import type { CreatedClient } from "./AddClientSheet";

// ============================================================================
// Types
// ============================================================================

interface AddClientSuccessStepProps {
  client: CreatedClient;
  onInviteToBridge?: () => void;
  onCreateProject?: () => void;
  onSendInvoice?: () => void;
  onViewProfile: () => void;
  onAddAnother: () => void;
  onDone: () => void;
}

interface ActionButton {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function AddClientSuccessStep({
  client,
  onInviteToBridge,
  onCreateProject,
  onSendInvoice,
  onViewProfile,
  onAddAnother,
  onDone,
}: AddClientSuccessStepProps) {
  // Build action buttons based on available callbacks
  const actionButtons: ActionButton[] = [
    ...(onInviteToBridge
      ? [
          {
            icon: <Mail className="h-4 w-4" />,
            label: "Invite to Bridge",
            onClick: onInviteToBridge,
          },
        ]
      : []),
    ...(onCreateProject
      ? [
          {
            icon: <FolderPlus className="h-4 w-4" />,
            label: "Create Project",
            onClick: onCreateProject,
          },
        ]
      : []),
    ...(onSendInvoice
      ? [
          {
            icon: <Receipt className="h-4 w-4" />,
            label: "Send Invoice",
            onClick: onSendInvoice,
          },
        ]
      : []),
    {
      icon: <User className="h-4 w-4" />,
      label: "View Profile",
      onClick: onViewProfile,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
        {/* Success Animation */}
        <div className="relative mb-6">
          {/* Outer ring with pulse animation */}
          <div
            className={cn(
              "absolute inset-0 rounded-full",
              "bg-primary/20 animate-ping",
              "opacity-75"
            )}
            style={{ animationDuration: "1.5s", animationIterationCount: "1" }}
          />
          {/* Inner circle */}
          <div
            className={cn(
              "relative flex items-center justify-center",
              "h-16 w-16 rounded-full",
              "bg-primary text-primary-foreground",
              "animate-in zoom-in-50 duration-300"
            )}
          >
            <Check className="h-8 w-8" strokeWidth={2.5} />
          </div>
        </div>

        {/* Success Message */}
        <div className="space-y-2 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-150">
          <h3 className="text-lg font-semibold text-foreground">
            {client.name} added
          </h3>
          <p className="text-sm text-muted-foreground">{client.email}</p>
        </div>

        {/* Intelligence Notice */}
        <div
          className={cn(
            "w-full max-w-sm p-4 rounded-[12px] mb-8",
            "bg-primary/5 border border-primary/10",
            "animate-in fade-in slide-in-from-bottom-3 duration-300 delay-200"
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex items-center justify-center",
                "h-8 w-8 rounded-full shrink-0",
                "bg-primary/10"
              )}
            >
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">
                Intelligence is now active
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                We&apos;ll build insights as you interact with this{" "}
                {client.lifecycleStage === "lead" ? "prospect" : "client"}
              </p>
            </div>
          </div>
        </div>

        {/* What's Next Section */}
        <div
          className={cn(
            "w-full max-w-sm",
            "animate-in fade-in slide-in-from-bottom-4 duration-300 delay-300"
          )}
        >
          <p className="text-sm font-medium text-muted-foreground mb-4">
            What&apos;s next?
          </p>

          <div className="grid grid-cols-2 gap-3">
            {actionButtons.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn(
                  "group flex flex-col items-center justify-center gap-2",
                  "p-4 rounded-[12px]",
                  "bg-card border border-border",
                  "hover:border-primary/50 hover:bg-accent/50",
                  "transition-all duration-160",
                  "active:scale-[0.97]",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center",
                    "h-10 w-10 rounded-full",
                    "bg-muted text-muted-foreground",
                    "group-hover:bg-primary/10 group-hover:text-primary",
                    "transition-colors duration-160"
                  )}
                >
                  {action.icon}
                </div>
                <span className="text-sm font-medium text-foreground">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className={cn(
          "shrink-0 flex items-center justify-between gap-3",
          "px-6 py-4 border-t border-border bg-muted/30",
          "animate-in fade-in slide-in-from-bottom-1 duration-300 delay-400"
        )}
      >
        <Button
          variant="ghost"
          onClick={onAddAnother}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add another
        </Button>
        <Button variant="outline" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}
