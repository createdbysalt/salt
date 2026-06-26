import "server-only";

import { z } from "zod";
import { tool, type ToolSet } from "ai";
import { logToolExecution } from "@/app/_lib/composio/execution-log";

export interface BuildBillingToolsOptions {
  workspaceId: string;
  userId?: string;
}

const AddBillingRecordToolSchema = z.object({
  direction: z
    .enum(["receivable", "payable"])
    .describe("Use receivable for invoices/money coming in; payable for bills/money going out."),
  number: z.string().min(1).max(80).optional().describe("Invoice or bill number if known."),
  amountCents: z.number().int().describe("Amount in cents, always positive for the draft preview."),
  currency: z.string().min(3).max(3).default("USD"),
  dueAt: z.string().datetime().optional().describe("ISO due date if the user gave one."),
  partyName: z.string().min(1).max(160).describe("Customer, vendor, organization, or person name."),
  description: z.string().min(1).max(300).describe("Plain-English description for the billing record."),
  category: z.enum(["contractor", "software", "other"]).optional(),
  recordKind: z
    .enum(["bill", "receipt"])
    .optional()
    .describe("Use receipt when the email confirms payment already happened (subscription receipt, paid invoice)."),
});

function defaultDueAt(): string {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

export function buildBillingTools(options: BuildBillingToolsOptions): ToolSet {
  const { workspaceId, userId } = options;

  const addBillingRecord = tool({
    description:
      "Draft a Billing Memory record from the conversation. This previews a manual invoice or payable for user confirmation; it does not silently save or send anything.",
    inputSchema: AddBillingRecordToolSchema,
    execute: async (input) => {
      const dueAt = input.dueAt ?? defaultDueAt();
      const isReceipt = input.recordKind === "receipt";
      const number =
        input.number ??
        `${input.direction === "receivable" ? "INV" : "BILL"}-${new Date().getFullYear()}-${String(
          Math.floor(Math.random() * 9000) + 1000,
        )}`;

      const draft = {
        direction: input.direction,
        number,
        amountCents: input.amountCents,
        currency: input.currency.toUpperCase(),
        status: isReceipt ? ("paid" as const) : ("draft" as const),
        dueAt,
        ...(isReceipt ? { paidAt: new Date().toISOString() } : {}),
        lineItems: [{ description: input.description, amountCents: input.amountCents }],
        ...(input.direction === "receivable"
          ? { org: { id: "pending", name: input.partyName } }
          : { vendorLabel: input.partyName, category: input.category ?? "other" }),
        tags: isReceipt ? ["ask-salt", "receipt", "paid"] : ["ask-salt", "draft"],
        extraction: {
          confidence: 88,
          needsReview: input.dueAt ? [] : ["dueAt"],
          sourceDocId: "ask-salt",
        },
      };

      void logToolExecution({
        workspaceId,
        toolSlug: "add_billing_record",
        risk: "mutating",
        source: "ask_salt",
        status: "success",
        userId: userId ?? null,
        approvedBy: null,
        args: { direction: input.direction, number, amountCents: input.amountCents },
      });

      return {
        drafted: true as const,
        draft,
        message:
          "Draft ready in chat. The user can tap Add to Billing Memory on the card, or expand Edit before adding if they want to tweak fields.",
      };
    },
  });

  return { add_billing_record: addBillingRecord };
}
