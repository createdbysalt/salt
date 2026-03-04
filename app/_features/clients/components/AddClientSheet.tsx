"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
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

// Step components (to be created)
import { AddClientIntentStep } from "./AddClientIntentStep";
import { AddClientFormStep } from "./AddClientFormStep";
import { AddClientSuccessStep } from "./AddClientSuccessStep";

// ============================================================================
// Types
// ============================================================================

export type ClientIntent = "prospect" | "client" | "quick";
export type ClientType = "individual" | "organization";
export type AddClientStep = "intent" | "form" | "success";

export interface ClientCreateData {
  intent: ClientIntent;
  clientType: ClientType;
  // Individual fields
  firstName?: string;
  lastName?: string;
  // Organization fields
  companyName?: string;
  contactName?: string;
  // Common fields
  email: string;
  phone?: string;
  companyId?: string | null;
  newCompanyName?: string | null;
  notes?: string;
  // Options
  inviteToBridge?: boolean;
}

export interface CreatedClient {
  id: string;
  name: string;
  email: string;
  lifecycleStage: "lead" | "client";
}

interface Company {
  id: string;
  name: string;
}

interface AddClientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Company[];
  onSubmit: (data: ClientCreateData) => Promise<{
    success: boolean;
    clientId?: string;
    error?: string;
  }>;
  onInviteToBridge?: (clientId: string) => void;
  onCreateProject?: (clientId: string) => void;
  onSendInvoice?: (clientId: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function AddClientSheet({
  open,
  onOpenChange,
  companies,
  onSubmit,
  onInviteToBridge,
  onCreateProject,
  onSendInvoice,
}: AddClientSheetProps) {
  const router = useRouter();

  // Step state machine
  const [step, setStep] = useState<AddClientStep>("intent");
  const [intent, setIntent] = useState<ClientIntent | null>(null);
  const [clientType, setClientType] = useState<ClientType>("individual");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdClient, setCreatedClient] = useState<CreatedClient | null>(null);

  // Reset state when sheet closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // Delay reset to allow close animation
        setTimeout(() => {
          setStep("intent");
          setIntent(null);
          setClientType("individual");
          setCreatedClient(null);
          setIsSubmitting(false);
        }, 300);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  // Handle intent selection
  const handleIntentSelect = useCallback((selectedIntent: ClientIntent) => {
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
    async (formData: Omit<ClientCreateData, "intent" | "clientType">) => {
      if (!intent) return;

      setIsSubmitting(true);

      try {
        const result = await onSubmit({
          ...formData,
          intent,
          clientType,
        });

        if (result.success && result.clientId) {
          // Determine the lifecycle stage based on intent
          const lifecycleStage = intent === "client" ? "client" : "lead";

          // Build the client name
          let clientName = "";
          if (clientType === "individual") {
            clientName = `${formData.firstName || ""} ${formData.lastName || ""}`.trim();
          } else {
            clientName = formData.companyName || "";
          }

          setCreatedClient({
            id: result.clientId,
            name: clientName,
            email: formData.email,
            lifecycleStage,
          });

          // Handle auto-invite if selected
          if (formData.inviteToBridge && onInviteToBridge) {
            onInviteToBridge(result.clientId);
          }

          setStep("success");
        } else {
          // Show error toast
          toast.error(result.error || "Failed to create client");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [intent, clientType, onSubmit, onInviteToBridge]
  );

  // Handle success actions
  const handleInviteToBridge = useCallback(() => {
    if (createdClient && onInviteToBridge) {
      onInviteToBridge(createdClient.id);
    }
  }, [createdClient, onInviteToBridge]);

  const handleCreateProject = useCallback(() => {
    if (createdClient && onCreateProject) {
      onCreateProject(createdClient.id);
      handleOpenChange(false);
    }
  }, [createdClient, onCreateProject, handleOpenChange]);

  const handleSendInvoice = useCallback(() => {
    if (createdClient && onSendInvoice) {
      onSendInvoice(createdClient.id);
      handleOpenChange(false);
    }
  }, [createdClient, onSendInvoice, handleOpenChange]);

  const handleViewProfile = useCallback(() => {
    if (createdClient) {
      handleOpenChange(false);
      router.push(`/studio/clients/${createdClient.id}`);
    }
  }, [createdClient, router, handleOpenChange]);

  const handleAddAnother = useCallback(() => {
    setStep("intent");
    setIntent(null);
    setClientType("individual");
    setCreatedClient(null);
  }, []);

  const handleDone = useCallback(() => {
    handleOpenChange(false);
    router.refresh();
  }, [handleOpenChange, router]);

  // Get step title
  const getStepTitle = () => {
    switch (step) {
      case "intent":
        return "Add Client";
      case "form":
        return intent === "prospect" ? "Add Prospect" : intent === "client" ? "Add Client" : "Add Client";
      case "success":
        return ""; // No title in success state
      default:
        return "Add Client";
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
                  Create a new client in your roster
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        )}

        {/* Content area with step transitions */}
        <div className="flex-1 overflow-y-auto">
          <div
            className={cn(
              "transition-opacity duration-200 ease-out",
              isSubmitting && "opacity-50 pointer-events-none"
            )}
          >
            {step === "intent" && (
              <AddClientIntentStep onSelect={handleIntentSelect} />
            )}

            {step === "form" && intent && (
              <AddClientFormStep
                intent={intent}
                clientType={clientType}
                onClientTypeChange={setClientType}
                companies={companies}
                onSubmit={handleFormSubmit}
                onCancel={() => handleOpenChange(false)}
                isSubmitting={isSubmitting}
              />
            )}

            {step === "success" && createdClient && (
              <AddClientSuccessStep
                client={createdClient}
                onInviteToBridge={onInviteToBridge ? handleInviteToBridge : undefined}
                onCreateProject={onCreateProject ? handleCreateProject : undefined}
                onSendInvoice={onSendInvoice ? handleSendInvoice : undefined}
                onViewProfile={handleViewProfile}
                onAddAnother={handleAddAnother}
                onDone={handleDone}
              />
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
