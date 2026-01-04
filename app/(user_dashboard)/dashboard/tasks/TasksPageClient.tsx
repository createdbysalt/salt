"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskWithRelations } from "@/src/features/tasks/types";
import { TaskList } from "./components/TaskList";
import { TaskDialog } from "./components/TaskDialog";
import { PageGreetingHeader } from "@/components/patterns/page-greeting-header";
import { useDashboardUser } from "@/src/features/shell/contexts/DashboardUserContext";

interface TasksPageClientProps {
  tasks: TaskWithRelations[];
  clients: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; client_id: string }>;
  assignees: Array<{
    id: string;
    display_name: string;
    email: string;
    avatar_url: string | null;
  }>;
  tags: Array<{ id: string; label: string; color: string }>;
  initialFilters: {
    search: string;
    client: string;
    project: string;
    status: string;
    assigned_to: string;
    tags: string[];
  };
}

export function TasksPageClient({
  tasks,
  clients,
  projects,
  assignees,
  tags,
  initialFilters,
}: TasksPageClientProps) {
  const user = useDashboardUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialFilters.search);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/dashboard/tasks?${params.toString()}`);
  };

  const handleSelectFilter = (key: string, value: string) => {
    handleFilterChange(key, value === "all" ? "" : value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilterChange("search", search);
  };

  const clearFilters = () => {
    router.push("/dashboard/tasks");
    setSearch("");
  };

  const hasActiveFilters =
    initialFilters.search ||
    initialFilters.client ||
    initialFilters.project ||
    initialFilters.status ||
    initialFilters.assigned_to ||
    initialFilters.tags.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageGreetingHeader page="tasks" viewer={user} />
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            value={initialFilters.status || "all"}
            onValueChange={(value) => handleSelectFilter("status", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={initialFilters.client || "all"}
            onValueChange={(value) => handleSelectFilter("client", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={initialFilters.project || "all"}
            onValueChange={(value) => handleSelectFilter("project", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={initialFilters.assigned_to || "all"}
            onValueChange={(value) => handleSelectFilter("assigned_to", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Assignees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {assignees.map((assignee) => (
                <SelectItem key={assignee.id} value={assignee.id}>
                  {assignee.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-card">
          <p className="text-muted-foreground mb-4">
            {hasActiveFilters
              ? "No tasks found matching your filters"
              : "No tasks yet. Create your first task to get started!"}
          </p>
          {!hasActiveFilters && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          )}
        </div>
      ) : (
        <TaskList
          tasks={tasks}
          clients={clients}
          projects={projects}
          assignees={assignees}
        />
      )}

      {/* Create Dialog */}
      <TaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        clients={clients}
        projects={projects}
        assignees={assignees}
        tags={tags}
      />
    </div>
  );
}

