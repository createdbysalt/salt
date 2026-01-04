"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Send, ArrowLeft } from "lucide-react";
import Link from "next/link";
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
    project?: {
      id: string;
      name: string;
    } | null;
  }>;
  firstName?: string;
}

const statusColors: Record<TaskStatus, string> = {
  open: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  blocked: "bg-red-500/10 text-red-500 border-red-500/20",
  cancelled: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

export function RequestsPageClient({
  client,
  projects,
  requests,
  firstName,
}: RequestsPageClientProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  return (
    <div className="min-h-screen bg-background">
      {/* TEMPORARY: Visual indicator that this is the Bridge */}
      <div className="bg-primary text-primary-content py-4">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-black text-center">🌉 BRIDGE</h1>
          <p className="text-center text-sm mt-1">Client Portal</p>
        </div>
      </div>

      {/* Header */}
      <header className="bg-card shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">{client.name}</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <PageGreetingHeader page="requests" viewer={{ firstName }} variant="bridge" />
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </div>

          {/* Requests List */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Your Requests</h3>
            {requests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    You haven't submitted any requests yet.
                  </p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Submit Your First Request
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {requests.map((request) => (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle>{request.title}</CardTitle>
                          <CardDescription>
                            Submitted {format(new Date(request.created_at), "MMM d, yyyy")}
                            {request.project && ` • Project: ${request.project.name}`}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className={statusColors[request.status]}>
                          {request.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    {request.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {request.description}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

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
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Brief description of your request"
                value={values.title}
                onChange={(e) => setValues((p) => ({ ...p, title: e.target.value }))}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description (Optional)</label>
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
              <label className="text-sm font-medium">Related Project (Optional)</label>
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

