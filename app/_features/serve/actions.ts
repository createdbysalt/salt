"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import type { BridgeBrandingConfig } from "@/app/_lib/table/branding-config";
import { generateBrandColorScale, isValidHexColor } from "@/app/_lib/table/color-scale";
import {
  addDomain,
  removeDomain,
  verifyDomain,
  getDomainStatus,
  getDNSInstructions,
} from "@/app/_lib/vercel/domain-manager";

// ============================================================================
// BRANDING ACTIONS
// ============================================================================

/**
 * Update Bridge branding configuration for a studio
 */
export async function updateBridgeBranding(
  studioId: string,
  branding: BridgeBrandingConfig
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Verify user has permission to update studio
  const { data: membership, error: membershipError } = await supabase
    .from("studio_members")
    .select("role")
    .eq("studio_id", studioId)
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (membershipError || !membership) {
    return { success: false, error: "You don't have permission to update this studio" };
  }

  if (!["owner", "admin"].includes(membership.role)) {
    return { success: false, error: "Only owners and admins can update branding" };
  }

  // Generate color scale if accent color is provided
  let processedBranding = { ...branding };
  if (branding.colors?.accent && isValidHexColor(branding.colors.accent)) {
    const colorScale = generateBrandColorScale(branding.colors.accent);
    processedBranding = {
      ...branding,
      colors: {
        ...branding.colors,
        scale: colorScale,
      },
    };
  }

  // Update branding
  const { error } = await supabase
    .from("studios")
    .update({ bridge_branding: processedBranding })
    .eq("id", studioId);

  if (error) {
    console.error("Failed to update branding:", error);
    return { success: false, error: "Failed to update branding" };
  }

  revalidatePath("/serve/table/customize");
  revalidatePath("/table");

  return { success: true };
}

/**
 * Get current Bridge branding for a studio
 */
export async function getBridgeBranding(
  studioId: string
): Promise<{ branding: BridgeBrandingConfig | null; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("studios")
    .select("bridge_branding")
    .eq("id", studioId)
    .single();

  if (error) {
    return { branding: null, error: "Failed to load branding" };
  }

  return { branding: (data?.bridge_branding as BridgeBrandingConfig) || {} };
}

/**
 * Upload a branding asset (logo or favicon)
 */
export async function uploadBrandingAsset(
  studioId: string,
  assetType: "logo-light" | "logo-dark" | "favicon",
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createClient();

  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  // Validate file size (2MB max)
  if (file.size > 2 * 1024 * 1024) {
    return { success: false, error: "File size must be less than 2MB" };
  }

  // Validate file type
  const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml", "image/x-icon"];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: "Invalid file type. Use PNG, JPEG, SVG, or ICO" };
  }

  // Generate file path: {studioId}/{assetType}.{ext}
  const ext = file.name.split(".").pop() || "png";
  const filePath = `${studioId}/${assetType}.${ext}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from("bridge-branding")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) {
    console.error("Failed to upload asset:", error);
    return { success: false, error: "Failed to upload file" };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("bridge-branding")
    .getPublicUrl(data.path);

  return { success: true, url: urlData.publicUrl };
}

/**
 * Delete a branding asset
 */
export async function deleteBrandingAsset(
  studioId: string,
  assetType: "logo-light" | "logo-dark" | "favicon"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // List files in studio folder to find the asset
  const { data: files, error: listError } = await supabase.storage
    .from("bridge-branding")
    .list(studioId);

  if (listError) {
    return { success: false, error: "Failed to list assets" };
  }

  // Find file matching asset type
  const assetFile = files?.find((f) => f.name.startsWith(assetType));
  if (!assetFile) {
    return { success: true }; // Already deleted
  }

  // Delete the file
  const { error } = await supabase.storage
    .from("bridge-branding")
    .remove([`${studioId}/${assetFile.name}`]);

  if (error) {
    return { success: false, error: "Failed to delete asset" };
  }

  return { success: true };
}

// ============================================================================
// CUSTOM DOMAIN ACTIONS
// ============================================================================

/**
 * Add a custom domain for a studio's Bridge
 */
export async function addCustomDomain(
  studioId: string,
  hostname: string
): Promise<{
  success: boolean;
  domainId?: string;
  verification?: { type: string; host: string; value: string }[];
  error?: string;
}> {
  const supabase = await createClient();

  // Validate hostname format
  const hostnameRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;
  if (!hostnameRegex.test(hostname.toLowerCase())) {
    return { success: false, error: "Invalid domain format" };
  }

  // Check if domain already exists for another studio
  const { data: existingDomain } = await supabase
    .from("studio_domains")
    .select("id, studio_id")
    .eq("hostname", hostname.toLowerCase())
    .single();

  if (existingDomain) {
    if (existingDomain.studio_id === studioId) {
      return { success: false, error: "This domain is already configured for your studio" };
    }
    return { success: false, error: "This domain is already in use by another studio" };
  }

  // Add domain to Vercel
  const vercelResult = await addDomain(hostname.toLowerCase());
  if (!vercelResult.success) {
    return { success: false, error: vercelResult.error };
  }

  // Insert domain record in database
  const { data: domainRecord, error: dbError } = await supabase
    .from("studio_domains")
    .insert({
      studio_id: studioId,
      hostname: hostname.toLowerCase(),
      status: "pending",
      verification_method: "cname",
    })
    .select()
    .single();

  if (dbError) {
    // Try to clean up Vercel domain
    await removeDomain(hostname.toLowerCase());
    return { success: false, error: "Failed to save domain configuration" };
  }

  // Get DNS instructions
  const dnsInstructions = getDNSInstructions(hostname.toLowerCase(), vercelResult.verification);

  const verification = [
    { type: "CNAME", host: dnsInstructions.cname.host, value: dnsInstructions.cname.value },
  ];

  if (dnsInstructions.txt) {
    verification.push({ type: "TXT", host: dnsInstructions.txt.host, value: dnsInstructions.txt.value });
  }

  revalidatePath("/serve/table/customize");

  return {
    success: true,
    domainId: domainRecord.id,
    verification,
  };
}

/**
 * Remove a custom domain
 */
export async function removeCustomDomain(
  domainId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get domain record
  const { data: domain, error: fetchError } = await supabase
    .from("studio_domains")
    .select("hostname")
    .eq("id", domainId)
    .single();

  if (fetchError || !domain) {
    return { success: false, error: "Domain not found" };
  }

  // Remove from Vercel
  await removeDomain(domain.hostname);

  // Delete from database
  const { error: deleteError } = await supabase
    .from("studio_domains")
    .delete()
    .eq("id", domainId);

  if (deleteError) {
    return { success: false, error: "Failed to remove domain" };
  }

  revalidatePath("/serve/table/customize");

  return { success: true };
}

/**
 * Check domain verification status
 */
export async function checkDomainVerification(
  domainId: string
): Promise<{
  success: boolean;
  verified: boolean;
  sslReady: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  // Get domain record
  const { data: domain, error: fetchError } = await supabase
    .from("studio_domains")
    .select("hostname")
    .eq("id", domainId)
    .single();

  if (fetchError || !domain) {
    return { success: false, verified: false, sslReady: false, error: "Domain not found" };
  }

  // Check status with Vercel
  const status = await getDomainStatus(domain.hostname);

  if (status.error) {
    return { success: false, verified: false, sslReady: false, error: status.error };
  }

  // Update database if status changed
  if (status.verified) {
    await supabase
      .from("studio_domains")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString(),
        ssl_status: status.sslReady ? "active" : "pending",
      })
      .eq("id", domainId);
  }

  return {
    success: true,
    verified: status.verified,
    sslReady: status.sslReady,
  };
}

/**
 * Retry domain verification
 */
export async function retryDomainVerification(
  domainId: string
): Promise<{
  success: boolean;
  verified: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  // Get domain record
  const { data: domain, error: fetchError } = await supabase
    .from("studio_domains")
    .select("hostname")
    .eq("id", domainId)
    .single();

  if (fetchError || !domain) {
    return { success: false, verified: false, error: "Domain not found" };
  }

  // Trigger verification with Vercel
  const result = await verifyDomain(domain.hostname);

  if (!result.success) {
    return { success: false, verified: false, error: result.error };
  }

  // Update database if verified
  if (result.verified) {
    await supabase
      .from("studio_domains")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString(),
      })
      .eq("id", domainId);
  }

  revalidatePath("/serve/table/customize");

  return {
    success: true,
    verified: result.verified,
  };
}

/**
 * Get custom domains for a studio
 */
export async function getStudioDomains(studioId: string): Promise<{
  domains: Array<{
    id: string;
    hostname: string;
    status: string;
    ssl_status: string | null;
    verified_at: string | null;
    created_at: string;
  }>;
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("studio_domains")
    .select("id, hostname, status, ssl_status, verified_at, created_at")
    .eq("studio_id", studioId)
    .order("created_at", { ascending: false });

  if (error) {
    return { domains: [], error: "Failed to load domains" };
  }

  return { domains: data || [] };
}
