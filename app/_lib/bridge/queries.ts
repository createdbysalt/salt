/**
 * Bridge Queries
 *
 * Server-side queries for Bridge client portal data.
 */

import { createClient } from "@/app/_lib/supabase/server";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getCustomerPaymentMethod } from "@/app/_lib/stripe/stripe-connect";
import {
  type BridgeBrandingConfig,
  resolveBrandingConfig,
  type ResolvedBrandingConfig,
} from "./branding-config";

export interface StudioBrandingForLogin {
  studioId: string;
  studioName: string;
  supportEmail: string | null;
  branding: ResolvedBrandingConfig;
}

/**
 * Get studio branding for the Bridge login page.
 *
 * Resolves studio from:
 * 1. Custom domain (if host is not saltcore.io)
 * 2. Returns null if no studio found (will use default branding)
 */
export async function getStudioBrandingForLogin(
  host: string
): Promise<StudioBrandingForLogin | null> {
  // Skip if this is a saltcore.io or localhost domain
  if (host.includes("saltcore") || host.includes("localhost") || host.includes("lvh.me")) {
    return null;
  }

  const supabase = await createClient();

  // Strip port if present
  const hostname = host.split(":")[0];

  // Look up verified custom domain
  const { data: domain, error: domainError } = await supabase
    .from("studio_domains")
    .select("studio_id")
    .eq("hostname", hostname)
    .eq("status", "verified")
    .single();

  if (domainError || !domain) {
    return null;
  }

  // Get studio details
  const { data: studio, error: studioError } = await supabase
    .from("studios")
    .select("id, name, support_email, bridge_branding")
    .eq("id", domain.studio_id)
    .single();

  if (studioError || !studio) {
    return null;
  }

  return {
    studioId: studio.id,
    studioName: studio.name,
    supportEmail: studio.support_email,
    branding: resolveBrandingConfig(studio.bridge_branding as BridgeBrandingConfig),
  };
}

/**
 * Default branding for login when no studio is resolved.
 * Used on bridge.saltcore.io or localhost.
 */
export function getDefaultLoginBranding(): StudioBrandingForLogin {
  return {
    studioId: "",
    studioName: "Your Studio",
    supportEmail: null,
    branding: resolveBrandingConfig(null),
  };
}

/**
 * Salt Core branding for login when studio has no custom branding.
 * Shows "The Bridge" branding instead of generic "Your Studio".
 */
export function getSaltCoreBranding(): StudioBrandingForLogin {
  return {
    studioId: "",
    studioName: "The Bridge",
    supportEmail: "support@saltcore.io",
    branding: resolveBrandingConfig(null), // Uses default Salt Core colors
  };
}

/**
 * Get studio branding by slug for the Bridge login page.
 *
 * Used for URLs like bridge.saltcore.io/saltstudio
 *
 * @param slug - The studio slug from the URL
 * @returns Studio branding if found, null if slug doesn't exist
 */
export async function getStudioBrandingBySlug(
  slug: string
): Promise<StudioBrandingForLogin | null> {
  const supabase = createAdminClient();

  const { data: studio, error } = await supabase
    .from("studios")
    .select("id, name, support_email, bridge_branding")
    .eq("slug", slug)
    .single();

  if (error || !studio) {
    return null;
  }

  const branding = resolveBrandingConfig(
    studio.bridge_branding as BridgeBrandingConfig
  );

  return {
    studioId: studio.id,
    studioName: studio.name,
    supportEmail: studio.support_email,
    branding,
  };
}

/**
 * Get studio branding for authenticated Bridge users.
 *
 * @param studioId - The studio ID to fetch branding for
 * @returns Resolved branding config or default if not found
 */
export async function getStudioBrandingById(
  studioId: string
): Promise<ResolvedBrandingConfig> {
  // Use admin client - branding is public info needed by Bridge clients
  // Regular client is blocked by RLS for client users
  const supabase = createAdminClient();

  const { data: studio, error } = await supabase
    .from("studios")
    .select("bridge_branding")
    .eq("id", studioId)
    .single();

  if (error || !studio) {
    return resolveBrandingConfig(null);
  }

  return resolveBrandingConfig(studio.bridge_branding as BridgeBrandingConfig);
}

/**
 * Get studio ID from a client ID.
 *
 * @param clientId - The client ID to look up
 * @returns The studio ID or null if not found
 */
export async function getStudioIdFromClient(
  clientId: string
): Promise<string | null> {
  // Use admin client to ensure we can read the client
  const supabase = createAdminClient();

  const { data: client, error } = await supabase
    .from("clients")
    .select("studio_id")
    .eq("id", clientId)
    .single();

  if (error || !client) {
    return null;
  }

  return client.studio_id;
}

export interface BridgeUserInfo {
  name: string;
  email: string;
  avatar: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  companyName: string | null;
  jobTitle: string | null;
  timezone: string;
  preferredContactMethod: "email" | "phone" | "portal";
}

export interface BridgeStudioInfo {
  name: string;
  logoUrl: string | null;
}

export interface BridgeProject {
  id: string;
  name: string;
  url: string;
}

/**
 * Get studio info for Bridge sidebar header.
 *
 * @param studioId - The studio ID
 * @returns Studio name and logo URL for light mode
 */
export async function getBridgeStudioInfo(
  studioId: string
): Promise<BridgeStudioInfo> {
  // Use admin client - studio branding is public info for Bridge clients
  const supabase = createAdminClient();

  // Get studio name and bridge_branding (contains logo URLs)
  const { data: studio, error: studioError } = await supabase
    .from("studios")
    .select("name, bridge_branding")
    .eq("id", studioId)
    .single();

  if (studioError) {
    console.error("[getBridgeStudioInfo] Error:", studioError.message);
    return { name: "Studio", logoUrl: null };
  }

  // Extract logo URL from bridge_branding JSONB
  // For light mode Bridge, use logo.lightUrl
  const branding = studio?.bridge_branding as {
    logo?: { lightUrl?: string; darkUrl?: string };
  } | null;

  const logoUrl = branding?.logo?.lightUrl || null;

  return {
    name: studio?.name || "Studio",
    logoUrl,
  };
}

/**
 * Get projects for a client (for Bridge sidebar).
 *
 * @param clientId - The client ID
 * @returns List of projects with id, name, and url
 */
export async function getBridgeProjects(
  clientId: string
): Promise<BridgeProject[]> {
  // Use admin client to bypass RLS for fetching client's projects
  const supabase = createAdminClient();

  // Show all non-deleted, non-archived projects
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .not("status", "eq", "archived")
    .order("name");

  return (projects || []).map((p) => ({
    id: p.id,
    name: p.name,
    url: `/bridge/projects/${p.id}`,
  }));
}

/**
 * Get user info for the Bridge sidebar.
 *
 * @param userId - The authenticated user ID
 * @returns User info with name, email, and avatar
 */
export async function getBridgeUserInfo(
  userId: string
): Promise<BridgeUserInfo> {
  const supabase = await createClient();

  // Get email from client_users
  const { data: clientUser } = await supabase
    .from("client_users")
    .select("email")
    .eq("user_id", userId)
    .limit(1)
    .single();

  // Get profile data including new contact fields
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      full_name,
      first_name,
      last_name,
      display_name,
      avatar_url,
      phone,
      company_name,
      job_title,
      timezone,
      preferred_contact_method
    `)
    .eq("id", userId)
    .single();

  const email = clientUser?.email || "";
  const firstName = profile?.first_name || "";
  const lastName = profile?.last_name || "";
  const name =
    profile?.full_name ||
    profile?.display_name ||
    firstName ||
    email.split("@")[0] ||
    "User";

  return {
    name,
    email,
    avatar: profile?.avatar_url || null,
    firstName,
    lastName,
    phone: profile?.phone || null,
    companyName: profile?.company_name || null,
    jobTitle: profile?.job_title || null,
    timezone: profile?.timezone || "America/New_York",
    preferredContactMethod: (profile?.preferred_contact_method as "email" | "phone" | "portal") || "email",
  };
}

// ============================================================================
// Billing Queries
// ============================================================================

export interface BridgePaymentMethod {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface BridgeRetainer {
  id: string;
  description: string | null;
  amountCents: number;
  interval: "month" | "year";
  status: "active" | "trialing" | "past_due" | "canceled" | "pending";
  currentPeriodEnd: string | null;
  paymentMethod: BridgePaymentMethod | null;
}

export interface BridgeInvoice {
  id: string;
  description: string | null;
  amountCents: number;
  currency: string;
  status: "draft" | "sent" | "viewed" | "paid" | "failed";
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface BridgeBillingSummary {
  totalPaidCents: number;
  outstandingCents: number;
  unpaidCount: number;
  currency: string;
}

export interface BridgeBillingData {
  retainer: BridgeRetainer | null;
  invoices: BridgeInvoice[];
  summary: BridgeBillingSummary;
}

/**
 * Get billing data for a Bridge client.
 *
 * Fetches:
 * - Active/pending retainer (subscription)
 * - Recent invoices (last 10)
 * - Payment summary totals
 *
 * @param clientId - The client ID
 * @returns Billing data with retainer, invoices, and summary
 */
export async function getBridgeBillingData(
  clientId: string
): Promise<BridgeBillingData> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  // Get retainers for this client - find active or pending one
  // Include stripe_customer_id and studio_id for payment method lookup
  const { data: retainers } = await supabase
    .from("bridge_client_subscriptions")
    .select("id, description, amount_cents, interval, status, current_period_end, stripe_customer_id, studio_id")
    .eq("client_id", clientId)
    .in("status", ["active", "trialing", "pending", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1);

  // Get recent invoices for this client
  const { data: invoices } = await supabase
    .from("bridge_invoices")
    .select("id, description, amount_cents, currency, status, due_date, paid_at, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch payment method if there's an active retainer
  let paymentMethod: BridgePaymentMethod | null = null;
  const retainerData = retainers?.[0];

  if (retainerData && retainerData.stripe_customer_id && ["active", "trialing"].includes(retainerData.status)) {
    // Get the studio owner's Connect account ID
    const { data: studio } = await adminSupabase
      .from("studios")
      .select("owner_id")
      .eq("id", retainerData.studio_id)
      .single();

    if (studio?.owner_id) {
      const { data: profile } = await adminSupabase
        .from("profiles")
        .select("stripe_connect_account_id")
        .eq("id", studio.owner_id)
        .single();

      if (profile?.stripe_connect_account_id) {
        paymentMethod = await getCustomerPaymentMethod(
          retainerData.stripe_customer_id,
          profile.stripe_connect_account_id
        );
      }
    }
  }

  // Map retainer to clean interface
  const retainer: BridgeRetainer | null = retainerData
    ? {
        id: retainerData.id,
        description: retainerData.description,
        amountCents: retainerData.amount_cents,
        interval: retainerData.interval as "month" | "year",
        status: retainerData.status as BridgeRetainer["status"],
        currentPeriodEnd: retainerData.current_period_end,
        paymentMethod,
      }
    : null;

  // Map invoices to clean interface
  const mappedInvoices: BridgeInvoice[] = (invoices || []).map((inv) => ({
    id: inv.id,
    description: inv.description,
    amountCents: inv.amount_cents,
    currency: inv.currency || "USD",
    status: inv.status as BridgeInvoice["status"],
    dueDate: inv.due_date,
    paidAt: inv.paid_at,
    createdAt: inv.created_at,
  }));

  // Calculate summary
  const paidInvoices = mappedInvoices.filter((inv) => inv.status === "paid");
  const unpaidInvoices = mappedInvoices.filter((inv) =>
    ["sent", "viewed"].includes(inv.status)
  );

  const summary: BridgeBillingSummary = {
    totalPaidCents: paidInvoices.reduce((sum, inv) => sum + inv.amountCents, 0),
    outstandingCents: unpaidInvoices.reduce((sum, inv) => sum + inv.amountCents, 0),
    unpaidCount: unpaidInvoices.length,
    currency: mappedInvoices[0]?.currency || "USD",
  };

  return {
    retainer,
    invoices: mappedInvoices,
    summary,
  };
}

// ============================================================================
// Files Queries
// ============================================================================

export interface BridgeFileTag {
  id: string;
  label: string;
  color: string;
}

export interface BridgeFile {
  id: string;
  fileName: string;
  fileType: "file" | "link";
  mimeType: string | null;
  sizeBytes: number | null;
  externalUrl: string | null;
  direction: "from_client" | "to_client" | "internal";
  description: string | null;
  projectId: string | null;
  projectName: string | null;
  uploadedBy: string;
  uploadedByName: string | null;
  createdAt: string;
  tags: BridgeFileTag[];
  aiStatus: "pending" | "processing" | "completed" | "failed" | "unsupported" | null;
  aiSummary: string | null;
}

export interface BridgeFilesData {
  files: BridgeFile[];
  projects: Array<{ id: string; name: string }>;
}

/**
 * Get files shared with a Bridge client.
 *
 * Only returns files where `shared_with_client=true`.
 *
 * @param clientId - The client ID
 * @returns Files and projects for filtering
 */
export async function getBridgeClientFiles(
  clientId: string
): Promise<BridgeFilesData> {
  // Use admin client to bypass studio-member RLS
  const supabase = createAdminClient();

  // Get all shared files for this client
  const { data: files, error: filesError } = await supabase
    .from("project_files")
    .select(`
      id,
      file_name,
      file_type,
      mime_type,
      size_bytes,
      external_url,
      direction,
      description,
      project_id,
      uploaded_by,
      created_at,
      ai_status,
      ai_summary,
      project:projects(id, name)
    `)
    .eq("client_id", clientId)
    .eq("shared_with_client", true)
    .order("created_at", { ascending: false });

  if (filesError) {
    console.error("[getBridgeClientFiles] Error:", filesError.message);
    return { files: [], projects: [] };
  }

  // Get tag assignments for these files
  const fileIds = (files || []).map((f) => f.id);
  const { data: tagAssignments } = await supabase
    .from("file_tag_assignments")
    .select(`
      file_id,
      tag:file_tags(id, label, color)
    `)
    .in("file_id", fileIds.length > 0 ? fileIds : ["00000000-0000-0000-0000-000000000000"]);

  // Get uploader names
  const uploaderIds = [...new Set((files || []).map((f) => f.uploaded_by))];
  const { data: uploaders } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", uploaderIds.length > 0 ? uploaderIds : ["00000000-0000-0000-0000-000000000000"]);

  const uploaderMap = new Map(
    (uploaders || []).map((u) => [u.id, u.full_name || u.email?.split("@")[0] || "Unknown"])
  );

  // Group tags by file
  const tagsByFile = new Map<string, BridgeFileTag[]>();
  (tagAssignments || []).forEach((ta: any) => {
    if (ta.tag) {
      const existing = tagsByFile.get(ta.file_id) || [];
      existing.push({
        id: ta.tag.id,
        label: ta.tag.label,
        color: ta.tag.color,
      });
      tagsByFile.set(ta.file_id, existing);
    }
  });

  // Get projects for this client (for filter dropdown)
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("name");

  // Transform files
  const transformedFiles: BridgeFile[] = (files || []).map((f: any) => ({
    id: f.id,
    fileName: f.file_name,
    fileType: f.file_type || "file",
    mimeType: f.mime_type,
    sizeBytes: f.size_bytes,
    externalUrl: f.external_url || null,
    direction: f.direction || "internal",
    description: f.description,
    projectId: f.project_id,
    projectName: f.project?.name || null,
    uploadedBy: f.uploaded_by,
    uploadedByName: uploaderMap.get(f.uploaded_by) || "Unknown",
    createdAt: f.created_at,
    tags: tagsByFile.get(f.id) || [],
    aiStatus: f.ai_status || null,
    aiSummary: f.ai_summary || null,
  }));

  return {
    files: transformedFiles,
    projects: (projects || []).map((p) => ({ id: p.id, name: p.name })),
  };
}
