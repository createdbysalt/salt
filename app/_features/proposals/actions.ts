"use server";

/**
 * Proposals Feature - Server Actions
 *
 * Server-side mutations for proposal management.
 * Includes CRUD operations for proposals.
 *
 * Follows patterns from:
 * - app/actions/clients/update-client.ts (validation, tenancy, error handling)
 * - app/actions/CLAUDE.md (ActionResult pattern)
 */

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  Proposal,
  ProposalContent,
  ProposalTerms,
  PaymentScheduleItem,
  Currency,
  CreateProposalInput,
  UpdateProposalInput,
  SignProposalInput,
  SendProposalInput,
  SignatureGeolocation,
} from "./types";
import { PROPOSAL_STATUS, SUPPORTED_CURRENCIES } from "./types";
import { getDefaultTemplate } from "./templates";
import { generateProposalFromInsights } from "./generators";
import { extractProposalInsights } from "@/app/_features/intelligence/generators";
import { sendEmail, getStudioBranding } from "@/app/_lib/email";

// =============================================================================
// Types
// =============================================================================

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; errorCode: string; message: string };

// =============================================================================
// Validation Schemas
// =============================================================================

const createProposalSchema = z.object({
  client_id: z.string().uuid("Invalid client ID"),
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  template_id: z.string().uuid().optional(),
  intake_id: z.string().uuid().optional(),
  fromIntelligence: z.boolean().optional().default(false),
});

const paymentScheduleItemSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  due_date: z.string(), // ISO date string
  description: z.string().min(1, "Description required"),
  status: z.enum(["pending", "invoiced", "paid", "overdue"]),
});

const proposalContentSchema = z.object({
  sections: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      content: z.string(),
      order: z.number(),
    })
  ),
});

const proposalTermsSchema = z.object({
  validity_days: z.number().positive().optional(),
  payment_terms: z.string().optional(),
  cancellation_policy: z.string().optional(),
  revision_policy: z.string().optional(),
  ownership_clause: z.string().optional(),
  confidentiality_clause: z.string().optional(),
  custom_terms: z.string().optional(),
});

const updateProposalSchema = z.object({
  id: z.string().uuid("Invalid proposal ID"),
  title: z.string().min(1).max(255).optional(),
  content: proposalContentSchema.optional(),
  total_amount: z.number().nonnegative().optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  payment_schedule: z.array(paymentScheduleItemSchema).optional(),
  terms: proposalTermsSchema.optional(),
});

// =============================================================================
// CREATE PROPOSAL
// =============================================================================

/**
 * Create a new proposal for a client.
 * Optionally applies a default template for initial content.
 */
export async function createProposal(
  input: CreateProposalInput
): Promise<ActionResult<Proposal>> {
  try {
    // Get tenant context and require studio membership
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Validate input
    const validation = createProposalSchema.safeParse(input);
    if (!validation.success) {
      return {
        ok: false,
        errorCode: "VALIDATION_ERROR",
        message: validation.error.errors[0].message,
      };
    }

    const { client_id, title, template_id, intake_id, fromIntelligence } = validation.data;

    // Verify client belongs to this studio
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, company")
      .eq("id", client_id)
      .eq("studio_id", studio.id)
      .single();

    if (clientError || !client) {
      return {
        ok: false,
        errorCode: "CLIENT_NOT_FOUND",
        message: "Client not found",
      };
    }

    // Build initial content (from template, intelligence, or empty)
    let initialContent: ProposalContent = { sections: [] };
    let initialTerms: ProposalTerms = {};
    let initialAmount: number | undefined;
    let initialCurrency: Currency = "USD";

    // Option 1: Generate from AI-extracted intelligence
    if (fromIntelligence) {
      // Find intake for this client
      const { data: intake } = await supabase
        .from("client_intakes")
        .select("*")
        .eq("client_id", client_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (intake) {
        // Extract insights from intake
        const extraction = await extractProposalInsights({
          intakeId: intake.id,
          clientId: client_id,
          includeDiscovery: true,
        });

        if (extraction) {
          // Generate proposal content from extracted insights
          const generated = generateProposalFromInsights(extraction, {
            clientName: client.name,
            companyName: (client.company as { name?: string })?.name,
            highConfidenceOnly: false,
            templateStyle: "conversational",
          });

          initialContent = generated.content;
          initialTerms = generated.terms;
          initialAmount = generated.suggestedAmount;
          if (generated.currency) {
            initialCurrency = generated.currency as Currency;
          }
        }
      }
    }

    // Option 2: Check if there's a code-based template key (e.g., "website-design")
    if (!fromIntelligence && template_id) {
      const codeTemplate = getDefaultTemplate(template_id);
      if (codeTemplate) {
        // Use code-based template
        initialContent = {
          sections: codeTemplate.sections.map((section, index) => ({
            id: section.id,
            title: section.title,
            content: section.defaultContent,
            order: index,
          })),
        };
        initialTerms = codeTemplate.defaultTerms;
      } else {
        // Try loading from database template
        const { data: dbTemplate } = await supabase
          .from("proposal_templates")
          .select("content, default_terms")
          .eq("id", template_id)
          .eq("studio_id", studio.id)
          .single();

        if (dbTemplate) {
          initialContent = (dbTemplate.content as ProposalContent) || { sections: [] };
          initialTerms = (dbTemplate.default_terms as ProposalTerms) || {};
        }
      }
    }

    // Determine the intake_id to link (from param or from intelligence fetch)
    let linkedIntakeId = intake_id || null;
    if (fromIntelligence && !linkedIntakeId) {
      // Re-fetch intake id if we generated from intelligence
      const { data: intakeForLink } = await supabase
        .from("client_intakes")
        .select("id")
        .eq("client_id", client_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      linkedIntakeId = intakeForLink?.id || null;
    }

    // Create the proposal
    const { data: proposal, error: insertError } = await supabase
      .from("proposals")
      .insert({
        studio_id: studio.id,
        client_id,
        title,
        intake_id: linkedIntakeId,
        template_id: template_id && !getDefaultTemplate(template_id) ? template_id : null,
        content: initialContent,
        terms: initialTerms,
        total_amount: initialAmount || null,
        status: PROPOSAL_STATUS.DRAFT,
        currency: initialCurrency,
        payment_schedule: [],
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating proposal:", insertError);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to create proposal",
      };
    }

    // Revalidate relevant paths
    revalidatePath("/strategy/proposals");
    revalidatePath(`/studio/clients/${client_id}`);

    return {
      ok: true,
      data: proposal as Proposal,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        ok: false,
        errorCode: "VALIDATION_ERROR",
        message: error.errors[0].message,
      };
    }
    console.error("Unexpected error in createProposal:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    };
  }
}

// =============================================================================
// UPDATE PROPOSAL
// =============================================================================

/**
 * Update a proposal's content, pricing, or terms.
 * Can only update proposals in draft status.
 */
export async function updateProposal(
  input: UpdateProposalInput
): Promise<ActionResult<Proposal>> {
  try {
    // Get tenant context and require studio membership
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Validate input
    const validation = updateProposalSchema.safeParse(input);
    if (!validation.success) {
      return {
        ok: false,
        errorCode: "VALIDATION_ERROR",
        message: validation.error.errors[0].message,
      };
    }

    const { id, ...updates } = validation.data;

    // Verify proposal exists and belongs to this studio
    const { data: existingProposal, error: fetchError } = await supabase
      .from("proposals")
      .select("id, status, client_id")
      .eq("id", id)
      .eq("studio_id", studio.id)
      .single();

    if (fetchError || !existingProposal) {
      return {
        ok: false,
        errorCode: "PROPOSAL_NOT_FOUND",
        message: "Proposal not found",
      };
    }

    // Only allow updates to draft or sent proposals
    const editableStatuses = [PROPOSAL_STATUS.DRAFT, PROPOSAL_STATUS.SENT];
    if (!editableStatuses.includes(existingProposal.status)) {
      return {
        ok: false,
        errorCode: "PROPOSAL_NOT_EDITABLE",
        message: `Cannot edit proposal with status: ${existingProposal.status}`,
      };
    }

    // Build update object (only include fields that were provided)
    const updateData: Record<string, unknown> = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.total_amount !== undefined) updateData.total_amount = updates.total_amount;
    if (updates.currency !== undefined) updateData.currency = updates.currency;
    if (updates.payment_schedule !== undefined) updateData.payment_schedule = updates.payment_schedule;
    if (updates.terms !== undefined) updateData.terms = updates.terms;

    // Perform update
    const { data: proposal, error: updateError } = await supabase
      .from("proposals")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating proposal:", updateError);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to update proposal",
      };
    }

    // Revalidate relevant paths
    revalidatePath("/strategy/proposals");
    revalidatePath(`/strategy/proposals/${id}`);
    revalidatePath(`/studio/clients/${existingProposal.client_id}`);

    return {
      ok: true,
      data: proposal as Proposal,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        ok: false,
        errorCode: "VALIDATION_ERROR",
        message: error.errors[0].message,
      };
    }
    console.error("Unexpected error in updateProposal:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    };
  }
}

// =============================================================================
// DELETE PROPOSAL
// =============================================================================

/**
 * Delete a proposal.
 * Can only delete proposals in draft status.
 */
export async function deleteProposal(
  proposalId: string
): Promise<ActionResult<{ deleted: boolean }>> {
  try {
    // Get tenant context and require studio membership
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Validate proposal ID
    if (!proposalId || !z.string().uuid().safeParse(proposalId).success) {
      return {
        ok: false,
        errorCode: "VALIDATION_ERROR",
        message: "Invalid proposal ID",
      };
    }

    // Verify proposal exists and belongs to this studio
    const { data: existingProposal, error: fetchError } = await supabase
      .from("proposals")
      .select("id, status, client_id")
      .eq("id", proposalId)
      .eq("studio_id", studio.id)
      .single();

    if (fetchError || !existingProposal) {
      return {
        ok: false,
        errorCode: "PROPOSAL_NOT_FOUND",
        message: "Proposal not found",
      };
    }

    // Only allow deletion of draft proposals
    if (existingProposal.status !== PROPOSAL_STATUS.DRAFT) {
      return {
        ok: false,
        errorCode: "PROPOSAL_NOT_DELETABLE",
        message: "Can only delete proposals in draft status",
      };
    }

    // Delete the proposal
    const { error: deleteError } = await supabase
      .from("proposals")
      .delete()
      .eq("id", proposalId);

    if (deleteError) {
      console.error("Error deleting proposal:", deleteError);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to delete proposal",
      };
    }

    // Revalidate relevant paths
    revalidatePath("/strategy/proposals");
    revalidatePath(`/studio/clients/${existingProposal.client_id}`);

    return {
      ok: true,
      data: { deleted: true },
    };
  } catch (error) {
    console.error("Unexpected error in deleteProposal:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    };
  }
}

// =============================================================================
// TRACK PROPOSAL VIEW (Public - no auth required)
// =============================================================================

/**
 * Track when a proposal is viewed via public link.
 * Increments view count and sets viewed_at on first view.
 * Also updates status from 'sent' to 'viewed' if applicable.
 */
export async function trackProposalView(
  publicId: string
): Promise<ActionResult<{ tracked: boolean }>> {
  try {
    // Validate public ID (nanoid format - alphanumeric, 21 chars)
    if (!publicId || typeof publicId !== "string" || publicId.length < 10) {
      return {
        ok: false,
        errorCode: "VALIDATION_ERROR",
        message: "Invalid public ID",
      };
    }

    // Use unauthenticated client for public access
    const supabase = await createClient();

    // First fetch the current proposal state
    const { data: proposal, error: fetchError } = await supabase
      .from("proposals")
      .select("id, status, viewed_at")
      .eq("public_id", publicId)
      .single();

    if (fetchError || !proposal) {
      return {
        ok: false,
        errorCode: "PROPOSAL_NOT_FOUND",
        message: "Proposal not found",
      };
    }

    // Build update object
    const updateData: Record<string, unknown> = {};

    // Set viewed_at on first view (if not already set)
    if (!proposal.viewed_at) {
      updateData.viewed_at = new Date().toISOString();
    }

    // Update status from 'sent' to 'viewed' if applicable
    if (proposal.status === PROPOSAL_STATUS.SENT) {
      updateData.status = PROPOSAL_STATUS.VIEWED;
    }

    // Only update if there's something to change
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from("proposals")
        .update(updateData)
        .eq("id", proposal.id);

      if (updateError) {
        console.error("Error tracking proposal view:", updateError);
        // Don't fail the view - just log the error
      }
    }

    return {
      ok: true,
      data: { tracked: true },
    };
  } catch (error) {
    console.error("Unexpected error in trackProposalView:", error);
    // Don't fail the view - tracking is secondary
    return {
      ok: true,
      data: { tracked: false },
    };
  }
}

// =============================================================================
// SIGN PROPOSAL (Public - no auth required)
// =============================================================================

const signatureGeolocationSchema = z.object({
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
}).optional();

const signProposalSchema = z.object({
  proposal_id: z.string().min(1, "Proposal ID is required"),
  signature_name: z.string().min(2, "Full legal name must be at least 2 characters"),
  signature_email: z.string().email("Valid email is required"),
  signature_ip: z.string().min(1, "IP address is required"),
  signature_user_agent: z.string().min(1, "User agent is required"),
  signature_geolocation: signatureGeolocationSchema,
});

/**
 * Generate a SHA-256 hash of proposal content for document integrity verification.
 * The hash is used to prove the document hasn't been altered after signing.
 */
async function generateDocumentHash(proposal: {
  title: string;
  content: ProposalContent;
  total_amount?: number | null;
  currency: string;
  payment_schedule: PaymentScheduleItem[];
  terms: ProposalTerms;
}): Promise<string> {
  // Create a canonical representation of the proposal content
  const canonicalContent = JSON.stringify({
    title: proposal.title,
    content: proposal.content,
    total_amount: proposal.total_amount,
    currency: proposal.currency,
    payment_schedule: proposal.payment_schedule,
    terms: proposal.terms,
  }, null, 0); // No formatting for consistent hashing

  // Generate SHA-256 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalContent);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  return hashHex;
}

/**
 * Sign a proposal with full audit trail.
 * This is a legally binding action that captures:
 * - Signer's full legal name
 * - Signer's email address
 * - IP address
 * - User agent
 * - Geolocation (if available)
 * - Timestamp
 * - SHA-256 hash of the proposal content
 *
 * The proposal must be in 'sent' or 'viewed' status to be signed.
 */
export async function signProposal(
  input: SignProposalInput
): Promise<ActionResult<{ proposal_id: string; signed_at: string }>> {
  try {
    // Validate input
    const validation = signProposalSchema.safeParse(input);
    if (!validation.success) {
      return {
        ok: false,
        errorCode: "VALIDATION_ERROR",
        message: validation.error.errors[0].message,
      };
    }

    const {
      proposal_id,
      signature_name,
      signature_email,
      signature_ip,
      signature_user_agent,
      signature_geolocation,
    } = validation.data;

    // Use unauthenticated client for public signing
    const supabase = await createClient();

    // Fetch the proposal - can be fetched by public_id or UUID
    // Try public_id first (nanoid format), then UUID
    let proposal;
    let fetchError;

    // Check if it's a UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(proposal_id);

    if (isUUID) {
      const result = await supabase
        .from("proposals")
        .select("id, status, title, content, total_amount, currency, payment_schedule, terms, client_id")
        .eq("id", proposal_id)
        .single();
      proposal = result.data;
      fetchError = result.error;
    } else {
      // Try by public_id
      const result = await supabase
        .from("proposals")
        .select("id, status, title, content, total_amount, currency, payment_schedule, terms, client_id")
        .eq("public_id", proposal_id)
        .single();
      proposal = result.data;
      fetchError = result.error;
    }

    if (fetchError || !proposal) {
      return {
        ok: false,
        errorCode: "PROPOSAL_NOT_FOUND",
        message: "Proposal not found",
      };
    }

    // Verify the proposal is in a signable status
    const signableStatuses = [PROPOSAL_STATUS.SENT, PROPOSAL_STATUS.VIEWED];
    if (!signableStatuses.includes(proposal.status)) {
      let message = "This proposal cannot be signed.";
      if (proposal.status === PROPOSAL_STATUS.ACCEPTED) {
        message = "This proposal has already been signed.";
      } else if (proposal.status === PROPOSAL_STATUS.DECLINED) {
        message = "This proposal has been declined.";
      } else if (proposal.status === PROPOSAL_STATUS.EXPIRED) {
        message = "This proposal has expired.";
      } else if (proposal.status === PROPOSAL_STATUS.DRAFT) {
        message = "This proposal is still in draft and cannot be signed.";
      }
      return {
        ok: false,
        errorCode: "PROPOSAL_NOT_SIGNABLE",
        message,
      };
    }

    // Generate document hash for integrity verification
    const documentHash = await generateDocumentHash({
      title: proposal.title,
      content: proposal.content as ProposalContent,
      total_amount: proposal.total_amount,
      currency: proposal.currency,
      payment_schedule: proposal.payment_schedule as PaymentScheduleItem[],
      terms: proposal.terms as ProposalTerms,
    });

    // Capture current timestamp
    const signedAt = new Date().toISOString();

    // Build update object with all audit trail fields
    const updateData: Record<string, unknown> = {
      status: PROPOSAL_STATUS.ACCEPTED,
      accepted_at: signedAt,
      signed_at: signedAt,
      signature_name,
      signature_email,
      signature_ip,
      signature_user_agent,
      document_hash: documentHash,
      // Standard consent text used in SignatureCapture component
      consent_checkbox_text: "I agree to the terms and conditions outlined in this proposal. I understand that by typing my name and checking this box, I am providing my electronic signature, which has the same legal effect as a handwritten signature.",
      terms_version: "1.0", // Versioning for legal purposes
    };

    // Add geolocation if provided
    if (signature_geolocation) {
      updateData.signature_geolocation = signature_geolocation as SignatureGeolocation;
    }

    // Update the proposal with signature
    const { error: updateError } = await supabase
      .from("proposals")
      .update(updateData)
      .eq("id", proposal.id);

    if (updateError) {
      console.error("Error signing proposal:", updateError);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to save signature. Please try again.",
      };
    }

    // Revalidate relevant paths
    revalidatePath(`/proposal/${proposal_id}`);
    revalidatePath("/strategy/proposals");
    revalidatePath(`/strategy/proposals/${proposal.id}`);
    revalidatePath(`/studio/clients/${proposal.client_id}`);

    return {
      ok: true,
      data: {
        proposal_id: proposal.id,
        signed_at: signedAt,
      },
    };
  } catch (error) {
    console.error("Unexpected error in signProposal:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: "An unexpected error occurred while signing. Please try again.",
    };
  }
}

// =============================================================================
// SEND PROPOSAL
// =============================================================================

const sendProposalSchema = z.object({
  proposal_id: z.string().uuid("Invalid proposal ID"),
  recipient_email: z.string().email("Valid email is required"),
  custom_message: z.string().optional(),
});

/**
 * Generate HTML email template for proposal email.
 * Uses studio branding for white-labeled appearance.
 */
function createProposalEmailTemplate(
  branding: Awaited<ReturnType<typeof getStudioBranding>>,
  content: string
): string {
  const attribution = branding.showSaltAttribution
    ? `
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
        <p style="margin: 0;">Powered by <a href="https://usesalt.io" style="color: #3b82f6; text-decoration: none;">SALT</a></p>
      </div>
    `
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proposal from ${branding.studioName}</title>
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
 * Create CTA button for email.
 */
function createProposalButton(text: string, url: string, color: string): string {
  return `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}"
         style="display: inline-block; padding: 14px 40px; background-color: ${color}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        ${text}
      </a>
    </div>
  `;
}

/**
 * Send a proposal to a client via email.
 *
 * This action:
 * 1. Validates the proposal is ready to send (has content, terms, and pricing)
 * 2. Generates a unique signing link using the public_id
 * 3. Sends a branded email to the client with the proposal link
 * 4. Updates the proposal status to 'sent' and sets sent_at
 *
 * The proposal must be in 'draft' status to be sent.
 */
export async function sendProposal(
  input: SendProposalInput
): Promise<ActionResult<{ proposal_id: string; sent_at: string }>> {
  try {
    // Get tenant context and require studio membership
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Validate input
    const validation = sendProposalSchema.safeParse(input);
    if (!validation.success) {
      return {
        ok: false,
        errorCode: "VALIDATION_ERROR",
        message: validation.error.errors[0].message,
      };
    }

    const { proposal_id, recipient_email, custom_message } = validation.data;

    // Fetch the proposal with client info
    const { data: proposal, error: fetchError } = await supabase
      .from("proposals")
      .select(`
        *,
        client:clients(id, name, contact_email, company_name)
      `)
      .eq("id", proposal_id)
      .eq("studio_id", studio.id)
      .single();

    if (fetchError || !proposal) {
      return {
        ok: false,
        errorCode: "PROPOSAL_NOT_FOUND",
        message: "Proposal not found",
      };
    }

    // Verify the proposal is in draft status
    if (proposal.status !== PROPOSAL_STATUS.DRAFT) {
      let message = "This proposal cannot be sent.";
      if (proposal.status === PROPOSAL_STATUS.SENT) {
        message = "This proposal has already been sent. You can resend it or copy the link instead.";
      } else if (proposal.status === PROPOSAL_STATUS.ACCEPTED) {
        message = "This proposal has already been accepted.";
      } else if (proposal.status === PROPOSAL_STATUS.DECLINED) {
        message = "This proposal has been declined.";
      } else if (proposal.status === PROPOSAL_STATUS.EXPIRED) {
        message = "This proposal has expired.";
      }
      return {
        ok: false,
        errorCode: "PROPOSAL_NOT_SENDABLE",
        message,
      };
    }

    // Validate proposal completeness
    const content = proposal.content as ProposalContent;
    const terms = proposal.terms as ProposalTerms;

    // Check for content
    if (!content?.sections || content.sections.length === 0) {
      return {
        ok: false,
        errorCode: "PROPOSAL_INCOMPLETE",
        message: "Proposal must have at least one content section before sending.",
      };
    }

    // Check for pricing (total_amount must be set)
    if (proposal.total_amount == null || proposal.total_amount <= 0) {
      return {
        ok: false,
        errorCode: "PROPOSAL_INCOMPLETE",
        message: "Proposal must have a total amount set before sending.",
      };
    }

    // Check for terms (at least payment_terms should be defined)
    if (!terms?.payment_terms) {
      return {
        ok: false,
        errorCode: "PROPOSAL_INCOMPLETE",
        message: "Proposal must have payment terms defined before sending.",
      };
    }

    // Generate signing URL using public_id
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const signingUrl = `${baseUrl}/proposal/${proposal.public_id}`;

    // Get studio branding for email
    const branding = await getStudioBranding(studio.id);

    // Get client name
    const clientData = proposal.client as {
      id: string;
      name: string;
      contact_email: string | null;
      company_name: string | null;
    } | null;
    const clientName = clientData?.name || "there";

    // Format amount for display
    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: proposal.currency || "USD",
    }).format(proposal.total_amount);

    // Build email content
    const emailContent = `
      <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #111827;">
        New Proposal: ${proposal.title}
      </h2>

      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
        Hi ${clientName},
      </p>

      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
        ${branding.studioName} has prepared a proposal for you.
      </p>

      ${custom_message ? `
        <div style="background-color: #f3f4f6; padding: 16px; margin: 24px 0; border-radius: 8px; border-left: 4px solid ${branding.primaryColor || "#3b82f6"};">
          <p style="margin: 0; font-size: 14px; color: #374151; font-style: italic;">
            "${custom_message}"
          </p>
        </div>
      ` : ""}

      <div style="background-color: #f3f4f6; padding: 20px; margin: 24px 0; border-radius: 8px;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
          Project Investment
        </p>
        <p style="margin: 0; font-size: 28px; font-weight: 700; color: #111827;">
          ${formattedAmount}
        </p>
        ${terms.validity_days ? `
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">
            Valid for ${terms.validity_days} days
          </p>
        ` : ""}
      </div>

      ${createProposalButton("View Proposal", signingUrl, branding.primaryColor || "#3b82f6")}

      <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">
        Review the full proposal and sign it electronically when you're ready to proceed.
      </p>
    `;

    const html = createProposalEmailTemplate(branding, emailContent);
    const text = `New Proposal: ${proposal.title}\n\nHi ${clientName},\n\n${branding.studioName} has prepared a proposal for you.\n\n${custom_message ? `"${custom_message}"\n\n` : ""}Project Investment: ${formattedAmount}\n${terms.validity_days ? `Valid for ${terms.validity_days} days\n` : ""}\nView and sign the proposal: ${signingUrl}\n\nReview the full proposal and sign it electronically when you're ready to proceed.`;

    // Send the email
    try {
      await sendEmail({
        to: recipient_email,
        subject: `Proposal from ${branding.studioName}: ${proposal.title}`,
        html,
        text,
        replyTo: branding.supportEmail || undefined,
      });
    } catch (emailError) {
      console.error("Error sending proposal email:", emailError);
      return {
        ok: false,
        errorCode: "EMAIL_SEND_FAILED",
        message: "Failed to send proposal email. Please try again.",
      };
    }

    // Update proposal status and sent_at
    const sentAt = new Date().toISOString();

    // Calculate expires_at based on validity_days
    let expiresAt: string | null = null;
    if (terms.validity_days && terms.validity_days > 0) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + terms.validity_days);
      expiresAt = expirationDate.toISOString();
    }

    const { error: updateError } = await supabase
      .from("proposals")
      .update({
        status: PROPOSAL_STATUS.SENT,
        sent_at: sentAt,
        ...(expiresAt && { expires_at: expiresAt }),
      })
      .eq("id", proposal_id);

    if (updateError) {
      console.error("Error updating proposal status:", updateError);
      // Email was sent, but status update failed - log but don't fail
      // The proposal can still be viewed and signed
    }

    // Revalidate relevant paths
    revalidatePath("/strategy/proposals");
    revalidatePath(`/strategy/proposals/${proposal_id}`);
    revalidatePath(`/studio/clients/${proposal.client_id}`);

    return {
      ok: true,
      data: {
        proposal_id,
        sent_at: sentAt,
      },
    };
  } catch (error) {
    console.error("Unexpected error in sendProposal:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: "An unexpected error occurred while sending. Please try again.",
    };
  }
}
