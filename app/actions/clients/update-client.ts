"use server";

import { createClient } from "@/libs/supabase/server";
import { getTenantContext } from "@/libs/tenancy";
import { requireStudioMember } from "@/libs/tenancy/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateClientSchema = z.object({
  client_id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  contact_name: z.string().max(255).optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_phone: z.string().max(50).optional(),
  status: z.enum(["active", "inactive"]).optional(),
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

    revalidatePath("/dashboard/clients");
    revalidatePath(`/dashboard/clients/${client_id}`);

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

