"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { TablesInsert, TablesUpdate } from "@/app/_lib/supabase/database.types";
import type { ActionResult } from "@/app/_features/plays/actions";
import type {
  OperatorFactCategory,
  OperatorFactScope,
  OperatorGoalHorizon,
  OperatorGoalStatus,
  OperatorGoalType,
  OperatorGoalUnit,
  VoiceSpectrums,
  VoiceTerminology,
} from "./types";
import type { MemoryAddressField } from "@/app/_features/memory/utils/address-fields";
import { normalizeTimezoneValue } from "@/app/_features/memory/utils/timezone-format";
import { splitFullName } from "@/app/_features/me/utils/profile-name";
import { writeProfileFieldProvenance } from "@/app/_features/plays/playbooks/records-engine/write-provenance";
import type { OperatorProfileFieldKey } from "@/app/_features/plays/playbooks/records-engine/types";

// Legacy blueprint slug stored on existing rows — do not rename without a
// data migration.
const ME_BLUEPRINT_SLUG = "keeper-me";

/** Provenance parity (keeper-field-contracts 6.5): one applied row per changed field. */
async function writeOperatorFieldProvenance(input: {
  workspaceId: string;
  userId: string;
  field: OperatorProfileFieldKey;
  value: string | null;
}): Promise<void> {
  await writeProfileFieldProvenance({
    workspaceId: input.workspaceId,
    entityType: "operator",
    entityId: input.userId,
    field: input.field,
    value: input.value,
    source: "manual",
    ruleId: null,
    confidence: 100,
    evidence: { because: "You updated this field" },
    blueprintSlug: ME_BLUEPRINT_SLUG,
    blueprintVersion: 1,
    status: "applied",
  });
}

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

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

// ─── Identity ─────────────────────────────────────────────────────────────
export async function updateOperatorIdentity(input: {
  fullName?: string | null;
  roleTitle?: string | null;
  tagline?: string | null;
  timezone?: string | null;
  location?: string | null;
  workingHours?: string | null;
  currentFocus?: string | null;
  emailSignature?: string | null;
  phone?: string | null;
  gender?: string | null;
  preferredName?: string | null;
  professionalCredentials?: string | null;
}): Promise<ActionResult<{ ok: true }>> {
  const op = await resolveOperator();
  if (!op.ok) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: op.message };
  }

  const patch: Record<string, string | null> = {};
  // full_name is GENERATED (first + last → display_name → email); persist editable name to display_name + parts
  if (input.fullName !== undefined) {
    const full = trimOrNull(input.fullName);
    patch.display_name = full;
    if (full) {
      const { firstName, lastName } = splitFullName(full);
      patch.first_name = firstName;
      patch.last_name = lastName;
    } else {
      patch.first_name = null;
      patch.last_name = null;
    }
  }
  if (input.roleTitle !== undefined) patch.role_title = trimOrNull(input.roleTitle);
  if (input.tagline !== undefined) patch.tagline = trimOrNull(input.tagline);
  if (input.timezone !== undefined) patch.timezone = normalizeTimezoneValue(input.timezone);
  if (input.location !== undefined) patch.location = trimOrNull(input.location);
  if (input.workingHours !== undefined) patch.working_hours = trimOrNull(input.workingHours);
  if (input.currentFocus !== undefined) patch.current_focus = trimOrNull(input.currentFocus);
  if (input.emailSignature !== undefined) patch.email_signature = trimOrNull(input.emailSignature);
  if (input.phone !== undefined) patch.phone = trimOrNull(input.phone);
  if (input.gender !== undefined) patch.gender = input.gender || null;
  if (input.preferredName !== undefined) patch.preferred_name = trimOrNull(input.preferredName);
  if (input.professionalCredentials !== undefined) {
    patch.professional_credentials = trimOrNull(input.professionalCredentials);
  }

  if (Object.keys(patch).length === 0) {
    return { ok: true, data: { ok: true } };
  }

  const { data: authData } = await op.admin.auth.admin.getUserById(op.userId);
  const email = authData.user?.email ?? undefined;

  console.error("[updateOperatorIdentity] Upserting profile:", {
    userId: op.userId,
    email,
    patch,
  });

  const { data: updatedRow, error } = await op.admin
    .from("profiles")
    .upsert(
      {
        id: op.userId,
        ...(email ? { email } : {}),
        ...patch,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("id")
    .maybeSingle();

  console.error("[updateOperatorIdentity] Result:", { updatedRow, error });

  if (error) {
    console.error("[updateOperatorIdentity] Error:", error);
    return { ok: false, errorCode: "UPDATE_FAILED", message: error.message };
  }
  if (!updatedRow) {
    return {
      ok: false,
      errorCode: "UPDATE_FAILED",
      message: "Profile could not be saved",
    };
  }

  // first_name / last_name are derived from display_name — provenance tracks
  // the editable field, not the derived parts.
  const identityProvenanceFields: readonly OperatorProfileFieldKey[] = [
    "display_name",
    "role_title",
    "tagline",
    "timezone",
    "location",
    "working_hours",
    "current_focus",
    "email_signature",
    "phone",
    "gender",
    "preferred_name",
    "professional_credentials",
  ];

  for (const field of identityProvenanceFields) {
    if (!(field in patch)) continue;
    await writeOperatorFieldProvenance({
      workspaceId: op.workspace.id,
      userId: op.userId,
      field,
      value: patch[field],
    });
  }

  revalidatePath("/me");
  return { ok: true, data: { ok: true } };
}

const OPERATOR_ADDRESS_COLUMN_MAP: Record<MemoryAddressField, string> = {
  addressLine1: "address_line_1",
  addressLine2: "address_line_2",
  city: "city",
  state: "state",
  postalCode: "postal_code",
  country: "country",
};

const OPERATOR_ADDRESS_PROVENANCE_FIELD_MAP: Record<
  MemoryAddressField,
  OperatorProfileFieldKey
> = {
  addressLine1: "address_line1",
  addressLine2: "address_line2",
  city: "city",
  state: "state",
  postalCode: "postal_code",
  country: "country",
};

export async function updateOperatorAddress(input: {
  field: MemoryAddressField;
  value: string;
}): Promise<ActionResult<{ ok: true }>> {
  const op = await resolveOperator();
  if (!op.ok) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: op.message };
  }

  const column = OPERATOR_ADDRESS_COLUMN_MAP[input.field];
  const { data: authData } = await op.admin.auth.admin.getUserById(op.userId);
  const email = authData.user?.email ?? undefined;

  const { data: updatedRow, error } = await op.admin
    .from("profiles")
    .upsert(
      {
        id: op.userId,
        ...(email ? { email } : {}),
        [column]: input.value.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, errorCode: "UPDATE_FAILED", message: error.message };
  }
  if (!updatedRow) {
    return {
      ok: false,
      errorCode: "UPDATE_FAILED",
      message: "Address could not be saved",
    };
  }

  await writeOperatorFieldProvenance({
    workspaceId: op.workspace.id,
    userId: op.userId,
    field: OPERATOR_ADDRESS_PROVENANCE_FIELD_MAP[input.field],
    value: input.value.trim() || null,
  });

  revalidatePath("/me");
  return { ok: true, data: { ok: true } };
}

// ─── Goals ────────────────────────────────────────────────────────────────
export async function createOperatorGoal(input: {
  goalType: OperatorGoalType;
  // Structured goal fields
  targetValue?: number;
  targetUnit?: OperatorGoalUnit;
  targetPeriod?: string;
  // Custom goal fields
  title?: string;
  detail?: string;
  horizon?: OperatorGoalHorizon;
  progress?: number;
}): Promise<ActionResult<{ id: string }>> {
  const op = await resolveOperator();
  if (!op.ok) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: op.message };
  }

  const goalType = input.goalType ?? "custom";
  const isCustom = goalType === "custom";

  // Custom goals need a title; structured goals generate one
  const title = isCustom
    ? input.title?.trim() ?? ""
    : generateGoalTitle(goalType, input.targetValue, input.targetPeriod);

  if (isCustom && !title) {
    return { ok: false, errorCode: "INVALID", message: "A goal needs a title" };
  }

  if (!isCustom && (input.targetValue === undefined || input.targetValue <= 0)) {
    return { ok: false, errorCode: "INVALID", message: "A goal needs a target value" };
  }

  const { data, error } = await op.admin
    .from("operator_goals")
    .insert({
      workspace_id: op.workspace.id,
      user_id: op.userId,
      goal_type: goalType,
      target_value: input.targetValue ?? null,
      target_unit: input.targetUnit ?? null,
      target_period: input.targetPeriod ?? null,
      current_value: 0,
      ai_progress: {},
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

function generateGoalTitle(
  goalType: OperatorGoalType,
  targetValue?: number,
  targetPeriod?: string,
): string {
  const formatted = targetValue?.toLocaleString() ?? "";
  switch (goalType) {
    case "revenue_target":
      return targetPeriod ? `$${formatted} in ${targetPeriod}` : `$${formatted} revenue`;
    case "new_clients":
      return targetPeriod
        ? `${formatted} new clients in ${targetPeriod}`
        : `${formatted} new clients`;
    case "project_minimum":
      return `Only projects $${formatted}+`;
    case "work_hours":
      return `${formatted} hours/week max`;
    default:
      return "";
  }
}

export async function updateOperatorGoal(input: {
  id: string;
  // Structured goal fields
  targetValue?: number;
  targetPeriod?: string;
  currentValue?: number;
  // Custom goal fields
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

  const patch: TablesUpdate<"operator_goals"> = {};
  if (input.targetValue !== undefined) patch.target_value = input.targetValue;
  if (input.targetPeriod !== undefined) patch.target_period = input.targetPeriod;
  if (input.currentValue !== undefined) patch.current_value = input.currentValue;
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

  const row: TablesInsert<"operator_voice_profile"> = {
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
