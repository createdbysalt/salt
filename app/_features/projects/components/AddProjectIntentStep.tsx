"use client";

import { cn } from "@repo/utils";
import type { ProjectIntent } from "./AddProjectSheet";

interface AddProjectIntentStepProps {
  onSelect: (intent: ProjectIntent) => void;
}

const intentOptions = [
  {
    intent: "one-time" as const,
    title: "One-time Project",
    description: "Fixed scope with milestones and deadline",
  },
  {
    intent: "retainer" as const,
    title: "Retainer",
    description: "Ongoing work with monthly hours",
  },
];

export function AddProjectIntentStep({ onSelect }: AddProjectIntentStepProps) {
  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Project Type
        </h3>

        {/* Options Card */}
        <div className="rounded-lg border bg-card divide-y">
          {intentOptions.map((option) => (
            <button
              key={option.intent}
              onClick={() => onSelect(option.intent)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-4",
                "text-left transition-colors",
                "hover:bg-accent/50",
                "focus-visible:outline-none focus-visible:bg-accent"
              )}
            >
              <div className="space-y-0.5">
                <div className="text-sm font-medium">{option.title}</div>
                <div className="text-sm text-muted-foreground">
                  {option.description}
                </div>
              </div>
              <div className="size-4 rounded-full border-2 border-muted-foreground/30" />
            </button>
          ))}
        </div>
      </div>

      {/* Skip Option */}
      <div className="text-center">
        <button
          onClick={() => onSelect("quick")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Just add the basics (skip)
        </button>
      </div>
    </div>
  );
}
