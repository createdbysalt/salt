"use client";

import { useState } from "react";
import { format } from "date-fns";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { TaskWithRelations, TaskStatus, TaskPriority } from "@/src/features/tasks/types";
import { deleteTask } from "../actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TaskDialog } from "./TaskDialog";

interface TaskListProps {
  tasks: TaskWithRelations[];
  clients: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string }>;
  assignees: Array<{
    id: string;
    display_name: string;
    email: string;
    avatar_url: string | null;
  }>;
}

const statusColors: Record<TaskStatus, string> = {
  open: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  blocked: "bg-red-500/10 text-red-500 border-red-500/20",
  cancelled: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const priorityColors: Record<TaskPriority, string> = {
  low: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  medium: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  urgent: "bg-red-500/10 text-red-500 border-red-500/20",
};

export function TaskList({ tasks, clients, projects, assignees }: TaskListProps) {
  const router = useRouter();
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deletingTaskId) return;

    setIsDeleting(true);
    const result = await deleteTask(deletingTaskId);

    if (result.success) {
      toast.success("Task deleted successfully");
      setDeletingTaskId(null);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to delete task");
    }
    setIsDeleting(false);
  };

  return (
    <>
      <div className="border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow
                key={task.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedTask(task)}
              >
                <TableCell className="font-medium">
                  <div>
                    <div>{task.title}</div>
                    {task.source === "client_request" && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        Client Request
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {task.client ? task.client.name : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  {task.project ? task.project.name : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  {task.assignee ? (
                    <div className="flex items-center gap-2">
                      {task.assignee.avatar_url && (
                        <img
                          src={task.assignee.avatar_url}
                          alt=""
                          className="h-6 w-6 rounded-full"
                        />
                      )}
                      <span>{task.assignee.display_name || task.assignee.email}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[task.status]}>
                    {task.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={priorityColors[task.priority]}>
                    {task.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  {task.due_date ? (
                    format(new Date(task.due_date), "MMM d, yyyy")
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingTask(task);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeletingTaskId(task.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Task Details Sheet */}
      <Sheet open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <SheetContent>
          {selectedTask && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedTask.title}</SheetTitle>
                <SheetDescription>
                  Created {format(new Date(selectedTask.created_at), "MMM d, yyyy")}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div>
                  <h4 className="text-sm font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedTask.description || "No description"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Status</h4>
                  <Badge variant="outline" className={statusColors[selectedTask.status]}>
                    {selectedTask.status.replace("_", " ")}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Priority</h4>
                  <Badge variant="outline" className={priorityColors[selectedTask.priority]}>
                    {selectedTask.priority}
                  </Badge>
                </div>
                {selectedTask.client && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Client</h4>
                    <p className="text-sm">{selectedTask.client.name}</p>
                  </div>
                )}
                {selectedTask.project && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Project</h4>
                    <p className="text-sm">{selectedTask.project.name}</p>
                  </div>
                )}
                {selectedTask.assignee && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Assigned To</h4>
                    <p className="text-sm">
                      {selectedTask.assignee.display_name || selectedTask.assignee.email}
                    </p>
                  </div>
                )}
                {selectedTask.due_date && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Due Date</h4>
                    <p className="text-sm">
                      {format(new Date(selectedTask.due_date), "MMM d, yyyy")}
                    </p>
                  </div>
                )}
                <div className="pt-4 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setEditingTask(selectedTask);
                      setSelectedTask(null);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setDeletingTaskId(selectedTask.id);
                      setSelectedTask(null);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      {editingTask && (
        <TaskDialog
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          clients={clients}
          projects={projects}
          assignees={assignees}
          tags={[]}
          task={editingTask}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTaskId} onOpenChange={() => setDeletingTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

