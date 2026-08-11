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
import { emitEntitySignal } from "@/app/_lib/learning";
import { attachArtifactToEntity } from "@/app/_features/resources/actions/attach-artifact";
import {
  BILLING_DOCUMENTS_BUCKET,
  resolveBillingDocumentStoragePath,
} from "../utils/billing-document-url";

/**
 * Sentinel sourceDocIds mark drafts that never touched storage ("manual",
 * "ask-salt"). Anything else is a real billing-documents object path whose
 * PDF/image becomes a file Resource attached to the record.
 */
function isStorageSourceDocId(sourceDocId: string | undefined): sourceDocId is string {
  if (!sourceDocId?.trim()) return false;
  return !["manual", "ask-salt"].includes(sourceDocId.trim());
}

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

    emitEntitySignal({
      workspaceId: workspace.id,
      surface: "billing",
      entityId: data.id,
      signal: "billing_created",
      entityLabel: draft.number ?? "New billing record",
      evidence: {
        source: "manual_create",
        direction: draft.direction,
        amount_cents: draft.amountCents,
        currency: draft.currency,
      },
    });

    // Artifact-first: the uploaded invoice PDF/image becomes a file Resource
    // attached to the record. Failure never blocks the save — the record
    // already carries extraction.sourceDocId as the lightweight fallback.
    const sourceDocId = draft.extraction?.sourceDocId;
    if (isStorageSourceDocId(sourceDocId)) {
      const objectPath = resolveBillingDocumentStoragePath(sourceDocId);
      const fileName = objectPath.split("/").pop() ?? "invoice.pdf";
      const artifact = await attachArtifactToEntity(supabase, {
        workspaceId: workspace.id,
        targetType: "billing",
        targetId: data.id,
        file: {
          bucketId: BILLING_DOCUMENTS_BUCKET,
          objectPath,
          fileName,
          mimeType: "application/pdf",
        },
        displayName: draft.number ? `Invoice ${draft.number}` : fileName,
        source: "manual",
        category: "invoice",
        confidence: draft.extraction?.confidence,
        because: "Uploaded invoice document",
        actingUserId: userId,
      });
      if (!artifact.success) {
        console.error("billing document artifact attach failed:", artifact.error);
      }
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
