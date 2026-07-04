"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import { BILLING_DOCUMENTS_BUCKET } from "../utils/billing-document-url";
import { extractLineItemsFromDocument } from "../utils/extract-line-items";
import { error, success, type ActionResponse } from "./schemas";
import type { BillingRecordDraft } from "./billing-record-draft";
import { CURRENCIES, type Currency } from "@/app/_features/memory/taxonomy/registry";

function normalizeCurrency(value: string | undefined): Currency {
  const upper = value?.trim().toUpperCase();
  return (CURRENCIES as readonly string[]).includes(upper ?? "")
    ? (upper as Currency)
    : "USD";
}

function day(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

function parseIsoDate(dateStr: string | undefined, fallback: string): string {
  if (!dateStr) return fallback;
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString();
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "document";
}

const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
];

export async function extractBillingRecordFromDocumentAction(
  formData: FormData,
): Promise<ActionResponse<BillingRecordDraft>> {
  try {
    const { workspace, userId } = await getWorkspaceContext();
    const supabase = await createClient();

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return error("MISSING_FILE", "Choose a PDF, document, or image to extract.");
    }

    const mimeType = file.type || "application/octet-stream";
    if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
      return error(
        "UNSUPPORTED_FILE_TYPE",
        "Upload a PDF or image (PNG, JPG, WebP) of the invoice.",
      );
    }

    const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Uploaded bill";
    const objectPath = `workspace/${workspace.id}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BILLING_DOCUMENTS_BUCKET)
      .upload(objectPath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[billing] document upload error:", uploadError.message);
      return error("DOCUMENT_UPLOAD_FAILED", "Could not store this document for Billing Memory.");
    }

    const extraction = await extractLineItemsFromDocument(buffer, mimeType, userId);

    if (!extraction) {
      return success({
        direction: "payable",
        number: `DOC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        amountCents: 0,
        currency: "USD",
        status: "draft",
        dueAt: day(14),
        issuedAt: day(0),
        vendorLabel: baseName,
        category: "other",
        lineItems: [{ description: "Could not extract — enter manually", amountCents: 0 }],
        tags: ["document", "needs-review", "extraction-failed"],
        extraction: {
          confidence: 0,
          needsReview: ["amountCents", "lineItems", "vendorLabel", "dueAt"],
          sourceDocId: objectPath,
        },
        worthAttention: {
          reason: "Salt couldn't read this document. Please enter the billing details manually.",
          suggestedPlay: "Enter billing details",
        },
      });
    }

    const needsReview: string[] = [];
    if (extraction.confidence < 90) needsReview.push("amountCents");
    if (!extraction.vendorName) needsReview.push("vendorLabel");
    if (!extraction.dueDate) needsReview.push("dueAt");
    if (!extraction.invoiceNumber) needsReview.push("number");

    return success({
      direction: "payable",
      number: extraction.invoiceNumber ?? `DOC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      amountCents: extraction.totalAmountCents,
      currency: normalizeCurrency(extraction.currency),
      status: "draft",
      dueAt: parseIsoDate(extraction.dueDate, day(14)),
      issuedAt: parseIsoDate(extraction.issueDate, day(0)),
      vendorLabel: extraction.vendorName ?? baseName,
      category: "other",
      lineItems: extraction.lineItems,
      tags: ["document", ...(extraction.confidence < 80 ? ["needs-review"] : [])],
      extraction: {
        confidence: extraction.confidence,
        needsReview,
        sourceDocId: objectPath,
      },
      worthAttention:
        extraction.confidence >= 90
          ? undefined
          : {
              reason: `Salt extracted this with ${extraction.confidence}% confidence. Review the highlighted fields before saving.`,
              suggestedPlay: "Review extracted payable fields",
            },
    });
  } catch (err) {
    console.error("[billing] extraction error:", err);
    if (err instanceof Error) {
      return error("DOCUMENT_EXTRACTION_FAILED", err.message);
    }
    return error("DOCUMENT_EXTRACTION_FAILED", "Could not extract billing fields from this document.");
  }
}
