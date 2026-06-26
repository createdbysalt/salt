"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import { bridgeOverviewConfigSchema } from "@/app/_lib/spaces/overview-config";
import type { BridgeOverviewConfig } from "@/app/_lib/spaces/types";

export async function updateBridgeOverviewConfig(
  clientId: string,
  config: BridgeOverviewConfig
) {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    // Validate config with Zod
    const validatedConfig = bridgeOverviewConfigSchema.parse(config);

    // Verify client belongs to this workspace.
    const { data: client } = await supabase
      .from("clients")
      .select("id, settings")
      .eq("id", clientId)
      .eq("workspace_id", workspace.id)
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
    revalidatePath(`/people/${clientId}`);
    revalidatePath(`/people/${clientId}/table`);
    revalidatePath("/table"); // Client-side path

    return { success: true };
  } catch (error: any) {
    console.error("Error in updateBridgeOverviewConfig:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

