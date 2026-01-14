"use server";

import { createClient } from "@/libs/supabase/server";
import { getTenantContext } from "@/libs/tenancy";
import { requireStudioMember } from "@/libs/tenancy/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Check if a hostname matches or is a subdomain of a blocked domain.
 * Uses proper DNS-style matching instead of substring checks.
 */
function isBlockedDomain(hostname: string): boolean {
  const blockedDomains = ["saltcore.io", "localhost"];

  // Normalize hostname to lowercase
  const normalizedHostname = hostname.toLowerCase();

  for (const blocked of blockedDomains) {
    // Exact match
    if (normalizedHostname === blocked) {
      return true;
    }
    // Subdomain match: hostname ends with ".blocked"
    if (normalizedHostname.endsWith(`.${blocked}`)) {
      return true;
    }
  }

  return false;
}

const domainSchema = z.object({
  hostname: z
    .string()
    .min(3, "Domain must be at least 3 characters")
    .regex(
      /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/,
      "Invalid domain format"
    )
    .refine(
      (val) => !isBlockedDomain(val),
      "Cannot use saltcore.io or localhost domains"
    ),
});

/**
 * Add a custom domain for the studio's Bridge portal
 */
export async function addCustomDomain(formData: FormData) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Validate input
    const rawData = {
      hostname: (formData.get("hostname") as string)?.toLowerCase().trim(),
    };

    const validatedData = domainSchema.parse(rawData);

    // Check if domain already exists
    const { data: existingDomain } = await supabase
      .from("studio_domains")
      .select("id")
      .eq("hostname", validatedData.hostname)
      .single();

    if (existingDomain) {
      return { error: "This domain is already registered" };
    }

    // Create domain record
    const { data: domain, error: insertError } = await supabase
      .from("studio_domains")
      .insert({
        studio_id: studio.id,
        hostname: validatedData.hostname,
        status: "pending",
        verification_method: "txt", // Default to TXT record verification
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating domain:", insertError);
      return { error: "Failed to add domain" };
    }

    revalidatePath("/dashboard/settings/domains");
    return {
      success: true,
      domain,
      message: "Domain added. Please verify ownership via DNS.",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Get DNS verification instructions for a domain
 */
export async function getDomainVerificationInstructions(domainId: string) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Verify domain belongs to this studio
    const { data: domain, error } = await supabase
      .from("studio_domains")
      .select("*")
      .eq("id", domainId)
      .eq("studio_id", studio.id)
      .single();

    if (error || !domain) {
      return { error: "Domain not found" };
    }

    // Call the database function to get instructions
    const { data: instructions, error: funcError } = await supabase.rpc(
      "get_domain_verification_instructions",
      { domain_id: domainId }
    );

    if (funcError) {
      console.error("Error getting verification instructions:", funcError);
      return { error: "Failed to get verification instructions" };
    }

    return {
      success: true,
      instructions,
      domain,
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Verify domain ownership (triggers DNS check)
 */
export async function verifyDomain(domainId: string) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Verify domain belongs to this studio
    const { data: domain, error } = await supabase
      .from("studio_domains")
      .select("id, studio_id")
      .eq("id", domainId)
      .eq("studio_id", studio.id)
      .single();

    if (error || !domain) {
      return { error: "Domain not found" };
    }

    // Call the database function to verify domain
    const { data: result, error: verifyError } = await supabase.rpc(
      "verify_studio_domain",
      { domain_id: domainId }
    );

    if (verifyError) {
      console.error("Error verifying domain:", verifyError);
      return { error: "Failed to verify domain" };
    }

    revalidatePath("/dashboard/settings/domains");
    return {
      success: true,
      result,
      message: "Domain verification initiated. This may take a few minutes.",
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Remove a custom domain
 */
export async function removeCustomDomain(domainId: string) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Delete domain (RLS ensures it belongs to this studio)
    const { error } = await supabase
      .from("studio_domains")
      .delete()
      .eq("id", domainId)
      .eq("studio_id", studio.id);

    if (error) {
      console.error("Error deleting domain:", error);
      return { error: "Failed to remove domain" };
    }

    revalidatePath("/dashboard/settings/domains");
    return { success: true, message: "Domain removed successfully" };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * List all custom domains for the studio
 */
export async function listCustomDomains() {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    const { data: domains, error } = await supabase
      .from("studio_domains")
      .select("*")
      .eq("studio_id", studio.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error listing domains:", error);
      return { error: "Failed to load domains" };
    }

    return { success: true, domains };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

