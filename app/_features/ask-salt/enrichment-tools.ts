import "server-only";

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { enrichEntity } from "@/app/_lib/composio/enrichment";
import { applyEnrichmentToEntity } from "@/app/_lib/composio/enrichment/apply";
import type { EnrichableEntityType, EnrichmentResult } from "@/app/_lib/composio/enrichment/types";

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

const applyEnrichmentInputSchema = z.object({
  entity_type: z
    .enum(["person", "org", "work", "billing", "meeting", "file", "me"])
    .describe("Type of Memory entity to apply enrichment to"),
  entity_id: z.string().describe("ID of the created entity"),
  entity_label: z.string().describe("Display name of the entity (for summary)"),
  name: z.string().optional().describe("Name used for enrichment lookup"),
  email: z.string().optional().describe("Email used for enrichment lookup"),
  domain: z.string().optional().describe("Domain used for enrichment lookup"),
});

type ApplyEnrichmentInput = z.infer<typeof applyEnrichmentInputSchema>;

export function buildEnrichmentTools(options: BuildEnrichmentToolsOptions): ToolSet {
  const { workspaceId } = options;

  return {
    apply_enrichment: tool({
      description: `Apply enrichment data to a Memory entity AFTER it has been created. Call this immediately after memory_create_* to apply fields discovered during enrich_entity. Re-runs enrichment and applies high-confidence fields automatically; low-confidence fields are accumulated as evidence.`,
      inputSchema: applyEnrichmentInputSchema,
      execute: async (input: ApplyEnrichmentInput) => {
        console.log("[apply_enrichment] Called with:", JSON.stringify(input, null, 2));

        const enrichmentResult = await enrichEntity({
          entityType: input.entity_type as EnrichableEntityType,
          seed: {
            name: input.name,
            email: input.email,
            domain: input.domain,
          },
          workspaceId,
        });

        if (enrichmentResult.sourcesWithData.length === 0) {
          return {
            success: true,
            appliedFields: [],
            accumulatedFields: [],
            skippedFields: [],
            message: "No enrichment data to apply.",
          };
        }

        const applyResult = await applyEnrichmentToEntity({
          workspaceId,
          entityType: input.entity_type as EnrichableEntityType,
          entityId: input.entity_id,
          entityLabel: input.entity_label,
          enrichmentResult,
        });

        return {
          success: true,
          appliedFields: applyResult.appliedFields,
          accumulatedFields: applyResult.accumulatedFields,
          skippedFields: applyResult.skippedFields,
          message: applyResult.summary,
        };
      },
    }),

    enrich_entity: tool({
      description: `Scan connected apps (Gmail, Calendar, Stripe, Drive, etc.) to gather enrichment data BEFORE creating or updating a Memory record. Call during Memory Care intake after parse_intake — run in parallel for each entity. Returns found fields with sources. When load_memory_intake reports explicitIntentAuthorizesCreate, proceed to memory_create_* after enrichment unless duplicates require confirmation.`,
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

        const foundData = result.sourcesWithData.length > 0;
        const noInventedFieldsRule =
          "Do NOT invent phone, email, title, organization, or relationship — only use fields returned here or explicitly stated by the user.";

        if (result.sourcesQueried.length === 0) {
          return {
            success: true,
            foundData: false,
            message: `No connected apps available for enrichment. ${noInventedFieldsRule}`,
            fields: {},
            connections: {},
            notes: [],
            sourcesQueried: [],
            sourcesWithData: [],
          };
        }

        if (!foundData) {
          const label =
            input.name?.trim() ||
            input.email?.trim() ||
            input.project_name?.trim() ||
            input.entity_type;
          return {
            success: true,
            foundData: false,
            message: `Scanned ${result.sourcesQueried.join(", ")} but found no data for ${label}. ${noInventedFieldsRule}`,
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

        const scanLines = (result.scanSummary ?? []).map((s) => {
          if (!s.hadData) return `• ${s.provider} (${s.category}): no data`;
          const parts = [];
          if (s.fieldsExtracted > 0) parts.push(`${s.fieldsExtracted} field${s.fieldsExtracted > 1 ? "s" : ""}`);
          if (s.connectionsFound > 0) parts.push(`${s.connectionsFound} connection${s.connectionsFound > 1 ? "s" : ""}`);
          if (s.notesFound > 0) parts.push(`${s.notesFound} note${s.notesFound > 1 ? "s" : ""}`);
          return `• ${s.provider} (${s.category}): ${parts.join(", ")}`;
        });

        return {
          success: true,
          foundData: true,
          message: `Found enrichment data from ${result.sourcesWithData.join(", ")}.`,
          fields: result.fields,
          connections: result.connections,
          notes: result.notes,
          sourcesQueried: result.sourcesQueried,
          sourcesWithData: result.sourcesWithData,
          scanSummary: result.scanSummary,
          summary: {
            scan: scanLines.join("\n") || "No providers scanned.",
            fields: fieldSummary || "No additional fields found.",
            connections: connectionSummary || "No connections found.",
            notes: notesSummary || "No context notes found.",
          },
        };
      },
    }),
  };
}
