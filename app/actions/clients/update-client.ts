"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateClientSchema = z.object({
  client_id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  company_name: z.string().max(255).optional(),
  contact_name: z.string().max(255).optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_phone: z.string().max(50).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  notes: z.string().max(10000).optional(),
});

export async function updateClient(data: z.infer<typeof updateClientSchema>) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Validate input
    const validatedData = updateClientSchema.parse(data);
    const { client_id, ...updates } = validatedData;

    // Verify client belongs to this studio
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", client_id)
      .eq("studio_id", studio.id)
      .single();

    if (!client) {
      return { error: "Client not found" };
    }

    // Update client
    const { error: updateError } = await supabase
      .from("clients")
      .update(updates)
      .eq("id", client_id);

    if (updateError) {
      console.error("Error updating client:", updateError);
      return { error: "Failed to update client" };
    }

    revalidatePath("/studio/clients");
    revalidatePath(`/studio/clients/${client_id}`);

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Update a client's lifecycle stage
 * Used by the Pipeline/Board view for drag-and-drop
 */
const lifecycleStages = [
  "lead",
  "discovery",
  "pitch",
  "active",
  "complete",
  "on_hold",
  "lost",
] as const;

type LifecycleStage = (typeof lifecycleStages)[number];

export async function updateClientLifecycleStage(
  clientId: string,
  stage: LifecycleStage
): Promise<{ success: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Validate stage
    if (!lifecycleStages.includes(stage)) {
      return { success: false, error: "Invalid lifecycle stage" };
    }

    // Verify client belongs to this studio
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .eq("studio_id", studio.id)
      .single();

    if (!client) {
      return { success: false, error: "Client not found" };
    }

    // Update lifecycle stage and reset the stage entry timestamp
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        lifecycle_stage: stage,
        stage_entered_at: new Date().toISOString(),
      })
      .eq("id", clientId);

    if (updateError) {
      console.error("Error updating client lifecycle stage:", updateError);
      return { success: false, error: "Failed to update client stage" };
    }

    revalidatePath("/studio/clients");
    revalidatePath(`/studio/clients/${clientId}`);
    revalidatePath("/studio/pipeline");
    revalidatePath("/studio/work/pipeline");

    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

