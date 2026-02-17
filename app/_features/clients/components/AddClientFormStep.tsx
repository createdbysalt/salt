"use client";

import { useState, useCallback } from "react";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Checkbox } from "@/app/_components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { Brain, Users, Plus } from "lucide-react";
import { cn } from "@repo/utils";
import { ClientTypeToggle } from "./ClientTypeToggle";
import type { ClientIntent, ClientType, ClientCreateData } from "./AddClientSheet";

// ============================================================================
// Types
// ============================================================================

interface Company {
  id: string;
  name: string;
}

interface AddClientFormStepProps {
  intent: ClientIntent;
  clientType: ClientType;
  onClientTypeChange: (type: ClientType) => void;
  companies: Company[];
  onSubmit: (data: Omit<ClientCreateData, "intent" | "clientType">) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

interface FormState {
  firstName: string;
  lastName: string;
  companyName: string;
  contactName: string;
  email: string;
  companyId: string | null;
  newCompanyName: string;
  inviteToBridge: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function AddClientFormStep({
  intent,
  clientType,
  onClientTypeChange,
  companies,
  onSubmit,
  onCancel,
  isSubmitting,
}: AddClientFormStepProps) {
  // Form state
  const [formState, setFormState] = useState<FormState>({
    firstName: "",
    lastName: "",
    companyName: "",
    contactName: "",
    email: "",
    companyId: null,
    newCompanyName: "",
    inviteToBridge: intent === "client",
  });

  const [showNewCompany, setShowNewCompany] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // Update field
  const updateField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
      // Clear error when user types
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};

    // Email is always required
    if (!formState.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
      newErrors.email = "Please enter a valid email";
    }

    // Type-specific validation
    if (clientType === "individual") {
      if (!formState.firstName.trim() && !formState.lastName.trim()) {
        newErrors.firstName = "Name is required";
      }
    } else {
      if (!formState.companyName.trim()) {
        newErrors.companyName = "Company name is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formState, clientType]);

  // Handle submit
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) return;

      await onSubmit({
        firstName: formState.firstName || undefined,
        lastName: formState.lastName || undefined,
        companyName: formState.companyName || undefined,
        contactName: formState.contactName || undefined,
        email: formState.email,
        companyId: showNewCompany ? null : formState.companyId,
        newCompanyName: showNewCompany ? formState.newCompanyName : null,
        inviteToBridge: formState.inviteToBridge,
      });
    },
    [formState, showNewCompany, validate, onSubmit]
  );

  // Get submit button text
  const getSubmitText = () => {
    if (isSubmitting) return "Adding...";
    if (intent === "prospect") return "Add Prospect";
    if (intent === "client") return "Add Client";
    return "Add Client";
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Client Type Toggle */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Client type</Label>
          <ClientTypeToggle value={clientType} onChange={onClientTypeChange} />
        </div>

        {/* Name Fields - Individual */}
        {clientType === "individual" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                placeholder="Alex"
                value={formState.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                className={cn(errors.firstName && "border-destructive")}
                autoFocus
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                placeholder="Smith"
                value={formState.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Name Fields - Organization */}
        {clientType === "organization" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company name *</Label>
              <Input
                id="companyName"
                placeholder="Acme Corp"
                value={formState.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                className={cn(errors.companyName && "border-destructive")}
                autoFocus
              />
              {errors.companyName && (
                <p className="text-xs text-destructive">{errors.companyName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">Primary contact (optional)</Label>
              <Input
                id="contactName"
                placeholder="Alex Smith"
                value={formState.contactName}
                onChange={(e) => updateField("contactName", e.target.value)}
              />
            </div>
          </>
        )}

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            placeholder="alex@acme.com"
            value={formState.email}
            onChange={(e) => updateField("email", e.target.value)}
            className={cn(errors.email && "border-destructive")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>

        {/* Company Selector - Individual only */}
        {clientType === "individual" && (
          <div className="space-y-2">
            <Label>Company (optional)</Label>
            {!showNewCompany ? (
              <div className="flex gap-2">
                <Select
                  value={formState.companyId || ""}
                  onValueChange={(value) =>
                    updateField("companyId", value || null)
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowNewCompany(true)}
                  title="Add new company"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="New company name"
                  value={formState.newCompanyName}
                  onChange={(e) => updateField("newCompanyName", e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowNewCompany(false);
                    updateField("newCompanyName", "");
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Invite to Bridge - Active clients only */}
        {intent === "client" && (
          <div className="flex items-start gap-3 pt-2">
            <Checkbox
              id="inviteToBridge"
              checked={formState.inviteToBridge}
              onCheckedChange={(checked) =>
                updateField("inviteToBridge", checked === true)
              }
            />
            <div className="grid gap-1 leading-none">
              <label
                htmlFor="inviteToBridge"
                className="text-sm font-medium cursor-pointer"
              >
                Invite to Bridge after creating
              </label>
              <p className="text-xs text-muted-foreground">
                Send an email invite to the client portal
              </p>
            </div>
          </div>
        )}

        {/* Info Box */}
        <InfoBox intent={intent} />
      </div>

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {getSubmitText()}
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Info Box Component
// ============================================================================

function InfoBox({ intent }: { intent: ClientIntent }) {
  if (intent === "prospect") {
    return (
      <div className="flex items-start gap-3 p-4 rounded-[12px] bg-primary/5 border border-primary/10">
        <Brain className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Intelligence will start building insights
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            As you interact with this prospect, we&apos;ll surface patterns
            and suggest the best times to follow up.
          </p>
        </div>
      </div>
    );
  }

  if (intent === "client") {
    return (
      <div className="flex items-start gap-3 p-4 rounded-[12px] bg-primary/5 border border-primary/10">
        <Users className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Ready to collaborate through Bridge
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Invite them to the client portal to share files, approve work,
            and manage invoices.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
