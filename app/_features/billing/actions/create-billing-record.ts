"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import {
  BillingRecordDraftSchema,
  type BillingRecordDraft,
  type CreateBillingRecordResult,
} from "./billing-record-draft";
import {
  buildManualBillingSourceExternalId,
  draftToInsertRow,
} from "../utils/db-mapper";
import { error, success, type ActionResponse } from "./schemas";

async function findExistingManualBillingRecord(
  supabase: Awaited<ReturnType<typeof getWorkspaceContext>>["supabase"],
  workspaceId: string,
  draft: BillingRecordDraft,
) {
  const sourceExternalId = buildManualBillingSourceExternalId(draft);
  const { data } = await supabase
    .from("billing_records")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("source_external_id", sourceExternalId)
    .maybeSingle();

  return data;
}

export async function createBillingRecordAction(
  input: BillingRecordDraft,
): Promise<ActionResponse<CreateBillingRecordResult>> {
  try {
    const { workspace, supabase, userId } = await getWorkspaceContext();
    const draft = BillingRecordDraftSchema.parse(input);

    const existing = await findExistingManualBillingRecord(supabase, workspace.id, draft);
    if (existing) {
      return success({
        id: existing.id,
        href: `/billing/${existing.id}`,
        alreadyExists: true,
      });
    }

    const insertRow = draftToInsertRow({ workspaceId: workspace.id, userId, draft });

    const { data, error: insertError } = await supabase
      .from("billing_records")
      .insert(insertRow)
      .select("id")
      .single();

    if (insertError || !data) {
      if (insertError?.code === "23505") {
        const duplicate = await findExistingManualBillingRecord(supabase, workspace.id, draft);
        if (duplicate) {
          return success({
            id: duplicate.id,
            href: `/billing/${duplicate.id}`,
            alreadyExists: true,
          });
        }
        return error(
          "CREATE_BILLING_RECORD_FAILED",
          "This invoice is already in Billing Memory.",
        );
      }

      console.error("Error creating billing record:", insertError);
      return error("CREATE_BILLING_RECORD_FAILED", insertError?.message ?? "Could not create billing record");
    }

    revalidatePath("/billing");
    revalidatePath(`/billing/${data.id}`);

    return success({ id: data.id, href: `/billing/${data.id}` });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error("VALIDATION_ERROR", err.errors[0]?.message ?? "Invalid billing record");
    }
    if (err instanceof Error) {
      return error("CREATE_BILLING_RECORD_FAILED", err.message);
    }
    return error("CREATE_BILLING_RECORD_FAILED", "Could not create billing record");
  }
}
