"use client";

import { useState, useCallback } from "react";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Textarea } from "@/app/_components/ui/textarea";
import { Switch } from "@/app/_components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@repo/utils";
import type { ClientIntent, ClientType, ClientCreateData } from "./AddClientSheet";

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
  phone: string;
  address: string;
  companyId: string | null;
  newCompanyName: string;
  notes: string;
  inviteToBridge: boolean;
}

// Settings-style row component
function SettingsRow({
  label,
  description,
  children,
  error,
  fullWidth = false,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  error?: string;
  fullWidth?: boolean;
}) {
  if (fullWidth) {
    return (
      <div className="px-4 py-4 space-y-2">
        <div className="space-y-0.5">
          <div className="text-sm font-medium">{label}</div>
          {description && (
            <div className="text-sm text-muted-foreground">{description}</div>
          )}
        </div>
        {children}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <div className="text-sm text-muted-foreground">{description}</div>
        )}
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

export function AddClientFormStep({
  intent,
  clientType,
  onClientTypeChange,
  companies,
  onSubmit,
  onCancel,
  isSubmitting,
}: AddClientFormStepProps) {
  const [formState, setFormState] = useState<FormState>({
    firstName: "",
    lastName: "",
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    companyId: null,
    newCompanyName: "",
    notes: "",
    inviteToBridge: intent === "client",
  });

  const [showNewCompany, setShowNewCompany] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const updateField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};

    if (!formState.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
      newErrors.email = "Please enter a valid email";
    }

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
        phone: formState.phone || undefined,
        address: formState.address || undefined,
        companyId: showNewCompany ? null : formState.companyId,
        newCompanyName: showNewCompany ? formState.newCompanyName : null,
        notes: formState.notes || undefined,
        inviteToBridge: formState.inviteToBridge,
      });
    },
    [formState, showNewCompany, validate, onSubmit]
  );

  const getSubmitText = () => {
    if (isSubmitting) return "Adding...";
    if (intent === "prospect") return "Add Prospect";
    return "Add Client";
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto">
        {/* Details Section */}
        <div className="p-6 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Details</h3>

          <div className="rounded-lg border bg-card divide-y">
            {/* Client Type */}
            <SettingsRow label="Type">
              <Select
                value={clientType}
                onValueChange={(value) => onClientTypeChange(value as ClientType)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                </SelectContent>
              </Select>
            </SettingsRow>

            {/* Individual Fields */}
            {clientType === "individual" && (
              <>
                <SettingsRow label="First name" error={errors.firstName}>
                  <Input
                    placeholder="Alex"
                    value={formState.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    className={cn(
                      "w-48 text-right",
                      errors.firstName && "border-destructive"
                    )}
                    autoFocus
                  />
                </SettingsRow>

                <SettingsRow label="Last name">
                  <Input
                    placeholder="Smith"
                    value={formState.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    className="w-48 text-right"
                  />
                </SettingsRow>
              </>
            )}

            {/* Organization Fields */}
            {clientType === "organization" && (
              <>
                <SettingsRow label="Company name" error={errors.companyName}>
                  <Input
                    placeholder="Acme Corp"
                    value={formState.companyName}
                    onChange={(e) => updateField("companyName", e.target.value)}
                    className={cn(
                      "w-48 text-right",
                      errors.companyName && "border-destructive"
                    )}
                    autoFocus
                  />
                </SettingsRow>

                <SettingsRow label="Primary contact" description="Optional">
                  <Input
                    placeholder="Alex Smith"
                    value={formState.contactName}
                    onChange={(e) => updateField("contactName", e.target.value)}
                    className="w-48 text-right"
                  />
                </SettingsRow>
              </>
            )}

            {/* Email */}
            <SettingsRow label="Email" error={errors.email}>
              <Input
                type="email"
                placeholder="alex@acme.com"
                value={formState.email}
                onChange={(e) => updateField("email", e.target.value)}
                className={cn(
                  "w-56 text-right",
                  errors.email && "border-destructive"
                )}
              />
            </SettingsRow>

            {/* Phone */}
            <SettingsRow label="Phone" description="Optional">
              <Input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={formState.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="w-48 text-right"
              />
            </SettingsRow>

            {/* Address */}
            <SettingsRow label="Address" description="Optional" fullWidth>
              <Input
                placeholder="123 Main St, City, State 12345"
                value={formState.address}
                onChange={(e) => updateField("address", e.target.value)}
              />
            </SettingsRow>

            {/* Company Selector - Individual only */}
            {clientType === "individual" && (
              <SettingsRow label="Company" description="Optional">
                {!showNewCompany ? (
                  <div className="flex items-center gap-2">
                    <Select
                      value={formState.companyId || ""}
                      onValueChange={(value) => updateField("companyId", value || null)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Select..." />
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
                      className="size-9 shrink-0"
                      onClick={() => setShowNewCompany(true)}
                      title="Add new company"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="New company"
                      value={formState.newCompanyName}
                      onChange={(e) => updateField("newCompanyName", e.target.value)}
                      className="w-40"
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
              </SettingsRow>
            )}

            {/* Notes - Full width */}
            <SettingsRow label="Notes" description="Optional" fullWidth>
              <Textarea
                placeholder="How did you meet? What do they need?"
                value={formState.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={3}
                className="resize-none"
              />
            </SettingsRow>
          </div>
        </div>

        {/* Options Section - Clients only */}
        {intent === "client" && (
          <div className="px-6 pb-6 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Options</h3>

            <div className="rounded-lg border bg-card divide-y">
              <SettingsRow
                label="Invite to Bridge"
                description="Send portal invite after creating"
              >
                <Switch
                  checked={formState.inviteToBridge}
                  onCheckedChange={(checked) => updateField("inviteToBridge", checked)}
                />
              </SettingsRow>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {getSubmitText()}
        </Button>
      </div>
    </form>
  );
}
