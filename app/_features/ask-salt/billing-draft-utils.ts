import {
  BillingRecordDraftSchema,
  type BillingRecordDraft,
} from "@/app/_features/billing/actions/billing-record-draft";

type ToolLikePart = {
  type: string;
  state?: string;
  toolName?: string;
  output?: unknown;
};

function toolPartName(part: ToolLikePart): string {
  if (part.toolName) return part.toolName;
  if (part.type.startsWith("tool-")) return part.type.slice(5);
  return "tool";
}

function parseBillingDraft(value: unknown): BillingRecordDraft | null {
  const parsed = BillingRecordDraftSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function extractBillingDraftFromToolOutput(output: unknown): BillingRecordDraft | null {
  if (!output || typeof output !== "object" || Array.isArray(output)) return null;
  const record = output as { drafted?: unknown; draft?: unknown };
  if (record.drafted !== true || !record.draft) return null;
  return parseBillingDraft(record.draft);
}

export function extractBillingDraftsFromToolParts(parts: ToolLikePart[]): BillingRecordDraft[] {
  return parts.flatMap((part) => {
    if (toolPartName(part) !== "add_billing_record") return [];
    if (part.state !== "output-available") return [];
    const draft = extractBillingDraftFromToolOutput(part.output);
    return draft ? [draft] : [];
  });
}
