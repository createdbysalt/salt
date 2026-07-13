import "server-only";

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { registerEntityWatch } from "@/app/_lib/learning/watches";
import type { SignalSurface } from "@/app/_lib/learning/types";

export interface BuildWatchingToolsOptions {
  workspaceId: string;
  userId?: string;
}

const entityTypeSchema = z
  .enum(["person", "organization", "work", "billing", "file", "meeting"])
  .describe("Type of Memory entity to watch");

const watchCriteriaSchema = z.object({
  entity_type: entityTypeSchema,
  entity_id: z.string().uuid().describe("The ID of the entity to watch"),
  entity_name: z.string().optional().describe("Display name of the entity (for context)"),
  missing_fields: z
    .array(z.string())
    .describe("Fields that are missing and need to be filled (e.g., 'email', 'phone', 'deadline')"),
  watch_for: z
    .array(z.string())
    .optional()
    .describe("Specific signals to watch for (optional, defaults based on entity type)"),
  reason: z.string().describe("Why this watch was registered (for user context)"),
});

type WatchCriteriaInput = z.infer<typeof watchCriteriaSchema>;

const DEFAULT_WATCH_SIGNALS: Record<string, string[]> = {
  person: [
    "capture_email_received",
    "capture_email_sent",
    "capture_meeting_completed",
    "person_email_extracted",
    "person_phone_extracted",
  ],
  organization: [
    "capture_email_received",
    "org_billing_email_found",
    "org_domain_detected",
    "org_website_found",
  ],
  work: [
    "capture_email_received",
    "work_deadline_mentioned",
    "work_contract_value_found",
    "work_blocker_detected",
  ],
  billing: [
    "capture_email_received",
    "billing_due_date_found",
    "billing_amount_confirmed",
    "billing_payment_received",
  ],
  file: [
    "file_category_detected",
    "file_linked_entity_found",
    "file_description_extracted",
  ],
  meeting: [
    "meeting_attendee_confirmed",
    "meeting_location_found",
    "meeting_work_linked",
    "capture_meeting_completed",
  ],
};

export function buildWatchingTools(options: BuildWatchingToolsOptions): ToolSet {
  const { workspaceId } = options;

  return {
    add_to_watching: tool({
      description: `Register a watch for a Memory entity when critical fields are missing. The watch system monitors for signals from connected apps (email, calendar, etc.) that could fill the missing data. When a matching signal arrives, Salt will automatically update the entity or notify the user.

Use this AFTER creating an entity when:
- Person: missing email, phone, or org link
- Organization: missing domain, website, or billing_email
- Work: missing deadline, linked_org, or contract_value
- Billing: missing due_at, linked_work, or amount
- File: missing category, linked entity, or description
- Meeting: missing attendee confirmation, location, or linked_work

The watch expires after 90 days or after 10 successful triggers.`,
      inputSchema: watchCriteriaSchema,
      execute: async (input: WatchCriteriaInput) => {
        const entityType = input.entity_type as SignalSurface;
        const watchSignals = input.watch_for ?? DEFAULT_WATCH_SIGNALS[entityType] ?? [];

        if (watchSignals.length === 0) {
          return {
            success: false,
            message: `No default watch signals defined for entity type "${entityType}". Provide watch_for explicitly.`,
          };
        }

        const results: Array<{ field: string; watchId?: string; error?: string }> = [];

        for (const field of input.missing_fields) {
          const result = await registerEntityWatch({
            workspaceId,
            watchedEntity: {
              type: entityType,
              id: input.entity_id,
            },
            watchForSignals: watchSignals,
            filterCriteria: {
              entity_id: input.entity_id,
            },
            onMatch: {
              signal: `${entityType}_field_${field}_enriched`,
              extraEvidence: {
                missing_field: field,
                watch_reason: input.reason,
              },
            },
            expiresInDays: 90,
          });

          if (result.success) {
            results.push({
              field,
              watchId: result.watchId,
            });
          } else {
            results.push({
              field,
              error: result.error ?? "Unknown error",
            });
          }
        }

        const successCount = results.filter((r) => !r.error).length;
        const failCount = results.filter((r) => r.error).length;

        if (successCount === 0 && failCount > 0) {
          return {
            success: false,
            message: `Failed to register watches for missing fields.`,
            results,
          };
        }

        const entityLabel = input.entity_name ?? input.entity_id;
        const fieldsWatched = results
          .filter((r) => !r.error)
          .map((r) => r.field)
          .join(", ");

        return {
          success: true,
          message: `Watching ${entityLabel} for: ${fieldsWatched}. Salt will notify when signals arrive that can fill these fields.`,
          watchCount: successCount,
          entityType,
          entityId: input.entity_id,
          fieldsWatched: input.missing_fields.filter(
            (f) => !results.find((r) => r.field === f && r.error)
          ),
          expiresInDays: 90,
        };
      },
    }),
  };
}
