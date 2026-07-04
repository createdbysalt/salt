"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import type { ICPSegment, ICPSegmentStatus, ICPSegmentSource } from "../types";

// ─── Schemas ────────────────────────────────────────────────────────────────

const CreateICPSegmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  painPoints: z.array(z.string().max(200)).max(10).optional(),
  desiredOutcomes: z.array(z.string().max(200)).max(10).optional(),
  budgetSignal: z.string().max(100).optional().nullable(),
  targetCompanySize: z
    .enum(["solo", "2-10", "11-50", "51-200", "200+"])
    .optional()
    .nullable(),
  minProjectValueCents: z.number().int().min(0).optional().nullable(),
  targetIndustry: z.string().max(100).optional().nullable(),
  qualifyingSignals: z.array(z.string().max(200)).max(10).optional(),
  disqualifyingSignals: z.array(z.string().max(200)).max(10).optional(),
  source: z.enum(["manual", "ai_capture"]).optional(),
  confidence: z.number().int().min(0).max(100).optional().nullable(),
});

const UpdateICPSegmentSchema = CreateICPSegmentSchema.partial().extend({
  id: z.string().uuid(),
});

// ─── Actions ────────────────────────────────────────────────────────────────

export async function createICPSegment(
  input: z.infer<typeof CreateICPSegmentSchema>,
): Promise<{ ok: true; segment: ICPSegment } | { ok: false; message: string }> {
  try {
    const data = CreateICPSegmentSchema.parse(input);
    const { workspace } = await getWorkspaceContext();
    const supabase = await createClient();

    const { data: segment, error } = await supabase
      .from("workspace_icp_segments")
      .insert({
        workspace_id: workspace.id,
        name: data.name,
        description: data.description ?? null,
        pain_points: data.painPoints ?? [],
        desired_outcomes: data.desiredOutcomes ?? [],
        budget_signal: data.budgetSignal ?? null,
        target_company_size: data.targetCompanySize ?? null,
        min_project_value_cents: data.minProjectValueCents ?? null,
        target_industry: data.targetIndustry ?? null,
        qualifying_signals: data.qualifyingSignals ?? [],
        disqualifying_signals: data.disqualifyingSignals ?? [],
        source: data.source ?? "manual",
        confidence: data.confidence ?? null,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("[createICPSegment] Error:", error);
      return { ok: false, message: error.message };
    }

    revalidatePath("/me");

    return {
      ok: true,
      segment: mapSegment(segment),
    };
  } catch (err) {
    console.error("[createICPSegment] Error:", err);
    return { ok: false, message: "Failed to create ICP segment" };
  }
}

export async function updateICPSegment(
  input: z.infer<typeof UpdateICPSegmentSchema>,
): Promise<{ ok: true; segment: ICPSegment } | { ok: false; message: string }> {
  try {
    const data = UpdateICPSegmentSchema.parse(input);
    const supabase = await createClient();

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.painPoints !== undefined) updateData.pain_points = data.painPoints;
    if (data.desiredOutcomes !== undefined) updateData.desired_outcomes = data.desiredOutcomes;
    if (data.budgetSignal !== undefined) updateData.budget_signal = data.budgetSignal;
    if (data.targetCompanySize !== undefined) updateData.target_company_size = data.targetCompanySize;
    if (data.minProjectValueCents !== undefined) updateData.min_project_value_cents = data.minProjectValueCents;
    if (data.targetIndustry !== undefined) updateData.target_industry = data.targetIndustry;
    if (data.qualifyingSignals !== undefined) updateData.qualifying_signals = data.qualifyingSignals;
    if (data.disqualifyingSignals !== undefined) updateData.disqualifying_signals = data.disqualifyingSignals;

    const { data: segment, error } = await supabase
      .from("workspace_icp_segments")
      .update(updateData)
      .eq("id", data.id)
      .select()
      .single();

    if (error) {
      console.error("[updateICPSegment] Error:", error);
      return { ok: false, message: error.message };
    }

    revalidatePath("/me");

    return {
      ok: true,
      segment: mapSegment(segment),
    };
  } catch (err) {
    console.error("[updateICPSegment] Error:", err);
    return { ok: false, message: "Failed to update ICP segment" };
  }
}

export async function confirmICPSegment(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("workspace_icp_segments")
      .update({ status: "active" })
      .eq("id", id);

    if (error) {
      console.error("[confirmICPSegment] Error:", error);
      return { ok: false, message: error.message };
    }

    revalidatePath("/me");
    return { ok: true };
  } catch (err) {
    console.error("[confirmICPSegment] Error:", err);
    return { ok: false, message: "Failed to confirm ICP segment" };
  }
}

export async function dismissICPSegment(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("workspace_icp_segments")
      .update({ status: "dismissed" })
      .eq("id", id);

    if (error) {
      console.error("[dismissICPSegment] Error:", error);
      return { ok: false, message: error.message };
    }

    revalidatePath("/me");
    return { ok: true };
  } catch (err) {
    console.error("[dismissICPSegment] Error:", err);
    return { ok: false, message: "Failed to dismiss ICP segment" };
  }
}

export async function deleteICPSegment(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("workspace_icp_segments")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[deleteICPSegment] Error:", error);
      return { ok: false, message: error.message };
    }

    revalidatePath("/me");
    return { ok: true };
  } catch (err) {
    console.error("[deleteICPSegment] Error:", err);
    return { ok: false, message: "Failed to delete ICP segment" };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapSegment(row: Record<string, unknown>): ICPSegment {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    name: row.name as string,
    description: row.description as string | null,
    painPoints: (row.pain_points as string[]) ?? [],
    desiredOutcomes: (row.desired_outcomes as string[]) ?? [],
    budgetSignal: row.budget_signal as string | null,
    targetCompanySize: row.target_company_size as ICPSegment["targetCompanySize"],
    minProjectValueCents: row.min_project_value_cents as number | null,
    targetIndustry: row.target_industry as string | null,
    qualifyingSignals: (row.qualifying_signals as string[]) ?? [],
    disqualifyingSignals: (row.disqualifying_signals as string[]) ?? [],
    status: row.status as ICPSegmentStatus,
    source: row.source as ICPSegmentSource,
    confidence: row.confidence as number | null,
    displayOrder: (row.display_order as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
