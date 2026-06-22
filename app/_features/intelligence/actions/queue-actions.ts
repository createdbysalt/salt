"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import type {
  QueueJobWithRelations,
  QueueJobType,
  QueueJobStatus,
  ActionResult,
} from "./types";

// ============================================================================
// Get Intelligence Queue
// ============================================================================

export interface GetIntelligenceQueueInput {
  status?: QueueJobStatus | "all";
  limit?: number;
}

export interface GetIntelligenceQueueData {
  jobs: QueueJobWithRelations[];
  pendingCount: number;
  runningCount: number;
}

export type GetIntelligenceQueueResponse = ActionResult<GetIntelligenceQueueData>;

/**
 * Fetches the intelligence generation queue for the current studio.
 */
export async function getIntelligenceQueue(
  input: GetIntelligenceQueueInput = {}
): Promise<GetIntelligenceQueueResponse> {
  try {
    const { status = "all", limit = 50 } = input;

    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);

    const supabase = await createClient();

    let query = supabase
      .from("intelligence_queue")
      .select(
        `
        *,
        project:projects(id, name),
        client:clients(id, name),
        result_event:intelligence_events(id, title, status)
      `
      )
      .eq("studio_id", studio.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data: jobs, error } = await query;

    if (error) {
      console.error("Error fetching intelligence queue:", error);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to fetch intelligence queue",
      };
    }

    // Get counts for pending and running
    const { count: pendingCount } = await supabase
      .from("intelligence_queue")
      .select("*", { count: "exact", head: true })
      .eq("studio_id", studio.id)
      .eq("status", "pending");

    const { count: runningCount } = await supabase
      .from("intelligence_queue")
      .select("*", { count: "exact", head: true })
      .eq("studio_id", studio.id)
      .eq("status", "running");

    return {
      ok: true,
      data: {
        jobs: (jobs ?? []) as QueueJobWithRelations[],
        pendingCount: pendingCount ?? 0,
        runningCount: runningCount ?? 0,
      },
    };
  } catch (error) {
    console.error("Error in getIntelligenceQueue:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// ============================================================================
// Create Queue Job
// ============================================================================

export interface CreateQueueJobInput {
  job_type: QueueJobType;
  job_config?: Record<string, unknown>;
  project_id?: string;
  client_id?: string;
}

export type CreateQueueJobResponse = ActionResult<QueueJobWithRelations>;

/**
 * Creates a new intelligence generation job in the queue.
 */
export async function createQueueJob(
  input: CreateQueueJobInput
): Promise<CreateQueueJobResponse> {
  try {
    const { job_type, job_config = {}, project_id, client_id } = input;

    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        ok: false,
        errorCode: "UNAUTHORIZED",
        message: "Authentication required",
      };
    }

    const { data: job, error } = await supabase
      .from("intelligence_queue")
      .insert({
        studio_id: studio.id,
        project_id: project_id ?? null,
        client_id: client_id ?? null,
        job_type,
        job_config,
        created_by: user.id,
      })
      .select(
        `
        *,
        project:projects(id, name),
        client:clients(id, name)
      `
      )
      .single();

    if (error) {
      console.error("Error creating queue job:", error);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to create queue job",
      };
    }

    revalidatePath("/strategy/intelligence");

    return {
      ok: true,
      data: job as QueueJobWithRelations,
    };
  } catch (error) {
    console.error("Error in createQueueJob:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// ============================================================================
// Cancel Queue Job
// ============================================================================

export type CancelQueueJobResponse = ActionResult<{ id: string; status: QueueJobStatus }>;

/**
 * Cancels a pending or running queue job.
 */
export async function cancelQueueJob(jobId: string): Promise<CancelQueueJobResponse> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);

    const supabase = await createClient();

    // First check if job exists and is cancellable
    const { data: existingJob, error: fetchError } = await supabase
      .from("intelligence_queue")
      .select("id, status")
      .eq("id", jobId)
      .eq("studio_id", studio.id)
      .single();

    if (fetchError || !existingJob) {
      return {
        ok: false,
        errorCode: "NOT_FOUND",
        message: "Job not found",
      };
    }

    if (existingJob.status === "completed" || existingJob.status === "failed") {
      return {
        ok: false,
        errorCode: "INVALID_STATE",
        message: "Cannot cancel a completed or failed job",
      };
    }

    const { data: job, error } = await supabase
      .from("intelligence_queue")
      .update({
        status: "cancelled",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .eq("studio_id", studio.id)
      .select("id, status")
      .single();

    if (error) {
      console.error("Error cancelling queue job:", error);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to cancel queue job",
      };
    }

    revalidatePath("/strategy/intelligence");

    return {
      ok: true,
      data: job as { id: string; status: QueueJobStatus },
    };
  } catch (error) {
    console.error("Error in cancelQueueJob:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// ============================================================================
// Retry Queue Job
// ============================================================================

export type RetryQueueJobResponse = ActionResult<QueueJobWithRelations>;

/**
 * Retries a failed or cancelled queue job by creating a new job with the same config.
 */
export async function retryQueueJob(jobId: string): Promise<RetryQueueJobResponse> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        ok: false,
        errorCode: "UNAUTHORIZED",
        message: "Authentication required",
      };
    }

    // Fetch the original job
    const { data: originalJob, error: fetchError } = await supabase
      .from("intelligence_queue")
      .select("*")
      .eq("id", jobId)
      .eq("studio_id", studio.id)
      .single();

    if (fetchError || !originalJob) {
      return {
        ok: false,
        errorCode: "NOT_FOUND",
        message: "Original job not found",
      };
    }

    if (originalJob.status !== "failed" && originalJob.status !== "cancelled") {
      return {
        ok: false,
        errorCode: "INVALID_STATE",
        message: "Can only retry failed or cancelled jobs",
      };
    }

    // Create a new job with the same config
    const { data: newJob, error } = await supabase
      .from("intelligence_queue")
      .insert({
        studio_id: studio.id,
        project_id: originalJob.project_id,
        client_id: originalJob.client_id,
        job_type: originalJob.job_type,
        job_config: originalJob.job_config,
        created_by: user.id,
      })
      .select(
        `
        *,
        project:projects(id, name),
        client:clients(id, name)
      `
      )
      .single();

    if (error) {
      console.error("Error retrying queue job:", error);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to retry queue job",
      };
    }

    revalidatePath("/strategy/intelligence");

    return {
      ok: true,
      data: newJob as QueueJobWithRelations,
    };
  } catch (error) {
    console.error("Error in retryQueueJob:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
