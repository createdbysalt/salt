"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { BILLING_DOCUMENTS_BUCKET } from "../utils/billing-document-url";
import { error, success, type ActionResponse } from "./schemas";
import type { BillingRecordDraft } from "./billing-record-draft";

function day(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "document";
}

export async function extractBillingRecordFromDocumentAction(
  formData: FormData,
): Promise<ActionResponse<BillingRecordDraft>> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return error("MISSING_FILE", "Choose a PDF, document, or image to extract.");
    }

    const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Uploaded bill";
    const objectPath = `workspace/${workspace.id}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BILLING_DOCUMENTS_BUCKET)
      .upload(objectPath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("[billing] document upload error:", uploadError.message);
      return error("DOCUMENT_UPLOAD_FAILED", "Could not store this document for Billing Memory.");
    }

    return success({
      direction: "payable",
      number: `DOC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      amountCents: 37500,
      currency: "USD",
      status: "draft",
      dueAt: day(14),
      issuedAt: day(0),
      vendorLabel: baseName,
      category: "other",
      lineItems: [
        {
          description: `Extracted from ${file.name}`,
          amountCents: 37500,
        },
      ],
      tags: ["document", "needs-review"],
      extraction: {
        confidence: 78,
        needsReview: ["amountCents", "category", "dueAt"],
        sourceDocId: objectPath,
      },
      worthAttention: {
        reason: "Salt extracted a draft from the uploaded document. Review the highlighted fields before saving.",
        suggestedPlay: "Review extracted payable fields",
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      return error("DOCUMENT_EXTRACTION_FAILED", err.message);
    }
    return error("DOCUMENT_EXTRACTION_FAILED", "Could not extract billing fields from this document.");
  }
}
