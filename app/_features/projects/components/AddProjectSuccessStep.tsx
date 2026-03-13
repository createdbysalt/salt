"use client";

import { Button } from "@/app/_components/ui/button";
import { Check, ChevronRight, Plus } from "lucide-react";
import { cn } from "@repo/utils";
import type { CreatedProject } from "./AddProjectSheet";

interface AddProjectSuccessStepProps {
  project: CreatedProject;
  onAddMilestones?: () => void;
  onInviteToProject?: () => void;
  onViewProject: () => void;
  onAddAnother: () => void;
  onDone: () => void;
}

interface ActionItem {
  label: string;
  onClick?: () => void;
}

export function AddProjectSuccessStep({
  project,
  onAddMilestones,
  onInviteToProject,
  onViewProject,
  onAddAnother,
  onDone,
}: AddProjectSuccessStepProps) {
  // Context-aware actions
  const actions: ActionItem[] = [
    ...(onAddMilestones && !project.isRetainer
      ? [
          {
            label: "Add milestones",
            onClick: onAddMilestones,
          },
        ]
      : []),
    ...(onInviteToProject
      ? [
          {
            label: "Share with client",
            onClick: onInviteToProject,
          },
        ]
      : []),
    {
      label: "View project",
      onClick: onViewProject,
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 p-6 overflow-y-auto">
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
            {project.name} created
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {project.clientName}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {project.isRetainer ? "Retainer" : "One-time project"}
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
                <span className="text-sm font-medium">{action.label}</span>
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
