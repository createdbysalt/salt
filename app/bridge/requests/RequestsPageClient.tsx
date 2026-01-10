"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";
import { Plus, Send, CheckCircle2, Clock, AlertCircle, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { submitClientRequest } from "./actions";
import { toast } from "sonner";
import type { TaskStatus } from "@/src/features/tasks/types";
import { PageGreetingHeader } from "@/components/patterns/page-greeting-header";

const requestFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  project_id: z.string().optional(),
});

type RequestFormValues = z.infer<typeof requestFormSchema>;

interface RequestsPageClientProps {
  client: {
    id: string;
    name: string;
    studio_id: string;
  };
  projects: Array<{
    id: string;
    name: string;
    status: string | null;
  }>;
  requests: Array<{
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: string;
    created_at: string;
    updated_at: string;
    metadata?: any;
    project?: {
      id: string;
      name: string;
    } | null;
  }>;
  firstName?: string;
}

// Map internal status to client-facing status
const statusMapping: Record<TaskStatus, { label: string; icon: React.ReactNode; color: string }> = {
  open: { 
    label: "Submitted", 
    icon: <Circle className="h-4 w-4" />,
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20"
  },
  in_progress: { 
    label: "In Progress", 
    icon: <Clock className="h-4 w-4" />,
    color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
  },
  blocked: { 
    label: "Waiting on You", 
    icon: <AlertCircle className="h-4 w-4" />,
    color: "bg-orange-500/10 text-orange-500 border-orange-500/20"
  },
  completed: { 
    label: "Complete", 
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "bg-green-500/10 text-green-500 border-green-500/20"
  },
  cancelled: { 
    label: "Cancelled", 
    icon: <Circle className="h-4 w-4" />,
    color: "bg-gray-500/10 text-gray-500 border-gray-500/20"
  },
};

type FilterStatus = "all" | "open" | "in_progress" | "completed" | "blocked" | "cancelled";

export function RequestsPageClient({
  client,
  projects,
  requests,
  firstName,
}: RequestsPageClientProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [values, setValues] = useState<RequestFormValues>({
    title: "",
    description: "",
    project_id: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RequestFormValues, string>>>({});

  const onSubmit = async () => {
    setIsSubmitting(true);

    const parsed = requestFormSchema.safeParse(values);
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof RequestFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof RequestFormValues | undefined;
        if (key && !nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      toast.error("Please fix the highlighted fields.");
      setIsSubmitting(false);
      return;
    }

    setErrors({});
    const result = await submitClientRequest({
      title: parsed.data.title,
      description: parsed.data.description || undefined,
      project_id: parsed.data.project_id || undefined,
    });

    if (result.success) {
      toast.success("Request submitted successfully");
      setValues({ title: "", description: "", project_id: "" });
      setDialogOpen(false);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to submit request");
    }

    setIsSubmitting(false);
  };

  // Filter requests based on status
  const filteredRequests = requests.filter((request) => {
    if (filterStatus === "all") return true;
    return request.status === filterStatus;
  });

  // Count by status
  const statusCounts = {
    all: requests.length,
    open: requests.filter((r) => r.status === "open").length,
    in_progress: requests.filter((r) => r.status === "in_progress").length,
    completed: requests.filter((r) => r.status === "completed").length,
    blocked: requests.filter((r) => r.status === "blocked").length,
    cancelled: requests.filter((r) => r.status === "cancelled").length,
  };

  return (
        <div className="space-y-8">
          {/* Page Header */}
      <div className="flex items-start justify-between pt-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">Requests</h1>
          <p className="text-lg text-muted-foreground mt-2 sm:text-xl">
            Submit and track your project requests
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Filters */}
      <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
        <TabsList>
          <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="open">Open ({statusCounts.open})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({statusCounts.in_progress})</TabsTrigger>
          <TabsTrigger value="blocked">Waiting on You ({statusCounts.blocked})</TabsTrigger>
          <TabsTrigger value="completed">Complete ({statusCounts.completed})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({statusCounts.cancelled})</TabsTrigger>
        </TabsList>
      </Tabs>

          {/* Requests List */}
      {filteredRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">
              {filterStatus === "all"
                ? "You haven't submitted any requests yet."
                : filterStatus === "open"
                ? "No open requests."
                : filterStatus === "in_progress"
                ? "No requests in progress."
                : filterStatus === "blocked"
                ? "No requests waiting on you."
                : filterStatus === "completed"
                ? "No completed requests."
                : "No cancelled requests."}
                  </p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Submit Your First Request
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
          {filteredRequests.map((request) => {
            const statusInfo = statusMapping[request.status];
            const clientUpdate = request.metadata?.client_visible_update;

            return (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                          <CardTitle>{request.title}</CardTitle>
                          <CardDescription>
                        Submitted {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        {request.project && ` • ${request.project.name}`}
                          </CardDescription>
                        </div>
                    <Badge variant="outline" className={statusInfo.color}>
                      <span className="flex items-center gap-1.5">
                        {statusInfo.icon}
                        {statusInfo.label}
                      </span>
                        </Badge>
                      </div>
                    </CardHeader>
                <CardContent className="space-y-3">
                    {request.description && (
                    <p className="text-sm text-foreground/80">
                          {request.description}
                        </p>
                  )}
                  
                  {/* Latest Update */}
                  {clientUpdate && (
                    <div className="border-l-2 border-primary pl-3 py-1 bg-primary/5 rounded-r text-sm">
                      <p className="font-medium text-xs text-muted-foreground mb-1">Latest Update</p>
                      <p>{clientUpdate}</p>
              </div>
            )}

                  {/* Priority Badge */}
                  {request.priority === "urgent" || request.priority === "high" ? (
                    <Badge variant="secondary" className="text-xs">
                      Priority: {request.priority}
                    </Badge>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Submit Request Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submit a New Request</DialogTitle>
            <DialogDescription>
              Tell us what you need help with and we'll respond as soon as possible.
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
              <label className="text-sm font-medium">What do you need?</label>
              <Input
                placeholder="Brief description of your request"
                value={values.title}
                onChange={(e) => setValues((p) => ({ ...p, title: e.target.value }))}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Details (Optional)</label>
              <Textarea
                placeholder="Provide more details about your request..."
                rows={6}
                value={values.description || ""}
                onChange={(e) => setValues((p) => ({ ...p, description: e.target.value }))}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">For which project?</label>
              <Select
                value={values.project_id || "none"}
                onValueChange={(value) =>
                  setValues((p) => ({ ...p, project_id: value === "none" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.project_id && (
                <p className="text-sm text-destructive">{errors.project_id}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

