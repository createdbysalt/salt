"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";

const CreateVoiceSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(50),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  tone: z.string().min(1).max(200),
  instructions: z.string().min(1).max(2000),
  sign_off: z.string().max(100).optional(),
});

const UpdateVoiceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50).optional(),
  tone: z.string().min(1).max(200).optional(),
  instructions: z.string().min(1).max(2000).optional(),
  sign_off: z.string().max(100).nullable().optional(),
});

export async function createVoice(input: z.infer<typeof CreateVoiceSchema>) {
  const data = CreateVoiceSchema.parse(input);

  const { context } = await getTenantContext();
  if (!context) {
    return { success: false, error: "Unauthorized" };
  }

  const slug = data.slug ?? data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("user_voices")
    .select("id")
    .eq("workspace_id", data.workspaceId)
    .eq("slug", slug)
    .single();

  if (existing) {
    return { success: false, error: "A voice with this slug already exists" };
  }

  const { data: voice, error } = await supabase
    .from("user_voices")
    .insert({
      workspace_id: data.workspaceId,
      slug,
      name: data.name,
      tone: data.tone,
      instructions: data.instructions,
      sign_off: data.sign_off ?? null,
      type: "custom",
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create voice:", error);
    return { success: false, error: "Failed to create voice" };
  }

  revalidatePath("/me");
  return { success: true, voice };
}

export async function updateVoice(input: z.infer<typeof UpdateVoiceSchema>) {
  const data = UpdateVoiceSchema.parse(input);

  const { context } = await getTenantContext();
  if (!context) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("user_voices")
    .select("type")
    .eq("id", data.id)
    .single();

  if (!existing) {
    return { success: false, error: "Voice not found" };
  }

  if (existing.type === "salt") {
    return { success: false, error: "Cannot modify Salt-provided voices" };
  }

  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.tone !== undefined) updates.tone = data.tone;
  if (data.instructions !== undefined) updates.instructions = data.instructions;
  if (data.sign_off !== undefined) updates.sign_off = data.sign_off;

  const { data: voice, error } = await supabase
    .from("user_voices")
    .update(updates)
    .eq("id", data.id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update voice:", error);
    return { success: false, error: "Failed to update voice" };
  }

  revalidatePath("/me");
  return { success: true, voice };
}

export async function deleteVoice(id: string) {
  const { context } = await getTenantContext();
  if (!context) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("user_voices")
    .select("type")
    .eq("id", id)
    .single();

  if (!existing) {
    return { success: false, error: "Voice not found" };
  }

  if (existing.type === "salt") {
    return { success: false, error: "Cannot delete Salt-provided voices" };
  }

  const { error } = await supabase
    .from("user_voices")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete voice:", error);
    return { success: false, error: "Failed to delete voice" };
  }

  revalidatePath("/me");
  return { success: true };
}
