import { z } from "zod";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  sendLlm,
  backgroundSpend,
  type LlmContentPart,
} from "@/app/_lib/ai/gpt";
import { memoryUpdateField } from "@/app/_lib/memory-tools";
import { getFieldsForEntity } from "@/app/_features/memory/taxonomy/field-registry";
import {
  FILE_CATEGORY_VALUES,
  FILE_DOCUMENT_TYPE_VALUES,
} from "@/app/_features/memory/taxonomy/registry";

const CATEGORY_SLUGS = new Set(FILE_CATEGORY_VALUES.map((v) => v.slug));
const DOCUMENT_TYPE_SLUGS = new Set(FILE_DOCUMENT_TYPE_VALUES.map((v) => v.slug));
const MAX_TEXT_CHARS = 12_000;
const MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024;

const ContentAnalysisSchema = z.object({
  category: z.string().nullish(),
  documentType: z.string().nullish(),
  description: z.string().max(500).nullish(),
  totalAmountCents: z.number().int().nonnegative().nullish(),
  currency: z.string().length(3).nullish(),
  dueDate: z.string().nullish(),
  expiryDate: z.string().nullish(),
  followUpDate: z.string().nullish(),
});

type ContentAnalysis = z.infer<typeof ContentAnalysisSchema>;

const ANALYSIS_PROMPT = `You are analyzing a business document for a solo professional's workspace.
Return ONLY valid JSON with this exact structure:
{
  "category": "invoice",
  "documentType": "invoice",
  "description": "One sentence a busy owner would skim.",
  "totalAmountCents": 150000,
  "currency": "USD",
  "dueDate": "2026-09-01",
  "expiryDate": null,
  "followUpDate": null
}

Rules:
- category: exactly one of ${[...CATEGORY_SLUGS].join(", ")}. Use "other" only when nothing fits.
- documentType: exactly one of ${[...DOCUMENT_TYPE_SLUGS].join(", ")}, or null for non-documents (images, media, spreadsheets of data).
- description: what this document is, one sentence, plain language. null if unclear.
- totalAmountCents: the document's total in cents ($1,500.00 → 150000). null when no amount is stated.
- currency: 3-letter ISO code, only when an amount is present.
- dueDate: payment or delivery deadline. expiryDate: when the document stops being valid. followUpDate: when someone should next act on it. ISO YYYY-MM-DD or null when not stated.`;

interface ResourceRow {
  id: string;
  file_name: string;
  file_type: string | null;
  mime_type: string | null;
  bucket_id: string | null;
  object_path: string | null;
  category: string | null;
  document_type: string | null;
  description: string | null;
  total_amount_cents: number | null;
  currency: string | null;
  due_date: string | null;
  expiry_date: string | null;
  follow_up_date: string | null;
  ai_summary: string | null;
  extracted_data: Record<string, unknown> | null;
}

export interface ResourceContentAnalysisResult {
  analyzed: boolean;
  reason?: string;
  written: string[];
}

function isVisionMime(mime: string | null): boolean {
  return !!mime && (mime === "application/pdf" || mime.startsWith("image/"));
}

function isTextMime(mime: string | null): boolean {
  return !!mime && (mime.startsWith("text/") || mime === "application/json");
}

function existingText(row: ResourceRow): string | null {
  const parts: string[] = [];
  if (row.ai_summary) parts.push(`Summary: ${row.ai_summary}`);
  if (row.extracted_data) {
    const { content_analysis: _marker, ...rest } = row.extracted_data;
    const text = JSON.stringify(rest);
    if (text !== "{}") parts.push(`Previously extracted data: ${text}`);
  }
  const combined = parts.join("\n\n").trim();
  return combined.length > 0 ? combined.slice(0, MAX_TEXT_CHARS) : null;
}

async function buildContentParts(
  admin: ReturnType<typeof createAdminClient>,
  row: ResourceRow,
): Promise<LlmContentPart[] | null> {
  if (row.bucket_id && row.object_path && (isVisionMime(row.mime_type) || isTextMime(row.mime_type))) {
    const { data, error } = await admin.storage
      .from(row.bucket_id)
      .download(row.object_path);
    if (!error && data) {
      const buffer = Buffer.from(await data.arrayBuffer());
      if (buffer.byteLength <= MAX_DOWNLOAD_BYTES) {
        if (isVisionMime(row.mime_type)) {
          return [
            { type: "text", text: `${ANALYSIS_PROMPT}\n\nFile name: ${row.file_name}` },
            {
              type: "image_url",
              image_url: {
                url: `data:${row.mime_type};base64,${buffer.toString("base64")}`,
                detail: "high",
              },
            },
          ];
        }
        const text = buffer.toString("utf8").slice(0, MAX_TEXT_CHARS);
        return [
          {
            type: "text",
            text: `${ANALYSIS_PROMPT}\n\nFile name: ${row.file_name}\n\nContent:\n${text}`,
          },
        ];
      }
    }
  }

  const text = existingText(row);
  if (text) {
    return [
      {
        type: "text",
        text: `${ANALYSIS_PROMPT}\n\nFile name: ${row.file_name}\n\n${text}`,
      },
    ];
  }
  return null;
}

function fillRule(fieldKey: string, signal: string) {
  const field = getFieldsForEntity("resource").find((f) => f.key === fieldKey);
  return field?.fillRules?.find((r) => r.signal === signal);
}

export async function analyzeResourceContent(input: {
  workspaceId: string;
  resourceId: string;
  actorUserId?: string;
}): Promise<ResourceContentAnalysisResult> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("resources")
    .select(
      "id, file_name, file_type, mime_type, bucket_id, object_path, category, document_type, description, total_amount_cents, currency, due_date, expiry_date, follow_up_date, ai_summary, extracted_data",
    )
    .eq("id", input.resourceId)
    .eq("workspace_id", input.workspaceId)
    .maybeSingle();
  const row = data as ResourceRow | null;
  if (!row) return { analyzed: false, reason: "not-found", written: [] };

  const marker = row.extracted_data?.content_analysis as
    | { analyzed_at?: string }
    | undefined;
  if (marker?.analyzed_at) {
    return { analyzed: false, reason: "already-analyzed", written: [] };
  }

  const parts = await buildContentParts(admin, row);
  if (!parts) return { analyzed: false, reason: "no-content", written: [] };

  const response = await sendLlm(
    [{ role: "user", content: parts }],
    backgroundSpend(input.workspaceId, input.actorUserId),
    { routingKey: "extraction", maxTokens: 1200, temperature: 0.1 },
  );
  if (!response) return { analyzed: false, reason: "llm-unavailable", written: [] };

  let analysis: ContentAnalysis;
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { analyzed: false, reason: "llm-unparseable", written: [] };
    analysis = ContentAnalysisSchema.parse(JSON.parse(jsonMatch[0]));
  } catch {
    return { analyzed: false, reason: "llm-unparseable", written: [] };
  }

  const written: string[] = [];
  const write = async (input2: {
    fieldKey: string;
    dbColumn: string;
    signal: string;
    value: string | number;
  }) => {
    const rule = fillRule(input2.fieldKey, input2.signal);
    const result = await memoryUpdateField({
      workspaceId: input.workspaceId,
      entityType: "resource",
      entityId: row.id,
      field: input2.dbColumn,
      value: input2.value,
      confidence: rule?.confidence ?? 80,
      because: rule?.because ?? "Read from the document itself",
      source: "enrichment",
      sourceDetails: {
        playbookSlug: "memory-records",
        ruleId: `resource-${input2.fieldKey}-${input2.signal}`,
      },
    });
    if (result.action === "applied") written.push(input2.fieldKey);
  };

  if (
    analysis.category &&
    CATEGORY_SLUGS.has(analysis.category) &&
    (!row.category || row.category === "other") &&
    analysis.category !== "other"
  ) {
    await write({
      fieldKey: "category",
      dbColumn: "category",
      signal: "file_category_inferred",
      value: analysis.category,
    });
  }
  if (
    analysis.documentType &&
    DOCUMENT_TYPE_SLUGS.has(analysis.documentType) &&
    !row.document_type
  ) {
    await write({
      fieldKey: "documentType",
      dbColumn: "document_type",
      signal: "file_document_type_inferred",
      value: analysis.documentType,
    });
  }
  if (analysis.description && !row.description) {
    await write({
      fieldKey: "description",
      dbColumn: "description",
      signal: "file_document_type_inferred",
      value: analysis.description,
    });
  }
  if (analysis.totalAmountCents != null && row.total_amount_cents == null) {
    await write({
      fieldKey: "totalAmountCents",
      dbColumn: "total_amount_cents",
      signal: "file_amount_extracted",
      value: analysis.totalAmountCents,
    });
  }
  if (analysis.currency && !row.currency) {
    await write({
      fieldKey: "currency",
      dbColumn: "currency",
      signal: "file_amount_extracted",
      value: analysis.currency.toUpperCase(),
    });
  }
  const dates: Array<{ key: string; column: string; value: string | null | undefined; current: string | null }> = [
    { key: "dueDate", column: "due_date", value: analysis.dueDate, current: row.due_date },
    { key: "expiryDate", column: "expiry_date", value: analysis.expiryDate, current: row.expiry_date },
    { key: "followUpDate", column: "follow_up_date", value: analysis.followUpDate, current: row.follow_up_date },
  ];
  for (const date of dates) {
    if (date.value && /^\d{4}-\d{2}-\d{2}/.test(date.value) && !date.current) {
      await write({
        fieldKey: date.key,
        dbColumn: date.column,
        signal: "file_date_extracted",
        value: date.value,
      });
    }
  }

  await admin
    .from("resources")
    .update({
      extracted_data: {
        ...(row.extracted_data ?? {}),
        content_analysis: { analyzed_at: new Date().toISOString() },
      },
    })
    .eq("id", row.id)
    .eq("workspace_id", input.workspaceId);

  return { analyzed: true, written };
}
