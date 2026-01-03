"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createTask, updateTask } from "../actions";
import { toast } from "sonner";
import type { TaskWithRelations } from "@/src/features/tasks/types";

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  client_id: z.string().optional(),
  project_id: z.string().optional(),
  assigned_to: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["open", "in_progress", "completed", "blocked", "cancelled"]),
  due_date: z.string().optional(), // yyyy-mm-dd
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; client_id?: string }>;
  assignees: Array<{
    id: string;
    display_name: string;
    email: string;
    avatar_url: string | null;
  }>;
  tags: Array<{ id: string; label: string; color: string }>;
  task?: TaskWithRelations;
}

export function TaskDialog({
  open,
  onOpenChange,
  clients,
  projects,
  assignees,
  tags,
  task,
}: TaskDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(
    task?.client_id || undefined
  );
  const [values, setValues] = useState<TaskFormValues>({
    title: "",
    description: "",
    client_id: "",
    project_id: "",
    assigned_to: "",
    priority: "medium",
    status: "open",
    due_date: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof TaskFormValues, string>>>({});

  useEffect(() => {
    if (open) {
      const nextValues: TaskFormValues = {
        title: task?.title || "",
        description: task?.description || "",
        client_id: task?.client_id || "",
        project_id: task?.project_id || "",
        assigned_to: task?.assigned_to || "",
        priority: task?.priority || "medium",
        status: task?.status || "open",
        due_date: task?.due_date || "",
      };
      setValues(nextValues);
      setErrors({});
      setSelectedClientId(nextValues.client_id || undefined);
    }
  }, [open, task]);

  // Filter projects by selected client
  const filteredProjects = selectedClientId
    ? projects.filter((p) => p.client_id === selectedClientId)
    : projects;

  const onSubmit = async () => {
    setIsSubmitting(true);

    const parsed = taskFormSchema.safeParse(values);
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof TaskFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof TaskFormValues | undefined;
        if (key && !nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      toast.error("Please fix the highlighted fields.");
      setIsSubmitting(false);
      return;
    }

    setErrors({});
    const input = {
      title: parsed.data.title,
      description: parsed.data.description || undefined,
      client_id: parsed.data.client_id || undefined,
      project_id: parsed.data.project_id || undefined,
      assigned_to: parsed.data.assigned_to || undefined,
      priority: parsed.data.priority,
      status: parsed.data.status,
      due_date: parsed.data.due_date || undefined,
    };

    let result;
    if (task) {
      result = await updateTask(task.id, input);
    } else {
      result = await createTask(input);
    }

    if (result.success) {
      toast.success(task ? "Task updated successfully" : "Task created successfully");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to save task");
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create Task"}</DialogTitle>
          <DialogDescription>
            {task
              ? "Update the task details below"
              : "Fill in the details to create a new task"}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit();
          }}
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              placeholder="Enter task title"
              value={values.title}
              onChange={(e) => setValues((p) => ({ ...p, title: e.target.value }))}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Enter task description"
              rows={4}
              value={values.description || ""}
              onChange={(e) => setValues((p) => ({ ...p, description: e.target.value }))}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Client</label>
              <Select
                value={values.client_id || "none"}
                onValueChange={(value) => {
                  const nextClientId = value === "none" ? "" : value;
                  setValues((p) => ({ ...p, client_id: nextClientId, project_id: "" }));
                  setSelectedClientId(nextClientId || undefined);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client_id && (
                <p className="text-sm text-destructive">{errors.client_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Project</label>
              <Select
                value={values.project_id || "none"}
                onValueChange={(value) =>
                  setValues((p) => ({ ...p, project_id: value === "none" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {filteredProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.project_id && (
                <p className="text-sm text-destructive">{errors.project_id}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Assigned To</label>
            <Select
              value={values.assigned_to || "none"}
              onValueChange={(value) =>
                setValues((p) => ({ ...p, assigned_to: value === "none" ? "" : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {assignees.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assigned_to && (
              <p className="text-sm text-destructive">{errors.assigned_to}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={values.status}
                onValueChange={(value) =>
                  setValues((p) => ({ ...p, status: value as TaskFormValues["status"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && <p className="text-sm text-destructive">{errors.status}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select
                value={values.priority}
                onValueChange={(value) =>
                  setValues((p) => ({ ...p, priority: value as TaskFormValues["priority"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              {errors.priority && (
                <p className="text-sm text-destructive">{errors.priority}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="date"
                value={values.due_date || ""}
                onChange={(e) => setValues((p) => ({ ...p, due_date: e.target.value }))}
              />
              {errors.due_date && (
                <p className="text-sm text-destructive">{errors.due_date}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : task ? "Update Task" : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

