"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Plus, Milestone as MilestoneIcon } from "lucide-react";
import { MilestoneItem, type MilestoneData } from "./MilestoneItem";
import { MilestoneEmptyState } from "./MilestoneEmptyState";
import { MilestoneCreateDialog } from "./MilestoneCreateDialog";
import { updateMilestone } from "@/app/actions/projects/update-milestone";
import { deleteMilestone } from "@/app/actions/projects/delete-milestone";
import { reorderMilestones } from "@/app/actions/projects/reorder-milestones";
import { toast } from "sonner";

interface MilestoneListProps {
  projectId: string;
  milestones: MilestoneData[];
  onMilestonesChange?: () => void;
}

export function MilestoneList({
  projectId,
  milestones: initialMilestones,
  onMilestonesChange,
}: MilestoneListProps) {
  const [milestones, setMilestones] = useState(initialMilestones);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = milestones.findIndex((m) => m.id === active.id);
      const newIndex = milestones.findIndex((m) => m.id === over.id);

      // Optimistic update
      const newMilestones = arrayMove(milestones, oldIndex, newIndex);
      setMilestones(newMilestones);

      // Persist reorder
      const result = await reorderMilestones({
        project_id: projectId,
        milestone_ids: newMilestones.map((m) => m.id),
      });

      if (result.error) {
        // Revert on error
        setMilestones(milestones);
        toast.error(result.error);
      } else {
        onMilestonesChange?.();
      }
    }
  };

  const handleStatusChange = async (id: string, status: "not_started" | "in_progress" | "complete") => {
    // Optimistic update
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status } : m))
    );

    const result = await updateMilestone({ id, status });

    if (result.error) {
      // Revert on error
      setMilestones(initialMilestones);
      toast.error(result.error);
    } else {
      if (status === "complete") {
        toast.success("Milestone completed!");
      }
      onMilestonesChange?.();
    }
  };

  const handleVisibilityToggle = async (id: string, visible: boolean) => {
    // Optimistic update
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, client_visible: visible } : m))
    );

    const result = await updateMilestone({ id, client_visible: visible });

    if (result.error) {
      setMilestones(initialMilestones);
      toast.error(result.error);
    } else {
      toast.success(visible ? "Milestone now visible to client" : "Milestone hidden from client");
      onMilestonesChange?.();
    }
  };

  const handleEdit = (milestone: MilestoneData) => {
    setEditingMilestone(milestone);
    setIsCreateDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    // Confirm delete
    if (!confirm("Are you sure you want to delete this milestone? Tasks linked to it will be unlinked.")) {
      return;
    }

    // Optimistic update
    setMilestones((prev) => prev.filter((m) => m.id !== id));

    const result = await deleteMilestone(id);

    if (result.error) {
      setMilestones(initialMilestones);
      toast.error(result.error);
    } else {
      toast.success("Milestone deleted");
      onMilestonesChange?.();
    }
  };

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    setEditingMilestone(null);
    onMilestonesChange?.();
  };

  // Show empty state if no milestones
  if (milestones.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <MilestoneIcon className="h-5 w-5" />
            Milestones
          </CardTitle>
          <Button size="sm" className="h-8 gap-2" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </CardHeader>
        <CardContent>
          <MilestoneEmptyState
            projectId={projectId}
            onTemplateApplied={onMilestonesChange}
            onCreateClick={() => setIsCreateDialogOpen(true)}
          />
        </CardContent>

        <MilestoneCreateDialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) setEditingMilestone(null);
          }}
          projectId={projectId}
          milestone={editingMilestone}
          existingMilestones={milestones}
          onSuccess={handleCreateSuccess}
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <MilestoneIcon className="h-5 w-5" />
          Milestones
        </CardTitle>
        <Button size="sm" className="h-8 gap-2" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={milestones.map((m) => m.id)}
            strategy={verticalListSortingStrategy}
          >
            {milestones.map((milestone) => (
              <MilestoneItem
                key={milestone.id}
                milestone={milestone}
                onStatusChange={handleStatusChange}
                onVisibilityToggle={handleVisibilityToggle}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Summary */}
        <div className="pt-2 border-t text-sm text-muted-foreground flex items-center justify-between">
          <span>
            {milestones.filter((m) => m.status === "complete").length} of {milestones.length} complete
          </span>
          <span>
            {milestones.filter((m) => m.client_visible).length} visible to client
          </span>
        </div>
      </CardContent>

      <MilestoneCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) setEditingMilestone(null);
        }}
        projectId={projectId}
        milestone={editingMilestone}
        existingMilestones={milestones}
        onSuccess={handleCreateSuccess}
      />
    </Card>
  );
}
