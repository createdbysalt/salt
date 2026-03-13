"use client";

import { useState, useCallback } from "react";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Textarea } from "@/app/_components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { Loader2 } from "lucide-react";
import { cn } from "@repo/utils";
import type { ProjectIntent, ProjectCreateData } from "./AddProjectSheet";

interface Client {
  id: string;
  name: string;
}

interface AddProjectFormStepProps {
  intent: ProjectIntent;
  clients: Client[];
  preselectedClientId?: string;
  onSubmit: (data: Omit<ProjectCreateData, "intent">) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

interface FormState {
  name: string;
  clientId: string;
  description: string;
  status: "draft" | "not_started" | "in_progress";
  // One-time fields
  startDate: string;
  deadline: string;
  totalValue: string;
  // Retainer fields
  monthlyAmount: string;
  includedHours: string;
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

export function AddProjectFormStep({
  intent,
  clients,
  preselectedClientId,
  onSubmit,
  onCancel,
  isSubmitting,
}: AddProjectFormStepProps) {
  const [formState, setFormState] = useState<FormState>({
    name: "",
    clientId: preselectedClientId || "",
    description: "",
    status: "not_started",
    startDate: "",
    deadline: "",
    totalValue: "",
    monthlyAmount: "",
    includedHours: "",
  });

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

    if (!formState.name.trim()) {
      newErrors.name = "Project name is required";
    }

    if (!formState.clientId) {
      newErrors.clientId = "Client is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formState]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      await onSubmit({
        name: formState.name,
        clientId: formState.clientId,
        description: formState.description || undefined,
        status: formState.status,
        // One-time fields
        startDate: formState.startDate || undefined,
        deadline: formState.deadline || undefined,
        totalValue: formState.totalValue ? parseFloat(formState.totalValue) : undefined,
        // Retainer fields
        monthlyAmount: formState.monthlyAmount ? parseFloat(formState.monthlyAmount) : undefined,
        includedHours: formState.includedHours ? parseFloat(formState.includedHours) : undefined,
      });
    },
    [formState, validate, onSubmit]
  );

  const getSubmitText = () => {
    if (isSubmitting) return "Adding...";
    if (intent === "retainer") return "Add Retainer";
    return "Add Project";
  };

  const isRetainer = intent === "retainer";
  const isOneTime = intent === "one-time";

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto">
        {/* Details Section */}
        <div className="p-6 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Details</h3>

          <div className="rounded-lg border bg-card divide-y">
            {/* Project Name */}
            <SettingsRow label="Name" error={errors.name}>
              <Input
                placeholder="Website Redesign"
                value={formState.name}
                onChange={(e) => updateField("name", e.target.value)}
                className={cn(
                  "w-56 text-right",
                  errors.name && "border-destructive"
                )}
                autoFocus
              />
            </SettingsRow>

            {/* Client */}
            <SettingsRow label="Client" error={errors.clientId}>
              <Select
                value={formState.clientId}
                onValueChange={(value) => updateField("clientId", value)}
              >
                <SelectTrigger className={cn(
                  "w-48",
                  errors.clientId && "border-destructive"
                )}>
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsRow>

            {/* Status */}
            <SettingsRow label="Status">
              <Select
                value={formState.status}
                onValueChange={(value) => updateField("status", value as FormState["status"])}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </SettingsRow>

            {/* Description */}
            <SettingsRow label="Description" description="Optional" fullWidth>
              <Textarea
                placeholder="Brief overview of the project..."
                value={formState.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={3}
                className="resize-none"
              />
            </SettingsRow>
          </div>
        </div>

        {/* Timeline Section - One-time projects */}
        {isOneTime && (
          <div className="px-6 pb-6 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Timeline</h3>

            <div className="rounded-lg border bg-card divide-y">
              <SettingsRow label="Start date" description="Optional">
                <Input
                  type="date"
                  value={formState.startDate}
                  onChange={(e) => updateField("startDate", e.target.value)}
                  className="w-40"
                />
              </SettingsRow>

              <SettingsRow label="Deadline" description="Optional">
                <Input
                  type="date"
                  value={formState.deadline}
                  onChange={(e) => updateField("deadline", e.target.value)}
                  className="w-40"
                />
              </SettingsRow>

              <SettingsRow label="Total value" description="Optional">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formState.totalValue}
                    onChange={(e) => updateField("totalValue", e.target.value)}
                    className="w-28 text-right"
                    min="0"
                    step="0.01"
                  />
                </div>
              </SettingsRow>
            </div>
          </div>
        )}

        {/* Retainer Section */}
        {isRetainer && (
          <div className="px-6 pb-6 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Retainer</h3>

            <div className="rounded-lg border bg-card divide-y">
              <SettingsRow label="Start date" description="Optional">
                <Input
                  type="date"
                  value={formState.startDate}
                  onChange={(e) => updateField("startDate", e.target.value)}
                  className="w-40"
                />
              </SettingsRow>

              <SettingsRow label="Monthly amount" description="Optional">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formState.monthlyAmount}
                    onChange={(e) => updateField("monthlyAmount", e.target.value)}
                    className="w-28 text-right"
                    min="0"
                    step="0.01"
                  />
                </div>
              </SettingsRow>

              <SettingsRow label="Included hours" description="Optional">
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    placeholder="0"
                    value={formState.includedHours}
                    onChange={(e) => updateField("includedHours", e.target.value)}
                    className="w-20 text-right"
                    min="0"
                    step="0.5"
                  />
                  <span className="text-muted-foreground text-sm">hrs</span>
                </div>
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
