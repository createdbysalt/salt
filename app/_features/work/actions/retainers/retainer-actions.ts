"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createRetainerSchema = z.object({
  projectId: z.string().uuid(),
  includedHoursPerMonth: z.number().positive(),
  hourlyRateCents: z.number().int().positive().nullable(),
});

const createTimeEntrySchema = z.object({
  retainerId: z.string().uuid(),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  hours: z.number().positive().max(24),
  description: z.string().min(1).max(500),
});

/**
 * Create a retainer configuration for a project
 * Studio members only
 */
export async function createRetainer(input: z.infer<typeof createRetainerSchema>) {
  try {
    const validated = createRetainerSchema.parse(input);
    const { context } = await getTenantContext();
    const studio = requireWorkspaceMember(context);
    const supabase = await createClient();

    // Get project details
    const { data: project } = await supabase
      .from("projects")
      .select("workspace_id, client_id")
      .eq("id", validated.projectId)
      .single();

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    if (project.workspace_id !== studio.id) {
      return { success: false, error: "Access denied" };
    }

    // Create retainer
    const { data, error } = await supabase
      .from("project_retainers")
      .insert({
        workspace_id: project.workspace_id,
        client_id: project.client_id,
        project_id: validated.projectId,
        included_hours_per_month: validated.includedHoursPerMonth,
        hourly_rate_cents: validated.hourlyRateCents,
        active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating retainer:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/work");
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Error in createRetainer:", error);
    return { success: false, error: "Failed to create retainer" };
  }
}

/**
 * Create a time entry for a retainer
 * Studio members only
 */
export async function createTimeEntry(input: z.infer<typeof createTimeEntrySchema>) {
  try {
    const validated = createTimeEntrySchema.parse(input);
    const { context } = await getTenantContext();
    const studio = requireWorkspaceMember(context);
    const supabase = await createClient();

    // Get retainer details
    const { data: retainer } = await supabase
      .from("project_retainers")
      .select("*")
      .eq("id", validated.retainerId)
      .single();

    if (!retainer) {
      return { success: false, error: "Retainer not found" };
    }

    if (retainer.workspace_id !== studio.id) {
      return { success: false, error: "Access denied" };
    }

    if (!retainer.active) {
      return { success: false, error: "Retainer is not active" };
    }

    // Create time entry
    const { data, error } = await supabase
      .from("retainer_time_entries")
      .insert({
        workspace_id: retainer.workspace_id,
        client_id: retainer.client_id,
        project_id: retainer.project_id,
        retainer_id: retainer.id,
        work_date: validated.workDate,
        hours: validated.hours,
        description: validated.description,
        created_by: context.userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating time entry:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/work");
    revalidatePath("/");
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Error in createTimeEntry:", error);
    return { success: false, error: "Failed to create time entry" };
  }
}

/**
 * Get retainer summary for a project (current month)
 */
export async function getRetainerSummary(projectId: string) {
  try {
    const { context } = await getTenantContext();
    const supabase = await createClient();

    if (!context.userId) {
      return { success: false, error: "Authentication required" };
    }

    // Get retainer
    const { data: retainer, error: retainerError } = await supabase
      .from("project_retainers")
      .select("*")
      .eq("project_id", projectId)
      .eq("active", true)
      .maybeSingle();

    if (retainerError) {
      console.error("Error fetching retainer:", retainerError);
      return { success: false, error: retainerError.message };
    }

    if (!retainer) {
      return { success: true, data: null }; // No retainer for this project
    }

    // Calculate current month boundaries
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const firstDayStr = firstDay.toISOString().split("T")[0];
    const lastDayStr = lastDay.toISOString().split("T")[0];

    // Get time entries for current month
    const { data: entries, error: entriesError } = await supabase
      .from("retainer_time_entries")
      .select("*")
      .eq("retainer_id", retainer.id)
      .gte("work_date", firstDayStr)
      .lte("work_date", lastDayStr)
      .order("work_date", { ascending: false });

    if (entriesError) {
      console.error("Error fetching time entries:", entriesError);
      return { success: false, error: entriesError.message };
    }

    // Calculate totals
    const hoursUsed = (entries || []).reduce((sum, entry) => sum + parseFloat(entry.hours.toString()), 0);
    const hoursRemaining = Math.max(0, parseFloat(retainer.included_hours_per_month.toString()) - hoursUsed);

    return {
      success: true,
      data: {
        retainer,
        entries: entries || [],
        hoursUsed,
        hoursRemaining,
        includedHours: parseFloat(retainer.included_hours_per_month.toString()),
        currentMonth: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      },
    };
  } catch (error) {
    console.error("Error in getRetainerSummary:", error);
    return { success: false, error: "Failed to fetch retainer summary" };
  }
}

