"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { ActionResult } from "@/app/_features/plays/actions";
import type {
  OperatorFactCategory,
  OperatorFactScope,
  OperatorGoalHorizon,
  OperatorGoalStatus,
  VoiceSpectrums,
  VoiceTerminology,
} from "./types";

type ResolvedOperator =
  | { ok: false; message: string }
  | {
      ok: true;
      workspace: ReturnType<typeof requireWorkspaceMember>;
      userId: string;
      admin: ReturnType<typeof createAdminClient>;
    };

async function resolveOperator(): Promise<ResolvedOperator> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;
  if (!userId) {
    return { ok: false, message: "Not authenticated" };
  }
  return { ok: true, workspace, userId, admin: createAdminClient() };
}

// ─── Identity ─────────────────────────────────────────────────────────────
export async function updateOperatorIdentity(input: {
  fullName?: string;
  roleTitle?: string;
  tagline?: string;
  timezone?: string;
  location?: string;
  workingHours?: string;
  currentFocus?: string;
  emailSignature?: string;
  phone?: string;
  gender?: string | null;
  preferredName?: string;
  professionalCredentials?: string;
}): Promise<ActionResult<{ ok: true }>> {
  const op = await resolveOperator();
  if (!op.ok) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: op.message };
  }

  const patch: Record<string, string | null> = {};
  if (input.fullName !== undefined) patch.full_name = input.fullName.trim() || null;
  if (input.roleTitle !== undefined) patch.role_title = input.roleTitle.trim() || null;
  if (input.tagline !== undefined) patch.tagline = input.tagline.trim() || null;
  if (input.timezone !== undefined) patch.timezone = input.timezone.trim() || null;
  if (input.location !== undefined) patch.location = input.location.trim() || null;
  if (input.workingHours !== undefined) patch.working_hours = input.workingHours.trim() || null;
  if (input.currentFocus !== undefined) patch.current_focus = input.currentFocus.trim() || null;
  if (input.emailSignature !== undefined)
    patch.email_signature = input.emailSignature.trim() || null;
  if (input.phone !== undefined) patch.phone = input.phone.trim() || null;
  if (input.gender !== undefined) patch.gender = input.gender || null;
  if (input.preferredName !== undefined) patch.preferred_name = input.preferredName.trim() || null;
  if (input.professionalCredentials !== undefined)
    patch.professional_credentials = input.professionalCredentials.trim() || null;

  if (Object.keys(patch).length === 0) {
    return { ok: true, data: { ok: true } };
  }

  const { error } = await op.admin.from("profiles").update(patch).eq("id", op.userId);
  if (error) {
    return { ok: false, errorCode: "UPDATE_FAILED", message: error.message };
  }

  revalidatePath("/me");
  return { ok: true, data: { ok: true } };
}

// ─── Goals ────────────────────────────────────────────────────────────────
export async function createOperatorGoal(input: {
  title: string;
  detail?: string;
  horizon?: OperatorGoalHorizon;
  progress?: number;
}): Promise<ActionResult<{ id: string }>> {
  const op = await resolveOperator();
  if (!op.ok) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: op.message };
  }
  const title = input.title.trim();
  if (!title) {
    return { ok: false, errorCode: "INVALID", message: "A goal needs a title" };
  }

  const { data, error } = await op.admin
    .from("operator_goals")
    .insert({
      workspace_id: op.workspace.id,
      user_id: op.userId,
      title,
      detail: input.detail?.trim() || null,
      horizon: input.horizon ?? "quarter",
      progress: Math.max(0, Math.min(100, input.progress ?? 0)),
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, errorCode: "CREATE_FAILED", message: error.message };
  }

  revalidatePath("/me");
  return { ok: true, data: { id: data.id as string } };
}

export async function updateOperatorGoal(input: {
  id: string;
  title?: string;
  detail?: string;
  horizon?: OperatorGoalHorizon;
  progress?: number;
  status?: OperatorGoalStatus;
}): Promise<ActionResult<{ id: string }>> {
  const op = await resolveOperator();
  if (!op.ok) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: op.message };
  }

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.detail !== undefined) patch.detail = input.detail.trim() || null;
  if (input.horizon !== undefined) patch.horizon = input.horizon;
  if (input.progress !== undefined)
    patch.progress = Math.max(0, Math.min(100, input.progress));
  if (input.status !== undefined) patch.status = input.status;

  const { error } = await op.admin
    .from("operator_goals")
    .update(patch)
    .eq("id", input.id)
    .eq("workspace_id", op.workspace.id)
    .eq("user_id", op.userId);

  if (error) {
    return { ok: false, errorCode: "UPDATE_FAILED", message: error.message };
  }

  revalidatePath("/me");
  return { ok: true, data: { id: input.id } };
}

export async function deleteOperatorGoal(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const op = await resolveOperator();
  if (!op.ok) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: op.message };
  }

  const { error } = await op.admin
    .from("operator_goals")
    .delete()
    .eq("id", id)
    .eq("workspace_id", op.workspace.id)
    .eq("user_id", op.userId);

  if (error) {
    return { ok: false, errorCode: "DELETE_FAILED", message: error.message };
  }

  revalidatePath("/me");
  return { ok: true, data: { id } };
}

// ─── Voice ────────────────────────────────────────────────────────────────
export async function updateOperatorVoiceProfile(input: {
  voiceTone?: string[];
  voiceSpectrums?: VoiceSpectrums | null;
  voiceArchetype?: string | null;
  voiceStyleGuide?: string | null;
  voiceTerminology?: VoiceTerminology;
  inheritsWorkspace?: boolean;
}): Promise<ActionResult<{ ok: true }>> {
  const op = await resolveOperator();
  if (!op.ok) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: op.message };
  }

  const row: Record<string, unknown> = {
    workspace_id: op.workspace.id,
    user_id: op.userId,
    updated_at: new Date().toISOString(),
  };
  if (input.voiceTone !== undefined) row.voice_tone = input.voiceTone;
  if (input.voiceSpectrums !== undefined) row.voice_spectrums = input.voiceSpectrums;
  if (input.voiceArchetype !== undefined) row.voice_archetype = input.voiceArchetype;
  if (input.voiceStyleGuide !== undefined)
    row.voice_style_guide = input.voiceStyleGuide?.trim() || null;
  if (input.voiceTerminology !== undefined) row.voice_terminology = input.voiceTerminology;
  if (input.inheritsWorkspace !== undefined) row.inherits_workspace = input.inheritsWorkspace;

  const { error } = await op.admin
    .from("operator_voice_profile")
    .upsert(row, { onConflict: "workspace_id,user_id" });

  if (error) {
    return { ok: false, errorCode: "VOICE_FAILED", message: error.message };
  }

  revalidatePath("/me");
  return { ok: true, data: { ok: true } };
}

// ─── Facts ────────────────────────────────────────────────────────────────
export async function createOperatorFact(input: {
  value: string;
  label?: string;
  category?: OperatorFactCategory;
  scopeType?: OperatorFactScope;
  scopeValue?: string;
  /** user-told facts are trusted; defaults to confirmed for manual entry. */
  status?: "proposed" | "confirmed";
  source?: "manual" | "ask_salt";
}): Promise<ActionResult<{ id: string }>> {
  const op = await resolveOperator();
  if (!op.ok) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: op.message };
  }
  const value = input.value.trim();
  if (!value) {
    return { ok: false, errorCode: "INVALID", message: "A fact needs content" };
  }

  const status = input.status ?? "confirmed";
  const { data, error } = await op.admin
    .from("operator_memory_facts")
    .insert({
      workspace_id: op.workspace.id,
      user_id: op.userId,
      value,
      label: input.label?.trim() || null,
      category: input.category ?? "preference",
      kind: "fact",
      scope_type: input.scopeType ?? "global",
      scope_value: input.scopeValue?.trim() || null,
      status,
      source: input.source ?? "manual",
      confidence: 100,
      vote_count: 1,
      confirmed_at: status === "confirmed" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, errorCode: "CREATE_FAILED", message: error.message };
  }

  revalidatePath("/me");
  return { ok: true, data: { id: data.id as string } };
}

export async function confirmOperatorFact(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const op = await resolveOperator();
  if (!op.ok) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: op.message };
  }

  const { error } = await op.admin
    .from("operator_memory_facts")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", op.workspace.id)
    .eq("user_id", op.userId);

  if (error) {
    return { ok: false, errorCode: "CONFIRM_FAILED", message: error.message };
  }

  revalidatePath("/me");
  return { ok: true, data: { id } };
}

export async function reviseOperatorFact(input: {
  id: string;
  value: string;
}): Promise<ActionResult<{ id: string }>> {
  const op = await resolveOperator();
  if (!op.ok) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: op.message };
  }
  const value = input.value.trim();
  if (!value) {
    return { ok: false, errorCode: "INVALID", message: "A fact needs content" };
  }

  // Revising a fact also confirms it: the operator has reviewed the wording.
  const { error } = await op.admin
    .from("operator_memory_facts")
    .update({
      value,
      status: "confirmed",
      source: "manual",
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("workspace_id", op.workspace.id)
    .eq("user_id", op.userId);

  if (error) {
    return { ok: false, errorCode: "REVISE_FAILED", message: error.message };
  }

  revalidatePath("/me");
  return { ok: true, data: { id: input.id } };
}

export async function forgetOperatorFact(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const op = await resolveOperator();
  if (!op.ok) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: op.message };
  }

  const { error } = await op.admin
    .from("operator_memory_facts")
    .update({ status: "dismissed" })
    .eq("id", id)
    .eq("workspace_id", op.workspace.id)
    .eq("user_id", op.userId);

  if (error) {
    return { ok: false, errorCode: "FORGET_FAILED", message: error.message };
  }

  revalidatePath("/me");
  return { ok: true, data: { id } };
}
