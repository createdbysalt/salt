/**
 * Task Management Types
 */

export type TaskPriority = "low" | "medium" | "high" | "urgent" | "revenue_blocker";
export type TaskStatus =
  | "open"
  | "in_progress"
  | "completed"
  | "blocked"
  | "cancelled";
export type TaskSource = "internal" | "client_request";

export interface Task {
  id: string;
  studio_id: string;
  project_id: string | null;
  client_id: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  source: TaskSource;
  metadata: Record<string, any>;
  is_urgent: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskWithRelations extends Task {
  project?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  client?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  assignee?: {
    id: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  project_id?: string;
  client_id?: string;
  assigned_to?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_date?: string;
  is_urgent?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  project_id?: string;
  client_id?: string;
  assigned_to?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_date?: string;
  is_urgent?: boolean;
  metadata?: Record<string, any>;
}

export interface TaskFilters {
  search?: string;
  client?: string;
  project?: string;
  status?: TaskStatus;
  assigned_to?: string;
  tags?: string[];
}

