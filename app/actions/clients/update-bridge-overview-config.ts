"use server";

import { createClient } from "@/libs/supabase/server";
import { getTenantContext } from "@/libs/tenancy";
import { requireStudioMember } from "@/libs/tenancy/guards";
import { revalidatePath } from "next/cache";
import { bridgeOverviewConfigSchema } from "@/libs/bridge/overview-config";
import type { BridgeOverviewConfig } from "@/types/bridge-overview";

export async function updateBridgeOverviewConfig(
  clientId: string,
  config: BridgeOverviewConfig
) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Validate config with Zod
    const validatedConfig = bridgeOverviewConfigSchema.parse(config);

    // Verify client belongs to this studio
    const { data: client } = await supabase
      .from("clients")
      .select("id, settings")
      .eq("id", clientId)
      .eq("studio_id", studio.id)
      .single();

    if (!client) {
      return { success: false, error: "Client not found" };
    }

    // Update only the nested path in settings (do not clobber other client settings)
    const existingSettings =
      client.settings && typeof client.settings === "object" ? client.settings : {};
    const existingBridge =
      existingSettings.bridge && typeof existingSettings.bridge === "object"
        ? existingSettings.bridge
        : {};

    const nextSettings = {
      ...existingSettings,
      bridge: {
        ...existingBridge,
        overview: validatedConfig,
      },
    };

    const { error: updateError } = await supabase
      .from("clients")
      .update({
        settings: nextSettings,
      })
      .eq("id", clientId);

    if (updateError) {
      console.error("Error updating Bridge config:", updateError);
      return { success: false, error: "Failed to update configuration" };
    }

    // Revalidate paths
    revalidatePath(`/dashboard/clients/${clientId}`);
    revalidatePath(`/dashboard/clients/${clientId}/bridge`);
    revalidatePath("/bridge"); // Client-side path

    return { success: true };
  } catch (error: any) {
    console.error("Error in updateBridgeOverviewConfig:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

