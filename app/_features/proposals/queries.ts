/**
 * Proposals Feature - Queries
 *
 * Data fetching functions for proposals.
 * Uses React cache for request deduplication in server components.
 *
 * Follows patterns from:
 * - app/actions/clients/get-clients-with-metrics.ts (query structure, tenant context)
 */

import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import type {
  Proposal,
  ProposalWithClient,
  ProposalStatus,
} from "./types";

// =============================================================================
// Types
// =============================================================================

export interface ProposalListItem {
  id: string;
  public_id: string;
  title: string;
  status: ProposalStatus;
  total_amount: number | null;
  currency: string;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  client: {
    id: string;
    name: string;
    contact_email: string | null;
    company_name: string | null;
  };
}

export interface ListProposalsFilters {
  status?: ProposalStatus | "all";
  client_id?: string;
  search?: string;
}

// =============================================================================
// GET PROPOSAL
// =============================================================================

/**
 * Get a single proposal by ID.
 * Cached for request deduplication.
 */
export const getProposal = cache(async (proposalId: string): Promise<Proposal | null> => {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    const { data: proposal, error } = await supabase
      .from("proposals")
      .select("*")
      .eq("id", proposalId)
      .eq("studio_id", studio.id)
      .single();

    if (error) {
      console.error("Error fetching proposal:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return null;
    }

    return proposal as Proposal;
  } catch (error) {
    console.error("Unexpected error in getProposal:", error);
    return null;
  }
});

// =============================================================================
// GET PROPOSAL WITH CLIENT
// =============================================================================

/**
 * Get a single proposal by ID with client details.
 * Cached for request deduplication.
 */
export const getProposalWithClient = cache(
  async (proposalId: string): Promise<ProposalWithClient | null> => {
    try {
      const { context } = await getTenantContext();
      const studio = requireStudioMember(context);
      const supabase = await createClient();

      const { data: proposal, error } = await supabase
        .from("proposals")
        .select(`
          *,
          client:clients(id, name, contact_email, company_name)
        `)
        .eq("id", proposalId)
        .eq("studio_id", studio.id)
        .single();

      if (error) {
        console.error("Error fetching proposal with client:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        return null;
      }

      // Transform the nested client object
      const clientData = proposal.client as {
        id: string;
        name: string;
        contact_email: string | null;
        company_name: string | null;
      } | null;

      if (!clientData) {
        return null;
      }

      return {
        ...proposal,
        client: {
          id: clientData.id,
          name: clientData.name,
          email: clientData.contact_email || "",
          company_name: clientData.company_name,
        },
      } as ProposalWithClient;
    } catch (error) {
      console.error("Unexpected error in getProposalWithClient:", error);
      return null;
    }
  }
);

// =============================================================================
// LIST PROPOSALS
// =============================================================================

/**
 * List all proposals for the current studio.
 * Supports filtering by status, client, and search term.
 */
export const listProposals = cache(
  async (filters?: ListProposalsFilters): Promise<ProposalListItem[]> => {
    try {
      const { context } = await getTenantContext();
      const studio = requireStudioMember(context);
      const supabase = await createClient();

      // Build query with client join
      let query = supabase
        .from("proposals")
        .select(`
          id,
          public_id,
          title,
          status,
          total_amount,
          currency,
          sent_at,
          viewed_at,
          accepted_at,
          created_at,
          updated_at,
          client:clients(id, name, contact_email, company_name)
        `)
        .eq("studio_id", studio.id)
        .order("created_at", { ascending: false });

      // Apply status filter
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      // Apply client filter
      if (filters?.client_id) {
        query = query.eq("client_id", filters.client_id);
      }

      // Apply search filter (searches title)
      if (filters?.search) {
        query = query.ilike("title", `%${filters.search}%`);
      }

      const { data: proposals, error } = await query;

      if (error) {
        console.error("Error listing proposals:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        return [];
      }

      // Transform results to ProposalListItem format
      return (proposals || []).map((p: any) => ({
        id: p.id,
        public_id: p.public_id,
        title: p.title,
        status: p.status,
        total_amount: p.total_amount,
        currency: p.currency,
        sent_at: p.sent_at,
        viewed_at: p.viewed_at,
        accepted_at: p.accepted_at,
        created_at: p.created_at,
        updated_at: p.updated_at,
        client: p.client
          ? {
              id: p.client.id,
              name: p.client.name,
              contact_email: p.client.contact_email,
              company_name: p.client.company_name,
            }
          : {
              id: "",
              name: "Unknown Client",
              contact_email: null,
              company_name: null,
            },
      }));
    } catch (error) {
      console.error("Unexpected error in listProposals:", error);
      return [];
    }
  }
);

// =============================================================================
// GET PROPOSAL BY PUBLIC ID (for public viewer)
// =============================================================================

/**
 * Get a proposal by its public ID (for the public viewer page).
 * This doesn't require authentication - it's for clients viewing proposals.
 */
export async function getProposalByPublicId(
  publicId: string
): Promise<ProposalWithClient | null> {
  try {
    // Create an unauthenticated client for public access
    const supabase = await createClient();

    const { data: proposal, error } = await supabase
      .from("proposals")
      .select(`
        *,
        client:clients(id, name, contact_email, company_name)
      `)
      .eq("public_id", publicId)
      .single();

    if (error) {
      console.error("Error fetching proposal by public_id:", error);
      return null;
    }

    // Transform the nested client object
    const clientData = proposal.client as {
      id: string;
      name: string;
      contact_email: string | null;
      company_name: string | null;
    } | null;

    if (!clientData) {
      return null;
    }

    return {
      ...proposal,
      client: {
        id: clientData.id,
        name: clientData.name,
        email: clientData.contact_email || "",
        company_name: clientData.company_name,
      },
    } as ProposalWithClient;
  } catch (error) {
    console.error("Unexpected error in getProposalByPublicId:", error);
    return null;
  }
}

// =============================================================================
// GET PROPOSAL TEMPLATES
// =============================================================================

/**
 * Get all proposal templates for the current studio.
 */
export const getProposalTemplates = cache(async () => {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    const { data: templates, error } = await supabase
      .from("proposal_templates")
      .select("*")
      .eq("studio_id", studio.id)
      .order("name");

    if (error) {
      console.error("Error fetching proposal templates:", error);
      return [];
    }

    return templates;
  } catch (error) {
    console.error("Unexpected error in getProposalTemplates:", error);
    return [];
  }
});
