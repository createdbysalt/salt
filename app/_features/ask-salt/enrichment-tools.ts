import "server-only";

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { enrichEntity } from "@/app/_lib/composio/enrichment";
import type { EnrichableEntityType } from "@/app/_lib/composio/enrichment/types";

export interface BuildEnrichmentToolsOptions {
  workspaceId: string;
  userId?: string;
}

const enrichEntityInputSchema = z.object({
  entity_type: z
    .enum(["person", "org", "work", "billing", "meeting", "file", "me"])
    .describe("Type of Memory entity to enrich"),
  // Common identifiers
  name: z.string().optional().describe("Name of the entity (person, org, work, meeting)"),
  email: z.string().optional().describe("Email address (primary for person enrichment)"),
  domain: z.string().optional().describe("Domain (e.g., acme.com) for org enrichment"),
  phone: z.string().optional().describe("Phone number if known"),
  // Work/billing
  project_name: z.string().optional().describe("Project or work name"),
  invoice_number: z.string().optional().describe("Invoice or bill number for billing enrichment"),
  amount: z.number().optional().describe("Amount in cents for billing enrichment"),
  // Meeting
  meeting_title: z.string().optional().describe("Meeting title or subject"),
  start_time: z.string().optional().describe("Meeting start time (ISO format)"),
  attendees: z.array(z.string()).optional().describe("Meeting attendee emails"),
  // File
  file_name: z.string().optional().describe("File name for file enrichment"),
  file_url: z.string().optional().describe("URL or path to the file"),
});

type EnrichEntityInput = z.infer<typeof enrichEntityInputSchema>;

export function buildEnrichmentTools(options: BuildEnrichmentToolsOptions): ToolSet {
  const { workspaceId } = options;

  return {
    enrich_entity: tool({
      description: `Scan connected apps (Gmail, Calendar, Stripe, etc.) to gather enrichment data for a person, organization, or work item BEFORE creating or updating it. Returns all found fields with sources. Call this FIRST when adding a new record to find phone, title, organization, billing info, address, relationship signals, and context notes from connected accounts. The user should confirm the enriched data before you write to Memory.`,
      inputSchema: enrichEntityInputSchema,
      execute: async (input: EnrichEntityInput) => {
        console.log("[enrich_entity] Called with:", JSON.stringify(input, null, 2));
        const result = await enrichEntity({
          entityType: input.entity_type as EnrichableEntityType,
          seed: {
            name: input.name,
            email: input.email,
            domain: input.domain,
            phone: input.phone,
            projectName: input.project_name,
            invoiceNumber: input.invoice_number,
            amount: input.amount,
            meetingTitle: input.meeting_title,
            startTime: input.start_time,
            attendees: input.attendees,
            fileName: input.file_name,
            fileUrl: input.file_url,
          },
          workspaceId,
        });

        if (result.sourcesQueried.length === 0) {
          return {
            success: true,
            message: "No connected apps available for enrichment. Proceed with user-provided data.",
            fields: {},
            connections: {},
            notes: [],
            sourcesQueried: [],
            sourcesWithData: [],
          };
        }

        if (result.sourcesWithData.length === 0) {
          return {
            success: true,
            message: `Scanned ${result.sourcesQueried.join(", ")} but found no additional data for this ${input.entity_type}.`,
            fields: {},
            connections: {},
            notes: [],
            sourcesQueried: result.sourcesQueried,
            sourcesWithData: [],
          };
        }

        const fieldSummary = Object.entries(result.fields)
          .map(([key, field]) => `${key}: "${field.value}" (from ${field.source}, ${Math.round(field.confidence * 100)}% confidence)`)
          .join("\n");

        const connectionSummary = [
          ...(result.connections.orgs?.map((o) => `Organization: ${o.name}${o.domain ? ` (${o.domain})` : ""} — from ${o.source}`) ?? []),
          ...(result.connections.work?.map((w) => `Work: ${w.name} — from ${w.source}`) ?? []),
          ...(result.connections.people?.map((p) => `Person: ${p.name}${p.email ? ` (${p.email})` : ""} — from ${p.source}`) ?? []),
        ].join("\n");

        const notesSummary = result.notes
          .slice(0, 5)
          .map((n) => `• ${n.content} (${n.source})`)
          .join("\n");

        return {
          success: true,
          message: `Found enrichment data from ${result.sourcesWithData.join(", ")}.`,
          fields: result.fields,
          connections: result.connections,
          notes: result.notes,
          sourcesQueried: result.sourcesQueried,
          sourcesWithData: result.sourcesWithData,
          summary: {
            fields: fieldSummary || "No additional fields found.",
            connections: connectionSummary || "No connections found.",
            notes: notesSummary || "No context notes found.",
          },
        };
      },
    }),
  };
}
