"use server";

import { createClient } from "@/libs/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  CreateTaskInput,
  UpdateTaskInput,
  TaskPriority,
  TaskStatus,
} from "@/src/features/tasks/types";

// Validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  project_id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  status: z
    .enum(["open", "in_progress", "completed", "blocked", "cancelled"])
    .default("open"),
  due_date: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  project_id: z.string().uuid().nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  status: z
    .enum(["open", "in_progress", "completed", "blocked", "cancelled"])
    .optional(),
  due_date: z.string().nullable().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Get the user's studio ID
 */
async function getUserStudioId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("studio_members")
    .select("studio_id")
    .eq("user_id", user.id)
    .single();

  return membership?.studio_id || null;
}

/**
 * Create a new task
 */
export async function createTask(input: CreateTaskInput) {
  try {
    const validated = createTaskSchema.parse(input);
    const studioId = await getUserStudioId();

    if (!studioId) {
      return { success: false, error: "Studio not found" };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        studio_id: studioId,
        title: validated.title,
        description: validated.description || null,
        project_id: validated.project_id || null,
        client_id: validated.client_id || null,
        assigned_to: validated.assigned_to || null,
        priority: validated.priority,
        status: validated.status,
        due_date: validated.due_date || null,
        source: "internal",
        metadata: validated.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating task:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/tasks");
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Error creating task:", error);
    return { success: false, error: "Failed to create task" };
  }
}

/**
 * Update an existing task
 */
export async function updateTask(taskId: string, input: UpdateTaskInput) {
  try {
    const validated = updateTaskSchema.parse(input);
    const studioId = await getUserStudioId();

    if (!studioId) {
      return { success: false, error: "Studio not found" };
    }

    const supabase = await createClient();

    // Verify task belongs to user's studio
    const { data: task } = await supabase
      .from("tasks")
      .select("studio_id")
      .eq("id", taskId)
      .single();

    if (!task || task.studio_id !== studioId) {
      return { success: false, error: "Task not found or access denied" };
    }

    const { data, error } = await supabase
      .from("tasks")
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select()
      .single();

    if (error) {
      console.error("Error updating task:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/tasks");
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Error updating task:", error);
    return { success: false, error: "Failed to update task" };
  }
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string) {
  try {
    const studioId = await getUserStudioId();

    if (!studioId) {
      return { success: false, error: "Studio not found" };
    }

    const supabase = await createClient();

    // Verify task belongs to user's studio
    const { data: task } = await supabase
      .from("tasks")
      .select("studio_id")
      .eq("id", taskId)
      .single();

    if (!task || task.studio_id !== studioId) {
      return { success: false, error: "Task not found or access denied" };
    }

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      console.error("Error deleting task:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/tasks");
    return { success: true };
  } catch (error) {
    console.error("Error deleting task:", error);
    return { success: false, error: "Failed to delete task" };
  }
}

/**
 * Submit a client request (creates a task with client_request source)
 */
export async function submitClientRequest(input: {
  title: string;
  description?: string;
  project_id?: string;
  client_id: string;
  studio_id: string;
}) {
  try {
    const schema = z.object({
      title: z.string().min(1, "Title is required").max(255),
      description: z.string().optional(),
      project_id: z.string().uuid().optional(),
      client_id: z.string().uuid(),
      studio_id: z.string().uuid(),
    });

    const validated = schema.parse(input);
    const supabase = await createClient();

    // Verify user has access to this client
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const { data: clientUser } = await supabase
      .from("client_users")
      .select("id")
      .eq("client_id", validated.client_id)
      .eq("user_id", user.id)
      .single();

    if (!clientUser) {
      return { success: false, error: "Access denied" };
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        studio_id: validated.studio_id,
        client_id: validated.client_id,
        project_id: validated.project_id || null,
        title: validated.title,
        description: validated.description || null,
        priority: "medium",
        status: "open",
        source: "client_request",
        metadata: {},
      })
      .select()
      .single();

    if (error) {
      console.error("Error submitting client request:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/bridge");
    revalidatePath("/dashboard/tasks");
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Error submitting client request:", error);
    return { success: false, error: "Failed to submit request" };
  }
}

