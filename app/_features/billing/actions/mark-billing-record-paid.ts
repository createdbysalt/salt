"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import { error, success, type ActionResponse } from "./schemas";

const MarkBillingRecordPaidSchema = z.object({
  recordId: z.string().uuid(),
});

export type MarkBillingRecordPaidResult = {
  id: string;
};

export async function markBillingRecordPaidAction(
  recordId: string,
): Promise<ActionResponse<MarkBillingRecordPaidResult>> {
  try {
    const parsed = MarkBillingRecordPaidSchema.parse({ recordId });
    const { workspace, supabase } = await getWorkspaceContext();
    const now = new Date().toISOString();

    const { data: record, error: fetchError } = await supabase
      .from("billing_records")
      .select("id, amount_cents, status")
      .eq("id", parsed.recordId)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (fetchError || !record) {
      return error("BILLING_RECORD_NOT_FOUND", "Billing record not found");
    }

    if (record.status === "paid" || record.status === "refunded") {
      return success({ id: record.id as string });
    }

    const { error: updateError } = await supabase
      .from("billing_records")
      .update({
        status: "paid",
        amount_paid_cents: record.amount_cents,
        paid_at: now,
        worth_attention: null,
      })
      .eq("id", parsed.recordId)
      .eq("workspace_id", workspace.id);

    if (updateError) {
      console.error("Error marking billing record paid:", updateError);
      return error("MARK_BILLING_RECORD_PAID_FAILED", "Could not update payment status");
    }

    revalidatePath("/billing");
    revalidatePath(`/billing/${parsed.recordId}`);

    return success({ id: parsed.recordId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error("VALIDATION_ERROR", err.errors[0]?.message ?? "Invalid billing record");
    }
    if (err instanceof Error) {
      return error("MARK_BILLING_RECORD_PAID_FAILED", err.message);
    }
    return error("MARK_BILLING_RECORD_PAID_FAILED", "Could not update payment status");
  }
}
