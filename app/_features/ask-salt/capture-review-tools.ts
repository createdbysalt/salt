import "server-only";

/**
 * Capture Review Tools
 *
 * Tools for reviewing and correcting captures in Ask Salt.
 * These tools are capture-aware — they know which capture the user is reviewing.
 */

import { z } from "zod";
import { tool, type ToolSet } from "ai";
import { createClient } from "@/app/_lib/supabase/server";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { registerWatchExpressions } from "@/app/_features/capture/services/watch-expressions";
import { linkCaptureToRecord } from "@/app/_features/capture/actions/link-capture";
import { loadCaptureReviewContext, formatCaptureContextForPrompt } from "./capture-review-context";
import type { CaptureReviewContext } from "./capture-review-context";
import type { MemorySurface } from "@/app/_features/capture/services/enrichment/types";

export interface BuildCaptureReviewToolsOptions {
  workspaceId: string;
  userId: string;
  captureId?: string;
}

const surfaceSchema = z
  .enum(["people", "orgs", "work", "billing", "meetings", "files"])
  .describe("Memory surface to link to");

const categorySchema = z
  .enum(["queued", "no-signal", "processing", "error"])
  .describe("Capture category");

export function buildCaptureReviewTools(options: BuildCaptureReviewToolsOptions): ToolSet {
  const { workspaceId, userId, captureId } = options;

  return {
    get_capture_context: tool({
      description: `Load full context about the capture being reviewed. Call this first to understand what the capture contains, what signals were detected, what's already linked, and what plays could run.

Returns:
- Source type and content
- Sender info (email, name, domain)
- Signals Salt detected
- Current category (queued, no-signal, processing, error)
- Linked Memory records
- Play fit scores (which plays could handle this)
- Already triggered plays and watches`,
      inputSchema: z.object({
        capture_id: z
          .string()
          .uuid()
          .optional()
          .describe("Capture ID to load. If omitted, uses the capture being reviewed."),
      }),
      execute: async (input) => {
        const targetId = input.capture_id ?? captureId;
        if (!targetId) {
          return {
            success: false,
            message: "No capture ID provided. Either pass capture_id or start a capture review session.",
          };
        }

        const ctx = await loadCaptureReviewContext(targetId, workspaceId);
        if (!ctx) {
          return {
            success: false,
            message: `Capture ${targetId} not found or not accessible.`,
          };
        }

        return {
          success: true,
          context: ctx,
          formatted: formatCaptureContextForPrompt(ctx),
        };
      },
    }),

    trigger_play_for_capture: tool({
      description: `Trigger a specific play for the capture being reviewed. Use when the user says things like "run the invoice follow-up play" or "trigger the payment received handler".

This queues a play run for approval — it doesn't execute immediately. The play will appear in the user's Plays queue for confirmation.

Before calling, use get_capture_context to see which plays have high fit scores.`,
      inputSchema: z.object({
        capture_id: z
          .string()
          .uuid()
          .optional()
          .describe("Capture ID. If omitted, uses the capture being reviewed."),
        play_slug: z
          .string()
          .min(1)
          .describe("Slug of the playbook to trigger (e.g., 'invoice-followup', 'payment-received')"),
        reason: z
          .string()
          .optional()
          .describe("Why the user is manually triggering this play"),
      }),
      execute: async (input) => {
        const targetId = input.capture_id ?? captureId;
        if (!targetId) {
          return {
            success: false,
            message: "No capture ID provided.",
          };
        }

        const ctx = await loadCaptureReviewContext(targetId, workspaceId);
        if (!ctx) {
          return {
            success: false,
            message: `Capture ${targetId} not found.`,
          };
        }

        const alreadyTriggered = ctx.plays_dispatched.find(
          (p) => p.play_slug === input.play_slug
        );
        if (alreadyTriggered) {
          return {
            success: false,
            message: `Play "${input.play_slug}" was already triggered for this capture (state: ${alreadyTriggered.state}).`,
            existing_play_run_id: alreadyTriggered.play_run_id,
          };
        }

        const supabase = createAdminClient();

        const { data: playRun, error } = await supabase
          .from("play_runs")
          .insert({
            workspace_id: workspaceId,
            playbook_slug: input.play_slug,
            trigger_type: "manual",
            trigger_source: "capture_review",
            trigger_capture_id: targetId,
            state: "queued",
            created_by: userId,
            context: {
              capture_id: targetId,
              manual_trigger_reason: input.reason ?? "User triggered via capture review",
              triggered_by: userId,
            },
          })
          .select("id")
          .single();

        if (error) {
          return {
            success: false,
            message: `Failed to trigger play: ${error.message}`,
          };
        }

        const { error: updateError } = await supabase
          .from("capture_events")
          .update({
            enriched_metadata: {
              ...ctx,
              plays_dispatched: [
                ...ctx.plays_dispatched,
                {
                  play_slug: input.play_slug,
                  play_name: input.play_slug.replace(/-/g, " "),
                  play_run_id: playRun.id,
                  state: "queued",
                  dispatched_at: new Date().toISOString(),
                },
              ],
            },
          })
          .eq("id", targetId);

        if (updateError) {
          console.error("[capture-review-tools] Failed to update enriched_metadata:", updateError);
        }

        return {
          success: true,
          message: `Play "${input.play_slug}" has been queued. It will appear in the Plays queue for confirmation.`,
          play_run_id: playRun.id,
          queued_for_approval: true,
        };
      },
    }),

    add_sender_to_watching: tool({
      description: `Add the capture's sender to the watching system. Use when the user says "watch this sender", "keep an eye on this person", or "notify me when they email again".

This will:
1. Find or create a Person record for the sender
2. Register watch expressions for their email/domain
3. Future captures from them will be flagged as "Triggered Watching"`,
      inputSchema: z.object({
        capture_id: z
          .string()
          .uuid()
          .optional()
          .describe("Capture ID. If omitted, uses the capture being reviewed."),
        watch_type: z
          .enum(["email", "domain", "both"])
          .default("email")
          .describe("Watch by email address, domain, or both"),
        reason: z.string().describe("Why watching this sender (shown to user later)"),
      }),
      execute: async (input) => {
        const targetId = input.capture_id ?? captureId;
        if (!targetId) {
          return {
            success: false,
            message: "No capture ID provided.",
          };
        }

        const ctx = await loadCaptureReviewContext(targetId, workspaceId);
        if (!ctx) {
          return {
            success: false,
            message: `Capture ${targetId} not found.`,
          };
        }

        if (!ctx.sender?.email) {
          return {
            success: false,
            message: "This capture doesn't have a sender email to watch.",
          };
        }

        const supabase = createAdminClient();

        const { data: existingPerson } = await supabase
          .from("people")
          .select("id, display_name")
          .eq("workspace_id", workspaceId)
          .eq("email", ctx.sender.email.toLowerCase())
          .maybeSingle();

        let personId: string;
        let personName: string;
        let personCreated = false;

        if (existingPerson) {
          personId = existingPerson.id;
          personName = existingPerson.display_name ?? ctx.sender.email;
        } else {
          const displayName = ctx.sender.name ?? ctx.sender.email.split("@")[0];
          const { data: newPerson, error } = await supabase
            .from("people")
            .insert({
              workspace_id: workspaceId,
              email: ctx.sender.email.toLowerCase(),
              display_name: displayName,
              source: "capture_review",
              notes: input.reason,
            })
            .select("id")
            .single();

          if (error || !newPerson) {
            return {
              success: false,
              message: `Failed to create person record: ${error?.message ?? "Unknown error"}`,
            };
          }

          personId = newPerson.id;
          personName = displayName;
          personCreated = true;
        }

        const emails: string[] = [];
        const domains: string[] = [];

        if (input.watch_type === "email" || input.watch_type === "both") {
          emails.push(ctx.sender.email);
        }
        if ((input.watch_type === "domain" || input.watch_type === "both") && ctx.sender.domain) {
          domains.push(ctx.sender.domain);
        }

        const result = await registerWatchExpressions({
          workspaceId,
          targetSurface: "people",
          targetEntityId: personId,
          emails,
          domains,
        });

        return {
          success: true,
          message: `Now watching ${personName}.${personCreated ? " Created a new person record." : ""} You'll be notified when they appear in future captures.`,
          person_id: personId,
          person_created: personCreated,
          sender_email: ctx.sender.email,
          sender_domain: ctx.sender.domain,
          watch_type: input.watch_type,
          watches_registered: result.registered,
        };
      },
    }),

    link_capture_to_record: tool({
      description: `Link this capture to a Memory record (Person, Org, Work, etc.). Use when the user says "this is from Lisa", "link to Acme Corp", or "associate with the website project".

Creates a linked_record entry in the capture's enriched metadata.`,
      inputSchema: z.object({
        capture_id: z
          .string()
          .uuid()
          .optional()
          .describe("Capture ID. If omitted, uses the capture being reviewed."),
        surface: surfaceSchema,
        entity_id: z.string().uuid().describe("ID of the Memory record to link to"),
        entity_label: z.string().optional().describe("Display name of the entity"),
      }),
      execute: async (input) => {
        const targetId = input.capture_id ?? captureId;
        if (!targetId) {
          return {
            success: false,
            message: "No capture ID provided.",
          };
        }

        const ctx = await loadCaptureReviewContext(targetId, workspaceId);
        if (!ctx) {
          return {
            success: false,
            message: `Capture ${targetId} not found.`,
          };
        }

        const alreadyLinked = ctx.linked_records.find(
          (r) => r.surface === input.surface && r.entity_id === input.entity_id
        );
        if (alreadyLinked) {
          return {
            success: false,
            message: `This capture is already linked to ${alreadyLinked.entity_label} (${input.surface}).`,
          };
        }

        const result = await linkCaptureToRecord({
          captureId: targetId,
          workspaceId,
          surface: input.surface as MemorySurface,
          entityId: input.entity_id,
          entityLabel: input.entity_label ?? input.entity_id,
          linkedBy: "user",
        });

        if (!result.success) {
          return {
            success: false,
            message: result.error ?? "Failed to link capture.",
          };
        }

        return {
          success: true,
          message: `Linked capture to ${input.entity_label ?? input.entity_id} (${input.surface}).`,
          surface: input.surface,
          entity_id: input.entity_id,
        };
      },
    }),

    recategorize_capture: tool({
      description: `Override Salt's automatic categorization of this capture. Use when the user says "this is actually important", "this isn't noise", or "Salt got this wrong".

Categories:
- queued: Important, should trigger action
- no-signal: Not actionable, can be ignored
- processing: Still being analyzed
- error: Something went wrong`,
      inputSchema: z.object({
        capture_id: z
          .string()
          .uuid()
          .optional()
          .describe("Capture ID. If omitted, uses the capture being reviewed."),
        new_category: categorySchema,
        reason: z.string().describe("Why the user is recategorizing"),
        trigger_play: z
          .string()
          .optional()
          .describe("Optionally also trigger a play by slug"),
      }),
      execute: async (input) => {
        const targetId = input.capture_id ?? captureId;
        if (!targetId) {
          return {
            success: false,
            message: "No capture ID provided.",
          };
        }

        const ctx = await loadCaptureReviewContext(targetId, workspaceId);
        if (!ctx) {
          return {
            success: false,
            message: `Capture ${targetId} not found.`,
          };
        }

        const previousCategory = ctx.category;

        const supabase = createAdminClient();

        const newState =
          input.new_category === "queued"
            ? "pending"
            : input.new_category === "no-signal"
              ? "dismissed"
              : input.new_category === "error"
                ? "error"
                : "pending";

        const { error } = await supabase
          .from("capture_events")
          .update({
            state: newState,
            extracted_data: {
              ...(ctx as unknown as Record<string, unknown>),
              user_recategorization: {
                previous_category: previousCategory,
                new_category: input.new_category,
                reason: input.reason,
                recategorized_by: userId,
                recategorized_at: new Date().toISOString(),
              },
            },
          })
          .eq("id", targetId);

        if (error) {
          return {
            success: false,
            message: `Failed to recategorize: ${error.message}`,
          };
        }

        let playTriggered: string | null = null;
        if (input.trigger_play) {
          const { data: playRun } = await supabase
            .from("play_runs")
            .insert({
              workspace_id: workspaceId,
              playbook_slug: input.trigger_play,
              trigger_type: "manual",
              trigger_source: "recategorization",
              trigger_capture_id: targetId,
              state: "queued",
              created_by: userId,
            })
            .select("id")
            .single();

          if (playRun) {
            playTriggered = input.trigger_play;
          }
        }

        return {
          success: true,
          message: `Changed category from "${previousCategory}" to "${input.new_category}".${playTriggered ? ` Also triggered play "${playTriggered}".` : ""}`,
          previous_category: previousCategory,
          new_category: input.new_category,
          play_triggered: playTriggered,
        };
      },
    }),
  };
}
