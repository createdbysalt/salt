"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/app/_components/ui/sheet";
import { Button } from "@/app/_components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@repo/utils";

import { AddProjectIntentStep } from "./AddProjectIntentStep";
import { AddProjectFormStep } from "./AddProjectFormStep";
import { AddProjectSuccessStep } from "./AddProjectSuccessStep";

// ============================================================================
// Types
// ============================================================================

export type ProjectIntent = "one-time" | "retainer" | "quick";
export type AddProjectStep = "intent" | "form" | "success";

export interface ProjectCreateData {
  intent: ProjectIntent;
  name: string;
  clientId: string;
  description?: string;
  status: "draft" | "active" | "signed";
  // One-time fields
  startDate?: string;
  deadline?: string;
  totalValue?: number;
  // Retainer fields
  monthlyAmount?: number;
  includedHours?: number;
}

export interface CreatedProject {
  id: string;
  name: string;
  clientName: string;
  isRetainer: boolean;
}

interface Client {
  id: string;
  name: string;
}

interface AddProjectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  preselectedClientId?: string;
  onSubmit: (data: ProjectCreateData) => Promise<{
    success: boolean;
    projectId?: string;
    error?: string;
  }>;
  onAddMilestones?: (projectId: string) => void;
  onInviteToProject?: (projectId: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function AddProjectSheet({
  open,
  onOpenChange,
  clients,
  preselectedClientId,
  onSubmit,
  onAddMilestones,
  onInviteToProject,
}: AddProjectSheetProps) {
  const router = useRouter();

  // Step state machine
  const [step, setStep] = useState<AddProjectStep>("intent");
  const [intent, setIntent] = useState<ProjectIntent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdProject, setCreatedProject] = useState<CreatedProject | null>(null);

  // Reset state when sheet closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // Delay reset to allow close animation
        setTimeout(() => {
          setStep("intent");
          setIntent(null);
          setCreatedProject(null);
          setIsSubmitting(false);
        }, 300);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  // Handle intent selection
  const handleIntentSelect = useCallback((selectedIntent: ProjectIntent) => {
    setIntent(selectedIntent);
    setStep("form");
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (step === "form") {
      setStep("intent");
      setIntent(null);
    }
  }, [step]);

  // Handle form submission
  const handleFormSubmit = useCallback(
    async (formData: Omit<ProjectCreateData, "intent">) => {
      if (!intent) return;

      setIsSubmitting(true);

      try {
        const result = await onSubmit({
          ...formData,
          intent,
        });

        if (result.success && result.projectId) {
          // Find client name for success message
          const client = clients.find((c) => c.id === formData.clientId);

          setCreatedProject({
            id: result.projectId,
            name: formData.name,
            clientName: client?.name || "Unknown",
            isRetainer: intent === "retainer",
          });

          setStep("success");
        } else {
          toast.error(result.error || "Failed to create project");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [intent, clients, onSubmit]
  );

  // Handle success actions
  const handleAddMilestones = useCallback(() => {
    if (createdProject && onAddMilestones) {
      onAddMilestones(createdProject.id);
      handleOpenChange(false);
    }
  }, [createdProject, onAddMilestones, handleOpenChange]);

  const handleInviteToProject = useCallback(() => {
    if (createdProject && onInviteToProject) {
      onInviteToProject(createdProject.id);
      handleOpenChange(false);
    }
  }, [createdProject, onInviteToProject, handleOpenChange]);

  const handleViewProject = useCallback(() => {
    if (createdProject) {
      handleOpenChange(false);
      router.push(`/studio/projects/${createdProject.id}`);
    }
  }, [createdProject, router, handleOpenChange]);

  const handleAddAnother = useCallback(() => {
    setStep("intent");
    setIntent(null);
    setCreatedProject(null);
  }, []);

  const handleDone = useCallback(() => {
    handleOpenChange(false);
    router.refresh();
  }, [handleOpenChange, router]);

  // Get step title
  const getStepTitle = () => {
    switch (step) {
      case "intent":
        return "Add Project";
      case "form":
        return intent === "retainer" ? "Add Retainer" : intent === "one-time" ? "Add Project" : "Add Project";
      case "success":
        return ""; // No title in success state
      default:
        return "Add Project";
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "w-full sm:max-w-[540px] p-0 gap-0",
          "flex flex-col overflow-hidden"
        )}
      >
        {/* Header - Hidden in success state */}
        {step !== "success" && (
          <SheetHeader className="px-6 py-5 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              {/* Back button - Only show in form step */}
              {step === "form" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 -ml-2"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Back</span>
                </Button>
              )}
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-lg font-semibold">
                  {getStepTitle()}
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Create a new project
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        )}

        {/* Content area - each step handles its own scrolling */}
        <div
          className={cn(
            "flex-1 flex flex-col min-h-0",
            "transition-opacity duration-200 ease-out",
            isSubmitting && "opacity-50 pointer-events-none"
          )}
        >
          {step === "intent" && (
            <AddProjectIntentStep onSelect={handleIntentSelect} />
          )}

          {step === "form" && intent && (
            <AddProjectFormStep
              intent={intent}
              clients={clients}
              preselectedClientId={preselectedClientId}
              onSubmit={handleFormSubmit}
              onCancel={() => handleOpenChange(false)}
              isSubmitting={isSubmitting}
            />
          )}

          {step === "success" && createdProject && (
            <AddProjectSuccessStep
              project={createdProject}
              onAddMilestones={onAddMilestones ? handleAddMilestones : undefined}
              onInviteToProject={onInviteToProject ? handleInviteToProject : undefined}
              onViewProject={handleViewProject}
              onAddAnother={handleAddAnother}
              onDone={handleDone}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
