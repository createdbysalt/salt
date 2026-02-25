"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const lifecycleStageSchema = z.enum([
  "lead",
  "discovery",
  "pitch",
  "active",
  "complete",
  "on_hold",
  "lost",
]);

/**
 * Move a client to a new lifecycle stage
 */
export async function moveClientToStage(
  clientId: string,
  newStage: z.infer<typeof lifecycleStageSchema>
) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Validate stage
    const validatedStage = lifecycleStageSchema.parse(newStage);

    // Get the highest order index in the new stage
    const { data: existingClients } = await supabase
      .from("clients")
      .select("stage_order_index")
      .eq("studio_id", studio.id)
      .eq("lifecycle_stage", validatedStage)
      .order("stage_order_index", { ascending: false })
      .limit(1);

    const newOrderIndex =
      existingClients && existingClients.length > 0
        ? (existingClients[0].stage_order_index || 0) + 1
        : 0;

    // Update the client
    const { error } = await supabase
      .from("clients")
      .update({
        lifecycle_stage: validatedStage,
        stage_order_index: newOrderIndex,
        updated_at: new Date().toISOString(),
      })
      .eq("id", clientId)
      .eq("studio_id", studio.id);

    if (error) {
      console.error("Error moving client:", error);
      return { success: false, error: "Failed to move client" };
    }

    revalidatePath("/studio/pipeline");
    revalidatePath("/studio/clients");

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid stage" };
    }
    console.error("Unexpected error in moveClientToStage:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Reorder clients within a stage
 */
export async function reorderClientsInStage(
  stage: z.infer<typeof lifecycleStageSchema>,
  clientIds: string[]
) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Validate stage
    lifecycleStageSchema.parse(stage);

    // Validate clientIds
    if (!clientIds || clientIds.length === 0) {
      return { success: false, error: "No clients to reorder" };
    }

    // Update each client's order index
    const updates = clientIds.map((clientId, index) =>
      supabase
        .from("clients")
        .update({
          stage_order_index: index,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId)
        .eq("studio_id", studio.id)
        .eq("lifecycle_stage", stage)
    );

    const results = await Promise.all(updates);

    // Check for errors
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error("Errors reordering clients:", errors);
      return { success: false, error: "Failed to reorder some clients" };
    }

    revalidatePath("/studio/pipeline");

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid stage" };
    }
    console.error("Unexpected error in reorderClientsInStage:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Archive a client (move to lost stage)
 */
export async function archiveClient(clientId: string) {
  return moveClientToStage(clientId, "lost");
}
