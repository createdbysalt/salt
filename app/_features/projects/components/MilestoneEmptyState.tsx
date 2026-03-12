"use client";

import { useState } from "react";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/_components/ui/dialog";
import { Loader2, Plus, Rocket } from "lucide-react";
import { MilestoneTemplateButtons } from "./MilestoneTemplateSelector";
import { applyMilestoneTemplate } from "@/app/actions/projects/apply-milestone-template";
import { type MilestoneTemplateKey } from "@/app/_lib/milestone-templates";
import { toast } from "sonner";

interface MilestoneEmptyStateProps {
  projectId: string;
  onTemplateApplied?: () => void;
  onCreateClick: () => void;
}

export function MilestoneEmptyState({
  projectId,
  onTemplateApplied,
  onCreateClick,
}: MilestoneEmptyStateProps) {
  const [isApplying, setIsApplying] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MilestoneTemplateKey | null>(null);
  const [startDate, setStartDate] = useState(() => {
    // Default to today
    return new Date().toISOString().split("T")[0];
  });
  const [showDateDialog, setShowDateDialog] = useState(false);

  const handleTemplateSelect = (templateKey: MilestoneTemplateKey) => {
    setSelectedTemplate(templateKey);
    setShowDateDialog(true);
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;

    setIsApplying(true);

    try {
      const result = await applyMilestoneTemplate({
        project_id: projectId,
        template_key: selectedTemplate,
        start_date: new Date(startDate).toISOString(),
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(`${result.count} milestones created from template`);
      setShowDateDialog(false);
      onTemplateApplied?.();
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <>
      <div className="py-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
          <Rocket className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium mb-2">No milestones yet</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
          Get started quickly with a template or add milestones one at a time.
        </p>

        {/* Template Selection */}
        <div className="max-w-md mx-auto mb-6">
          <p className="text-sm font-medium mb-3 text-left">Quick start with a template:</p>
          <MilestoneTemplateButtons
            onSelect={handleTemplateSelect}
            disabled={isApplying}
          />
        </div>

        {/* Manual Add */}
        <div className="pt-4 border-t">
          <Button variant="outline" onClick={onCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            Add milestone manually
          </Button>
        </div>
      </div>

      {/* Start Date Dialog */}
      <Dialog open={showDateDialog} onOpenChange={setShowDateDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Set Project Start Date</DialogTitle>
            <DialogDescription>
              Milestone due dates will be calculated from this start date.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Project Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              You can adjust individual milestone dates after the template is applied.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDateDialog(false)}
              disabled={isApplying}
            >
              Cancel
            </Button>
            <Button onClick={handleApplyTemplate} disabled={isApplying}>
              {isApplying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Apply Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
