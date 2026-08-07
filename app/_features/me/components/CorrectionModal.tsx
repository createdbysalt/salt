"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, AlertCircle, Clock, UserX, Zap, HelpCircle } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
  Textarea,
  RadioGroup,
  RadioGroupItem,
} from "@repo/ui";
import { cn } from "@repo/utils";
import {
  recordStructuredCorrection,
  type CorrectionReason,
} from "../actions/corrections";
import type { LearningEntityType } from "@/app/_lib/learning";

interface CorrectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learningId: string;
  workspaceId: string;
  entityType: LearningEntityType;
  entityId: string;
  entityLabel: string;
  fieldPath: string;
  fieldLabel: string;
  wrongValue: unknown;
  onCorrected?: () => void;
}

const CORRECTION_REASONS: {
  value: CorrectionReason;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "wrong_value",
    label: "Wrong value",
    description: "The value Salt chose is incorrect",
    icon: AlertCircle,
  },
  {
    value: "wrong_timing",
    label: "Not anymore",
    description: "This was true before, but not now",
    icon: Clock,
  },
  {
    value: "never_true",
    label: "Never true",
    description: "This was never correct",
    icon: UserX,
  },
  {
    value: "too_aggressive",
    label: "Too confident",
    description: "Salt should have asked first",
    icon: Zap,
  },
  {
    value: "other",
    label: "Something else",
    description: "I'll explain in more detail",
    icon: HelpCircle,
  },
];

export function CorrectionModal({
  open,
  onOpenChange,
  learningId,
  workspaceId,
  entityType,
  entityId,
  entityLabel,
  fieldPath,
  fieldLabel,
  wrongValue,
  onCorrected,
}: CorrectionModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedReason, setSelectedReason] = useState<CorrectionReason | null>(null);
  const [additionalContext, setAdditionalContext] = useState("");
  const [correctValue, setCorrectValue] = useState("");

  const handleSubmit = () => {
    if (!selectedReason) return;

    startTransition(async () => {
      const result = await recordStructuredCorrection(
        learningId,
        workspaceId,
        entityType,
        entityId,
        fieldPath,
        wrongValue,
        correctValue.trim() || null,
        selectedReason,
        additionalContext.trim() || undefined,
      );

      if (result.success) {
        onCorrected?.();
        onOpenChange(false);
        // Reset state
        setSelectedReason(null);
        setAdditionalContext("");
        setCorrectValue("");
      }
    });
  };

  const handleAskSalt = () => {
    // Close modal and navigate to Ask Salt with context
    onOpenChange(false);
    const context = encodeURIComponent(
      `I need to correct something Salt learned about ${entityLabel}. ` +
      `Salt set "${fieldLabel}" to "${String(wrongValue)}", but that's wrong. ` +
      `Let me explain why...`,
    );
    router.push(`/hq?ask=${context}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tell Salt why this was wrong</DialogTitle>
          <DialogDescription>
            Help Salt learn from this mistake so it doesn't happen again.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm">
              Salt updated <span className="font-medium">{entityLabel}</span>'s{" "}
              <span className="font-medium">{fieldLabel}</span> to{" "}
              <span className="font-medium text-foreground">"{String(wrongValue)}"</span>
            </p>
          </div>

          <div className="space-y-3">
            <Label>What went wrong?</Label>
            <RadioGroup
              value={selectedReason ?? ""}
              onValueChange={(value) => setSelectedReason(value as CorrectionReason)}
            >
              {CORRECTION_REASONS.map((reason) => {
                const Icon = reason.icon;
                const isSelected = selectedReason === reason.value;
                return (
                  <label
                    key={reason.value}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/50",
                    )}
                  >
                    <RadioGroupItem value={reason.value} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{reason.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {reason.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          {selectedReason && selectedReason !== "never_true" && (
            <div className="space-y-2">
              <Label htmlFor="correctValue">What should it be instead? (optional)</Label>
              <input
                id="correctValue"
                type="text"
                value={correctValue}
                onChange={(e) => setCorrectValue(e.target.value)}
                placeholder="Enter the correct value..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          )}

          {selectedReason === "other" && (
            <div className="space-y-2">
              <Label htmlFor="context">Additional context (optional)</Label>
              <Textarea
                id="context"
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Help Salt understand what went wrong..."
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleAskSalt}
            className="w-full sm:w-auto"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Explain to Salt
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedReason || isPending}
            className="w-full sm:w-auto"
          >
            {isPending ? "Saving..." : "Save Correction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
