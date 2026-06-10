"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ============================================================================
// Schema
// ============================================================================

const DismissSeoAlertSchema = z.object({
  alertId: z.string().uuid("Invalid alert ID"),
});

export type DismissSeoAlertInput = z.infer<typeof DismissSeoAlertSchema>;

// ============================================================================
// Types
// ============================================================================

export type DismissSeoAlertResponse =
  | { ok: true; data: { dismissed: boolean } }
  | { ok: false; errorCode: string; message: string };

// ============================================================================
// Action
// ============================================================================

/**
 * Dismisses an SEO alert by marking it as dismissed.
 * Only the studio that owns the alert can dismiss it.
 */
export async function dismissSeoAlert(
  input: unknown
): Promise<DismissSeoAlertResponse> {
  try {
    // Validate input
    const parseResult = DismissSeoAlertSchema.safeParse(input);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return {
        ok: false,
        errorCode: "VALIDATION_ERROR",
        message: firstError.message,
      };
    }
    const { alertId } = parseResult.data;

    // Get tenant context and verify authorization
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);

    // Create Supabase client (uses RLS)
    const supabase = await createClient();

    // Get user ID for tracking who dismissed the alert
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Update the alert - RLS ensures studio ownership
    const { data: alert, error } = await supabase
      .from("seo_alerts")
      .update({
        is_dismissed: true,
        dismissed_at: new Date().toISOString(),
        dismissed_by: userId,
      })
      .eq("id", alertId)
      .eq("studio_id", workspace.id)
      .select("id, project_id")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          ok: false,
          errorCode: "NOT_FOUND",
          message: "Alert not found",
        };
      }
      console.error("Error dismissing SEO alert:", error);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to dismiss alert",
      };
    }

    // Revalidate relevant paths
    revalidatePath("/strategy/seo");
    if (alert?.project_id) {
      revalidatePath("/work");
    }

    return {
      ok: true,
      data: { dismissed: true },
    };
  } catch (error) {
    console.error("Error in dismissSeoAlert:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
