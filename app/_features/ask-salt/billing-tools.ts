import "server-only";

import { z } from "zod";
import { tool, type ToolSet } from "ai";
import { createAdminClient } from "@/app/_lib/supabase/admin";
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
  partyType: z
    .enum(["organization", "person"])
    .describe("Is the customer/vendor an organization (company) or a person (individual)?"),
  partyName: z.string().min(1).max(160).describe("Name of the organization or person."),
  description: z.string().min(1).max(300).describe("Plain-English description for the billing record."),
  workName: z
    .string()
    .max(160)
    .optional()
    .describe("Name of the work/project to link this billing record to. If omitted and the party has exactly one active project, it will auto-link."),
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

async function findPartyByName(
  workspaceId: string,
  partyType: "organization" | "person",
  name: string
): Promise<{ id: string; name: string } | null> {
  const admin = createAdminClient();

  if (partyType === "organization") {
    const { data } = await admin
      .from("organizations")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .ilike("name", `%${name}%`)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    return data ? { id: data.id, name: data.name as string } : null;
  } else {
    const { data } = await admin
      .from("people")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .ilike("name", `%${name}%`)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    return data ? { id: data.id, name: data.name as string } : null;
  }
}

async function findWorkByName(
  workspaceId: string,
  name: string
): Promise<{ id: string; name: string } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("work")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .ilike("name", `%${name}%`)
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();
  return data ? { id: data.id, name: data.name as string } : null;
}

async function findSingleActiveWorkForParty(
  workspaceId: string,
  partyType: "organization" | "person",
  partyId: string
): Promise<{ id: string; name: string } | null> {
  const admin = createAdminClient();

  const column = partyType === "organization" ? "organization_id" : "person_id";
  const { data: workItems } = await admin
    .from("work")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .eq(column, partyId)
    .eq("status", "active")
    .is("archived_at", null)
    .limit(2);

  if (workItems && workItems.length === 1) {
    return { id: workItems[0].id, name: workItems[0].name as string };
  }
  return null;
}

export function buildBillingTools(options: BuildBillingToolsOptions): ToolSet {
  const { workspaceId, userId } = options;

  const addBillingRecord = tool({
    description:
      "Draft a Billing Memory record from the conversation. This previews a manual invoice or payable for user confirmation; it does not silently save or send anything. The party must be either an organization OR a person (not both).",
    inputSchema: AddBillingRecordToolSchema,
    execute: async (input) => {
      const dueAt = input.dueAt ?? defaultDueAt();
      const isReceipt = input.recordKind === "receipt";
      const number =
        input.number ??
        `${input.direction === "receivable" ? "INV" : "BILL"}-${new Date().getFullYear()}-${String(
          Math.floor(Math.random() * 9000) + 1000,
        )}`;

      // Resolve party (org or person)
      const party = await findPartyByName(workspaceId, input.partyType, input.partyName);
      const partyId = party?.id ?? "pending";
      const partyDisplayName = party?.name ?? input.partyName;

      // Resolve work - explicit name first, then auto-link if party has exactly 1 active work
      let work: { id: string; title: string } | undefined;
      if (input.workName) {
        const foundWork = await findWorkByName(workspaceId, input.workName);
        if (foundWork) {
          work = { id: foundWork.id, title: foundWork.name };
        }
      } else if (party) {
        const autoWork = await findSingleActiveWorkForParty(workspaceId, input.partyType, party.id);
        if (autoWork) {
          work = { id: autoWork.id, title: autoWork.name };
        }
      }

      // Build draft based on party type
      const draft: Record<string, unknown> = {
        direction: input.direction,
        number,
        amountCents: input.amountCents,
        currency: input.currency.toUpperCase(),
        status: isReceipt ? "paid" : "draft",
        dueAt,
        ...(isReceipt ? { paidAt: new Date().toISOString() } : {}),
        lineItems: [{ description: input.description, amountCents: input.amountCents }],
        tags: isReceipt ? ["ask-salt", "receipt", "paid"] : ["ask-salt", "draft"],
        extraction: {
          confidence: 88,
          needsReview: input.dueAt ? [] : ["dueAt"],
          sourceDocId: "ask-salt",
        },
      };

      // Set org OR person (not both)
      if (input.partyType === "organization") {
        draft.org = { id: partyId, name: partyDisplayName };
        if (input.direction === "payable") {
          draft.vendorLabel = partyDisplayName;
          draft.category = input.category ?? "other";
        }
      } else {
        // Person - use billTo for receivables, payTo for payables
        const personEntry = { kind: "person", id: partyId, name: partyDisplayName };
        if (input.direction === "receivable") {
          draft.billTo = personEntry;
        } else {
          draft.payTo = personEntry;
          draft.vendorLabel = partyDisplayName;
          draft.category = input.category ?? "other";
        }
      }

      // Set work if found
      if (work) {
        draft.work = work;
      }

      void logToolExecution({
        workspaceId,
        toolSlug: "add_billing_record",
        risk: "mutating",
        source: "ask_salt",
        status: "success",
        userId: userId ?? null,
        approvedBy: null,
        args: {
          direction: input.direction,
          number,
          amountCents: input.amountCents,
          partyType: input.partyType,
          partyResolved: !!party,
          workResolved: !!work,
        },
      });

      const workInfo = work ? ` Linked to project "${work.title}".` : "";
      const partyInfo = party
        ? `Found ${input.partyType} "${partyDisplayName}" in Memory.`
        : `"${input.partyName}" not found in Memory — will be added as pending.`;

      return {
        drafted: true as const,
        draft,
        partyResolved: !!party,
        workResolved: !!work,
        message:
          `Draft ready in chat. ${partyInfo}${workInfo} The user can tap Add to Billing Memory on the card, or expand Edit before adding if they want to tweak fields.`,
      };
    },
  });

  return { add_billing_record: addBillingRecord };
}
