"use server";

import { sendLlm, type LlmContentPart } from "@/app/_lib/ai/gpt";
import { z } from "zod";

const ExtractedLineItemSchema = z.object({
  description: z.string().min(1).max(180),
  amountCents: z.number().int(),
});

const ExtractionResultSchema = z.object({
  lineItems: z.array(ExtractedLineItemSchema).min(1),
  totalAmountCents: z.number().int(),
  vendorName: z.string().optional(),
  invoiceNumber: z.string().optional(),
  dueDate: z.string().optional(),
  issueDate: z.string().optional(),
  currency: z.string().length(3).default("USD"),
  confidence: z.number().int().min(0).max(100),
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

const EXTRACTION_PROMPT = `You are a billing document parser. Extract structured data from this invoice/receipt.

Return ONLY valid JSON with this exact structure:
{
  "lineItems": [{ "description": "Item name or service", "amountCents": 1500 }],
  "totalAmountCents": 1500,
  "vendorName": "Company Name",
  "invoiceNumber": "INV-001",
  "dueDate": "2024-01-15",
  "issueDate": "2024-01-01",
  "currency": "USD",
  "confidence": 85
}

Rules:
- Convert ALL amounts to cents (e.g., $15.00 → 1500, €10.50 → 1050)
- Extract EVERY line item you can see — do not summarize into one item
- If tax/shipping are separate lines, include them as line items
- Dates should be ISO format (YYYY-MM-DD) or omit if unclear
- confidence: 90+ if clear, 70-89 if some fields unclear, <70 if document is poor quality
- If you cannot extract line items, return a single line item with the total amount and description "Total from document"`;

function fileToBase64DataUrl(buffer: Buffer, mimeType: string): string {
  const base64 = buffer.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

export async function extractLineItemsFromDocument(
  fileBuffer: Buffer,
  mimeType: string,
  userId: string,
): Promise<ExtractionResult | null> {
  const dataUrl = fileToBase64DataUrl(fileBuffer, mimeType);

  const content: LlmContentPart[] = [
    { type: "text", text: EXTRACTION_PROMPT },
    { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
  ];

  const response = await sendLlm(
    [{ role: "user", content }],
    userId,
    {
      routingKey: "extraction",
      maxTokens: 2000,
      temperature: 0.1,
    },
  );

  if (!response) {
    console.error("[billing] AI extraction returned null");
    return null;
  }

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[billing] No JSON found in extraction response");
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = ExtractionResultSchema.parse(parsed);
    return validated;
  } catch (err) {
    console.error("[billing] Failed to parse extraction response:", err);
    return null;
  }
}
