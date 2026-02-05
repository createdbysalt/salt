"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Textarea } from "@/app/_components/ui/textarea";
import { Checkbox } from "@/app/_components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { createMilestone } from "@/app/actions/projects/create-milestone";
import { updateMilestone } from "@/app/actions/projects/update-milestone";
import { type MilestoneData } from "./MilestoneItem";
import toast from "react-hot-toast";

const milestoneSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  due_at: z.string().optional(),
  description: z.string().max(2000).optional(),
  depends_on_milestone_id: z.string().optional(),
  client_visible: z.boolean(),
});

type MilestoneFormData = z.infer<typeof milestoneSchema>;

interface MilestoneCreateDialogProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  projectId: string;
  milestone?: MilestoneData | null;
  existingMilestones?: MilestoneData[];
  onSuccess: () => void;
}

export function MilestoneCreateDialog({
  open,
  onOpenChange,
  projectId,
  milestone,
  existingMilestones = [],
  onSuccess,
}: MilestoneCreateDialogProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!milestone;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MilestoneFormData>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: {
      title: "",
      due_at: "",
      description: "",
      depends_on_milestone_id: "",
      client_visible: true,
    },
  });

  // Reset form when dialog opens/closes or milestone changes
  useEffect(() => {
    if (open) {
      if (milestone) {
        reset({
          title: milestone.title,
          due_at: milestone.due_at ? milestone.due_at.split("T")[0] : "",
          description: milestone.description || "",
          client_visible: milestone.client_visible,
        });
        // If editing and has advanced fields, show advanced section
        if (milestone.description) {
          setShowAdvanced(true);
        }
      } else {
        reset({
          title: "",
          due_at: "",
          description: "",
          depends_on_milestone_id: "",
          client_visible: true,
        });
        setShowAdvanced(false);
      }
    }
  }, [open, milestone, reset]);

  const onSubmit = async (data: MilestoneFormData) => {
    setIsSubmitting(true);

    try {
      if (isEditing && milestone) {
        // Update existing milestone
        const result = await updateMilestone({
          id: milestone.id,
          title: data.title,
          description: data.description || null,
          due_at: data.due_at ? new Date(data.due_at).toISOString() : null,
          client_visible: data.client_visible,
        });

        if (result.error) {
          toast.error(result.error);
          return;
        }

        toast.success("Milestone updated");
      } else {
        // Create new milestone
        const result = await createMilestone({
          project_id: projectId,
          title: data.title,
          description: data.description,
          due_at: data.due_at ? new Date(data.due_at).toISOString() : undefined,
          depends_on_milestone_id: data.depends_on_milestone_id || undefined,
          client_visible: data.client_visible,
        });

        if (result.error) {
          toast.error(result.error);
          return;
        }

        toast.success("Milestone created");
      }

      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  const clientVisible = watch("client_visible");

  // Filter out current milestone from dependency options
  const dependencyOptions = existingMilestones.filter((m) => m.id !== milestone?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Milestone" : "New Milestone"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., Discovery & Strategy"
              {...register("title")}
              autoFocus
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due_at">Due Date (optional)</Label>
            <Input id="due_at" type="date" {...register("due_at")} />
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {showAdvanced ? "Hide" : "Show"} advanced options
          </button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-4 pl-4 border-l-2 border-muted">
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What needs to be accomplished in this milestone?"
                  rows={3}
                  {...register("description")}
                />
              </div>

              {/* Depends On */}
              {dependencyOptions.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="depends_on">Depends on</Label>
                  <Select
                    value={watch("depends_on_milestone_id") || ""}
                    onValueChange={(value) =>
                      setValue("depends_on_milestone_id", value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No dependency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No dependency</SelectItem>
                      {dependencyOptions.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Client Visibility */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="client_visible"
                  checked={clientVisible}
                  onCheckedChange={(checked) => setValue("client_visible", !!checked)}
                />
                <Label htmlFor="client_visible" className="text-sm font-normal cursor-pointer">
                  Show to client in The Bridge portal
                </Label>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Milestone"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
