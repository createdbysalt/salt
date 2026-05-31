/**
 * Onboarding Actions
 *
 * Server actions for managing client onboarding checklists and automation.
 * Triggered after successful proposal deposit payment.
 */

"use server";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getStudioBranding } from "@/app/_lib/email/roundtables-emails";
import { sendEmail } from "@/app/_lib/email/resend";
import { getOnboardingTemplate, DEFAULT_TEMPLATE } from "./templates";
import type {
  TriggerOnboardingInput,
  TriggerOnboardingResult,
  ChecklistItem,
  OnboardingProgress,
} from "./types";

/**
 * Result type for server actions
 */
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; errorCode: string; message: string };

function success<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

function error(errorCode: string, message: string): ActionResult<never> {
  return { ok: false, errorCode, message };
}

/**
 * Trigger onboarding automation after successful deposit payment
 *
 * This action:
 * 1. Creates onboarding_checklists record with template items
 * 2. Creates project record from proposal (if not exists)
 * 3. Updates client lifecycle_stage to 'onboard'
 * 4. Sends welcome email via Resend
 *
 * Called from webhook context - uses admin client (no auth context).
 * Must be fast and idempotent.
 *
 * @param input - Trigger input with studio_id, client_id, proposal_id, etc.
 * @returns Result with checklist_id, project_id, and items_count
 */
export async function triggerOnboarding(
  input: TriggerOnboardingInput
): Promise<ActionResult<TriggerOnboardingResult>> {
  const { studio_id, client_id, proposal_id, template_name, trigger_type } = input;

  try {
    const supabase = createAdminClient();

    // Check if onboarding checklist already exists for this proposal (idempotency)
    if (proposal_id) {
      const { data: existingChecklist } = await supabase
        .from("onboarding_checklists")
        .select("id")
        .eq("proposal_id", proposal_id)
        .single();

      if (existingChecklist) {
        console.log(`Onboarding already triggered for proposal ${proposal_id}, skipping`);
        return success({
          checklist_id: existingChecklist.id,
          items_count: 0, // Already exists, no new items
        });
      }
    }

    // Get proposal data if we have a proposal_id
    let proposalData: {
      title: string;
      content: any;
      total_amount: number | null;
    } | null = null;

    if (proposal_id) {
      const { data: proposal, error: proposalError } = await supabase
        .from("proposals")
        .select("title, content, total_amount")
        .eq("id", proposal_id)
        .single();

      if (proposalError) {
        console.warn("Could not fetch proposal:", proposal_id, proposalError);
      } else {
        proposalData = proposal;
      }
    }

    // Get client data for welcome email
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, display_name, contact_email, slug")
      .eq("id", client_id)
      .single();

    if (clientError || !client) {
      return error("CLIENT_NOT_FOUND", "Client not found");
    }

    // Get studio data for branding
    const { data: studio, error: studioError } = await supabase
      .from("studios")
      .select("id, name, slug, settings")
      .eq("id", studio_id)
      .single();

    if (studioError || !studio) {
      return error("STUDIO_NOT_FOUND", "Studio not found");
    }

    // 1. Select and prepare onboarding template
    const selectedTemplateName = template_name || DEFAULT_TEMPLATE;
    const template = getOnboardingTemplate(selectedTemplateName);

    if (!template) {
      return error("TEMPLATE_NOT_FOUND", `Onboarding template '${selectedTemplateName}' not found`);
    }

    // Convert template items to checklist items (add completed fields)
    const checklistItems: ChecklistItem[] = template.items.map((item) => ({
      ...item,
      completed: false,
      completed_at: undefined,
      completed_by: undefined,
    }));

    // 2. Create onboarding checklist record
    const { data: checklist, error: checklistError } = await supabase
      .from("onboarding_checklists")
      .insert({
        studio_id,
        client_id,
        proposal_id: proposal_id || null,
        template_name: selectedTemplateName,
        items: checklistItems,
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (checklistError) {
      console.error("Failed to create onboarding checklist:", checklistError);
      return error("CHECKLIST_CREATE_FAILED", "Failed to create onboarding checklist");
    }

    // 3. Create project record from proposal (if proposal exists and no project yet)
    let projectId: string | undefined;

    if (proposal_id && proposalData) {
      // Check if project already exists for this client/proposal
      // Use separate queries to avoid SQL injection from string interpolation
      const { data: projectByProposalId } = await supabase
        .from("projects")
        .select("id")
        .eq("client_id", client_id)
        .eq("metadata->>proposal_id", proposal_id)
        .maybeSingle();

      const existingProject = projectByProposalId || (
        await supabase
          .from("projects")
          .select("id")
          .eq("client_id", client_id)
          .eq("name", proposalData.title)
          .maybeSingle()
      ).data;

      if (existingProject) {
        projectId = existingProject.id;
        console.log(`Project already exists for proposal ${proposal_id}: ${projectId}`);
      } else {
        // Create new project from proposal
        const projectSlug = generateSlug(proposalData.title);

        const { data: newProject, error: projectError } = await supabase
          .from("projects")
          .insert({
            studio_id,
            client_id,
            name: proposalData.title,
            slug: projectSlug,
            description: `Project created from signed proposal`,
            status: "active",
            project_type: "website", // Default, could be extracted from proposal content
            metadata: {
              proposal_id,
              total_amount: proposalData.total_amount,
              created_from: "onboarding_trigger",
            },
          })
          .select("id")
          .single();

        if (projectError) {
          // Non-fatal - log but continue
          console.error("Failed to create project from proposal:", projectError);
        } else {
          projectId = newProject.id;
          console.log(`Created project ${projectId} from proposal ${proposal_id}`);
        }
      }
    }

    // 4. Update client lifecycle_stage to 'onboard'
    const { error: clientUpdateError } = await supabase
      .from("clients")
      .update({
        lifecycle_stage: "onboard",
      })
      .eq("id", client_id);

    if (clientUpdateError) {
      // Non-fatal - log but continue
      console.error("Failed to update client lifecycle:", client_id, clientUpdateError);
    }

    // 5. Send welcome email via Resend
    try {
      await sendWelcomeEmail({
        studioId: studio_id,
        studioName: studio.name,
        clientEmail: client.contact_email,
        clientName: client.display_name || client.name,
        projectName: proposalData?.title || "Your Project",
        tableUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/table`,
      });
      console.log(`Welcome email sent to ${client.contact_email}`);
    } catch (emailError: any) {
      // Non-fatal - log but don't fail the onboarding
      console.error("Failed to send welcome email:", emailError);
    }

    console.log(
      `Onboarding triggered: checklist=${checklist.id}, client=${client_id}, project=${projectId || "none"}`
    );

    return success({
      checklist_id: checklist.id,
      project_id: projectId,
      items_count: checklistItems.length,
    });
  } catch (err: any) {
    console.error("triggerOnboarding error:", err);
    return error("ONBOARDING_ERROR", "Failed to trigger onboarding");
  }
}

/**
 * Send welcome email to client after successful payment
 */
async function sendWelcomeEmail({
  studioId,
  studioName,
  clientEmail,
  clientName,
  projectName,
  tableUrl,
}: {
  studioId: string;
  studioName: string;
  clientEmail: string;
  clientName: string;
  projectName: string;
  tableUrl: string;
}): Promise<void> {
  if (!clientEmail) {
    console.warn("No client email provided for welcome email");
    return;
  }

  const branding = await getStudioBranding(studioId);

  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #111827;">
      Welcome aboard, ${clientName}! 🎉
    </h2>

    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Thank you for choosing ${branding.studioName}! Your deposit has been received and we're excited to get started on <strong>${projectName}</strong>.
    </p>

    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Here's what happens next:
    </p>

    <ul style="margin: 0 0 24px 0; padding-left: 20px; font-size: 16px; line-height: 1.8; color: #374151;">
      <li>You'll receive a link to book your kickoff call</li>
      <li>We'll prepare a project timeline and milestones</li>
      <li>Roundtables (your shared workspace) is ready for you to explore</li>
    </ul>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${tableUrl}"
         style="display: inline-block; padding: 12px 32px; background-color: ${branding.primaryColor || "#3b82f6"}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Access Roundtables
      </a>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">
      Questions? Simply reply to this email and we'll be happy to help.
    </p>
  `;

  const html = createEmailTemplate(branding, content);
  const text = `Welcome aboard, ${clientName}!\n\nThank you for choosing ${branding.studioName}! Your deposit has been received and we're excited to get started on ${projectName}.\n\nAccess Roundtables: ${tableUrl}\n\nQuestions? Reply to this email and we'll be happy to help.`;

  await sendEmail({
    to: clientEmail,
    subject: `Welcome to ${branding.studioName} - Let's get started!`,
    html,
    text,
    replyTo: branding.supportEmail || undefined,
  });
}

/**
 * Create email template HTML wrapper
 */
function createEmailTemplate(
  branding: { studioName: string; studioLogo?: string; primaryColor?: string; showSaltAttribution?: boolean },
  content: string
): string {
  const attribution = branding.showSaltAttribution
    ? `
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
        <p style="margin: 0;">Powered by <a href="https://usesalt.io" style="color: #3b82f6; text-decoration: none;">Salt</a></p>
      </div>
    `
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email from ${branding.studioName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      ${
        branding.studioLogo
          ? `<img src="${branding.studioLogo}" alt="${branding.studioName}" style="max-width: 150px; height: auto;" />`
          : `<h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #111827;">${branding.studioName}</h1>`
      }
    </div>

    <!-- Content Card -->
    <div style="background-color: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
      ${content}
    </div>

    ${attribution}
  </div>
</body>
</html>
  `;
}

/**
 * Generate URL-safe slug from text
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

/**
 * Update a checklist item completion status
 *
 * @param checklistId - The onboarding checklist ID
 * @param itemId - The item ID within the checklist
 * @param completed - Whether the item is completed
 * @param completedBy - User ID who completed it (optional)
 */
export async function updateChecklistItem(
  checklistId: string,
  itemId: string,
  completed: boolean,
  completedBy?: string
): Promise<ActionResult<{ items: ChecklistItem[] }>> {
  try {
    const supabase = createAdminClient();

    // Get current checklist
    const { data: checklist, error: fetchError } = await supabase
      .from("onboarding_checklists")
      .select("items, status")
      .eq("id", checklistId)
      .single();

    if (fetchError || !checklist) {
      return error("CHECKLIST_NOT_FOUND", "Checklist not found");
    }

    // Update the specific item
    const items = (checklist.items as ChecklistItem[]).map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          completed,
          completed_at: completed ? new Date().toISOString() : undefined,
          completed_by: completed ? completedBy : undefined,
        };
      }
      return item;
    });

    // Check if all required items are completed
    const allRequiredComplete = items
      .filter((item) => item.required)
      .every((item) => item.completed);

    const allComplete = items.every((item) => item.completed);

    // Determine new status
    let newStatus = checklist.status;
    if (allComplete) {
      newStatus = "completed";
    } else if (allRequiredComplete && checklist.status !== "completed") {
      // Keep as in_progress until all items complete
      newStatus = "in_progress";
    }

    // Update checklist
    const { error: updateError } = await supabase
      .from("onboarding_checklists")
      .update({
        items,
        status: newStatus,
        completed_at: newStatus === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", checklistId);

    if (updateError) {
      return error("UPDATE_FAILED", "Failed to update checklist item");
    }

    return success({ items });
  } catch (err: any) {
    console.error("updateChecklistItem error:", err);
    return error("UPDATE_ERROR", "Failed to update checklist item");
  }
}

/**
 * Get onboarding progress for a checklist
 *
 * @param checklistId - The onboarding checklist ID
 * @returns Progress summary
 */
export async function getOnboardingProgress(
  checklistId: string
): Promise<ActionResult<OnboardingProgress>> {
  try {
    const supabase = createAdminClient();

    const { data: checklist, error: fetchError } = await supabase
      .from("onboarding_checklists")
      .select("items, status")
      .eq("id", checklistId)
      .single();

    if (fetchError || !checklist) {
      return error("CHECKLIST_NOT_FOUND", "Checklist not found");
    }

    const items = checklist.items as ChecklistItem[];
    const totalItems = items.length;
    const completedItems = items.filter((item) => item.completed).length;
    const requiredItems = items.filter((item) => item.required).length;
    const completedRequiredItems = items.filter(
      (item) => item.required && item.completed
    ).length;

    const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    const isComplete = checklist.status === "completed";

    return success({
      total_items: totalItems,
      completed_items: completedItems,
      required_items: requiredItems,
      completed_required_items: completedRequiredItems,
      percentage,
      is_complete: isComplete,
    });
  } catch (err: any) {
    console.error("getOnboardingProgress error:", err);
    return error("PROGRESS_ERROR", "Failed to get onboarding progress");
  }
}
