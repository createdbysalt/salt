"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import { scheduleWorkHealthRecompute } from "@/app/_features/work/health/recompute";
import { verifyWorkOwnership } from "@/app/_features/work/actions/verify-work-ownership";
import type { WorkMilestone, WorkMilestoneStatus, WorkMilestoneTriggerType } from "../types";

const MilestoneInputSchema = z.object({
  name: z.string().min(1).max(200),
  percent: z.number().min(0).max(100).nullable(),
  amountCents: z.number().int().positive().nullable(),
  triggerType: z.enum(["stage", "date", "manual"]).default("manual"),
  triggerStage: z.string().nullable(),
  dueDate: z.string().nullable(),
}).refine(
  (data) => data.percent !== null || data.amountCents !== null,
  { message: "Either percent or amount is required" }
).refine(
  (data) => data.triggerType !== "stage" || data.triggerStage !== null,
  { message: "Stage is required when trigger type is 'stage'" }
).refine(
  (data) => data.triggerType !== "date" || data.dueDate !== null,
  { message: "Date is required when trigger type is 'date'" }
);

export async function createWorkMilestone(
  workId: string,
  input: z.infer<typeof MilestoneInputSchema>,
): Promise<{ ok: true; milestone: WorkMilestone } | { ok: false; message: string }> {
  try {
    const data = MilestoneInputSchema.parse(input);
    const { workspace, supabase } = await getWorkspaceContext();

    const ownership = await verifyWorkOwnership(supabase, workId, workspace.id);
    if (!ownership.ok) {
      return { ok: false, message: ownership.message };
    }

    const { data: existingMilestones } = await supabase
      .from("work_payment_milestones")
      .select("sort_order")
      .eq("workspace_id", workspace.id)
      .eq("work_id", workId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextSortOrder = ((existingMilestones?.[0]?.sort_order as number) ?? -1) + 1;

    const { data: row, error } = await supabase
      .from("work_payment_milestones")
      .insert({
        workspace_id: workspace.id,
        work_id: workId,
        name: data.name,
        percent: data.percent,
        amount_cents: data.amountCents,
        trigger_type: data.triggerType,
        trigger_stage: data.triggerStage,
        due_date: data.dueDate,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) throw error;

    scheduleWorkHealthRecompute(workId);
    revalidatePath(`/work/${workId}`);

    return {
      ok: true,
      milestone: {
        id: row.id as string,
        workId: row.work_id as string,
        name: row.name as string,
        percent: row.percent == null ? null : Number(row.percent),
        amountCents: (row.amount_cents as number | null) ?? null,
        triggerType: (row.trigger_type as WorkMilestoneTriggerType) ?? "manual",
        triggerStage: (row.trigger_stage as string | null) ?? null,
        dueDate: (row.due_date as string | null) ?? null,
        status: row.status as WorkMilestoneStatus,
        becameDueAt: (row.became_due_at as string | null) ?? null,
        invoiceRef: (row.invoice_ref as string | null) ?? null,
        paidAt: (row.paid_at as string | null) ?? null,
        sortOrder: (row.sort_order as number) ?? 0,
      },
    };
  } catch (err) {
    console.error("Error creating work milestone:", err);
    return { ok: false, message: err instanceof Error ? err.message : "Failed to create milestone" };
  }
}

export async function updateWorkMilestone(
  milestoneId: string,
  input: Partial<z.infer<typeof MilestoneInputSchema>> & { status?: WorkMilestoneStatus },
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const { workspace, supabase } = await getWorkspaceContext();

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.percent !== undefined) updateData.percent = input.percent;
    if (input.amountCents !== undefined) updateData.amount_cents = input.amountCents;
    if (input.triggerType !== undefined) updateData.trigger_type = input.triggerType;
    if (input.triggerStage !== undefined) updateData.trigger_stage = input.triggerStage;
    if (input.dueDate !== undefined) updateData.due_date = input.dueDate;
    if (input.status !== undefined) {
      updateData.status = input.status;
      if (input.status === "paid") {
        updateData.paid_at = new Date().toISOString();
      }
      if (input.status === "due" || input.status === "invoiced" || input.status === "paid") {
        updateData.became_due_at = updateData.became_due_at ?? new Date().toISOString();
      }
    }

    const { data: row, error } = await supabase
      .from("work_payment_milestones")
      .update(updateData)
      .eq("id", milestoneId)
      .eq("workspace_id", workspace.id)
      .select("work_id")
      .single();

    if (error) throw error;

    scheduleWorkHealthRecompute(row.work_id as string);
    revalidatePath(`/work/${row.work_id}`);

    return { ok: true };
  } catch (err) {
    console.error("Error updating work milestone:", err);
    return { ok: false, message: err instanceof Error ? err.message : "Failed to update milestone" };
  }
}

export async function deleteWorkMilestone(
  milestoneId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const { workspace, supabase } = await getWorkspaceContext();

    const { data: row, error } = await supabase
      .from("work_payment_milestones")
      .delete()
      .eq("id", milestoneId)
      .eq("workspace_id", workspace.id)
      .select("work_id")
      .single();

    if (error) throw error;

    scheduleWorkHealthRecompute(row.work_id as string);
    revalidatePath(`/work/${row.work_id}`);

    return { ok: true };
  } catch (err) {
    console.error("Error deleting work milestone:", err);
    return { ok: false, message: err instanceof Error ? err.message : "Failed to delete milestone" };
  }
}

export async function reorderWorkMilestones(
  workId: string,
  milestoneIds: string[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const { workspace, supabase } = await getWorkspaceContext();

    const ownership = await verifyWorkOwnership(supabase, workId, workspace.id);
    if (!ownership.ok) {
      return { ok: false, message: ownership.message };
    }

    for (let i = 0; i < milestoneIds.length; i++) {
      await supabase
        .from("work_payment_milestones")
        .update({ sort_order: i })
        .eq("id", milestoneIds[i])
        .eq("workspace_id", workspace.id)
        .eq("work_id", workId);
    }

    revalidatePath(`/work/${workId}`);

    return { ok: true };
  } catch (err) {
    console.error("Error reordering work milestones:", err);
    return { ok: false, message: err instanceof Error ? err.message : "Failed to reorder milestones" };
  }
}
