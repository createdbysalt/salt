/**
 * Bridge Queries
 *
 * Server-side queries for Spaces data.
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
 * 1. Custom domain (if host is not usesalt.io)
 * 2. Returns null if no studio found (will use default branding)
 */
export async function getStudioBrandingForLogin(
  host: string
): Promise<StudioBrandingForLogin | null> {
  // Skip if this is a usesalt.io or localhost domain
  if (host.includes("usesalt") || host.includes("localhost") || host.includes("lvh.me")) {
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
 * Used on table.usesalt.io or localhost.
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
 * Salt branding for login when studio has no custom branding.
 */
export function getSaltBranding(): StudioBrandingForLogin {
  return {
    studioId: "",
    studioName: "Salt",
    supportEmail: "support@usesalt.io",
    branding: resolveBrandingConfig(null), // Uses default Salt colors
  };
}

/**
 * Get studio branding by slug for the Bridge login page.
 *
 * Used for URLs like table.usesalt.io/saltstudio
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
    url: `/table/projects/${p.id}`,
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
    .from("portal_client_subscriptions")
    .select("id, description, amount_cents, interval, status, current_period_end, stripe_customer_id, studio_id")
    .eq("client_id", clientId)
    .in("status", ["active", "trialing", "pending", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1);

  // Get recent invoices for this client
  const { data: invoices } = await supabase
    .from("portal_invoices")
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

// ============================================================================
// Overview Queries
// ============================================================================

export interface BridgeActionItem {
  id: string;
  type: "invoice" | "message" | "approval";
  title: string;
  description: string;
  url: string;
  urgency: "high" | "medium" | "low";
  createdAt: string;
}

export interface BridgeProjectOverview {
  id: string;
  name: string;
  status: "active" | "on_hold" | "completed" | "draft";
  currentPhase: string | null;
  totalPhases: number;
  completedPhases: number;
  progressPercent: number;
  nextMilestone: {
    name: string;
    dueDate: string | null;
  } | null;
  teamMembers: Array<{
    id: string;
    name: string;
    avatarUrl: string | null;
  }>;
}

export interface BridgeActivityItem {
  id: string;
  type: "file" | "message" | "milestone" | "invoice";
  title: string;
  description: string | null;
  projectId: string | null;
  projectName: string | null;
  actorName: string | null;
  actorAvatarUrl: string | null;
  createdAt: string;
  url: string;
  metadata?: {
    fileType?: string;
    mimeType?: string;
  };
}

export interface BridgeTeamMessage {
  id: string;
  message: string;
  authorName: string;
  authorAvatarUrl: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface BridgeOverviewData {
  actionItems: BridgeActionItem[];
  projects: BridgeProjectOverview[];
  recentActivity: BridgeActivityItem[];
  teamMessage: BridgeTeamMessage | null;
  stats: {
    unreadMessages: number;
    totalFiles: number;
    outstandingBalance: number;
    currency: string;
  };
}

/**
 * Get overview data for the Bridge dashboard.
 *
 * Aggregates:
 * - Action items (unpaid invoices, unread messages)
 * - Projects with progress
 * - Recent activity (files, messages, milestones)
 * - Pinned team message (if any)
 *
 * @param clientId - The client ID
 * @param userId - The authenticated user ID (for read states)
 * @returns Overview data for the dashboard
 */
export async function getBridgeOverviewData(
  clientId: string,
  userId: string
): Promise<BridgeOverviewData> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  // Fetch all data in parallel
  const [
    actionItemsResult,
    projectsResult,
    activityResult,
    teamMessageResult,
    statsResult,
  ] = await Promise.all([
    getBridgeActionItems(adminSupabase, clientId, userId),
    getBridgeProjectsOverview(adminSupabase, clientId),
    getBridgeRecentActivity(adminSupabase, clientId),
    getBridgeTeamMessage(adminSupabase, clientId),
    getBridgeStats(adminSupabase, supabase, clientId, userId),
  ]);

  return {
    actionItems: actionItemsResult,
    projects: projectsResult,
    recentActivity: activityResult,
    teamMessage: teamMessageResult,
    stats: statsResult,
  };
}

/**
 * Get action items that need client attention.
 */
async function getBridgeActionItems(
  supabase: ReturnType<typeof createAdminClient>,
  clientId: string,
  userId: string
): Promise<BridgeActionItem[]> {
  const items: BridgeActionItem[] = [];

  // Get unpaid invoices
  const { data: invoices } = await supabase
    .from("portal_invoices")
    .select("id, description, amount_cents, currency, due_date, created_at")
    .eq("client_id", clientId)
    .in("status", ["sent", "viewed"])
    .order("due_date", { ascending: true })
    .limit(5);

  for (const inv of invoices || []) {
    const isOverdue = inv.due_date && new Date(inv.due_date) < new Date();
    const amount = (inv.amount_cents / 100).toLocaleString("en-US", {
      style: "currency",
      currency: inv.currency || "USD",
    });

    items.push({
      id: inv.id,
      type: "invoice",
      title: `Invoice ${inv.description || ""}`.trim(),
      description: `${amount} due ${inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "now"}`,
      url: "/table/settings/billing",
      urgency: isOverdue ? "high" : "medium",
      createdAt: inv.created_at,
    });
  }

  // Get unread message count (we'll show a single action item if there are any)
  const { count: unreadCount } = await supabase
    .from("conversation_messages")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .not("sender_id", "eq", userId);

  // Check which are unread by this user
  const { data: readStates } = await supabase
    .from("inbox_read_states")
    .select("source_id, read_at")
    .eq("user_id", userId)
    .eq("source_table", "conversation_messages");

  const readMessageIds = new Set(
    (readStates || []).filter((r) => r.read_at).map((r) => r.source_id)
  );

  // Get actual unread messages
  const { data: messages } = await supabase
    .from("conversation_messages")
    .select("id, created_at")
    .eq("client_id", clientId)
    .not("sender_id", "eq", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  const unreadMessages = (messages || []).filter(
    (m) => !readMessageIds.has(m.id)
  );

  if (unreadMessages.length > 0) {
    items.push({
      id: "unread-messages",
      type: "message",
      title: `${unreadMessages.length} unread message${unreadMessages.length > 1 ? "s" : ""}`,
      description: "From your team",
      url: "/table/inbox",
      urgency: "medium",
      createdAt: unreadMessages[0].created_at,
    });
  }

  // Sort by urgency then date
  items.sort((a, b) => {
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return items;
}

/**
 * Get projects with progress overview.
 */
async function getBridgeProjectsOverview(
  supabase: ReturnType<typeof createAdminClient>,
  clientId: string
): Promise<BridgeProjectOverview[]> {
  // Get projects with milestones
  const { data: projects } = await supabase
    .from("projects")
    .select(`
      id,
      name,
      status,
      project_milestones (
        id,
        name,
        status,
        due_date,
        sort_order
      )
    `)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .in("status", ["active", "on_hold", "draft", "signed"])
    .order("created_at", { ascending: false });

  if (!projects || projects.length === 0) {
    return [];
  }

  // Get team members for these projects
  const projectIds = projects.map((p) => p.id);
  const { data: assignments } = await supabase
    .from("project_assignments")
    .select(`
      project_id,
      user_id,
      profiles:user_id (
        id,
        full_name,
        avatar_url
      )
    `)
    .in("project_id", projectIds);

  // Group team members by project
  const teamByProject = new Map<
    string,
    Array<{ id: string; name: string; avatarUrl: string | null }>
  >();
  for (const assignment of assignments || []) {
    const profile = assignment.profiles as any;
    if (profile) {
      const existing = teamByProject.get(assignment.project_id) || [];
      existing.push({
        id: profile.id,
        name: profile.full_name || "Team Member",
        avatarUrl: profile.avatar_url,
      });
      teamByProject.set(assignment.project_id, existing);
    }
  }

  return projects.map((project) => {
    const milestones = (project.project_milestones || []) as Array<{
      id: string;
      name: string;
      status: string;
      due_date: string | null;
      sort_order: number;
    }>;

    // Sort milestones by order
    milestones.sort((a, b) => a.sort_order - b.sort_order);

    const completedMilestones = milestones.filter(
      (m) => m.status === "complete"
    );
    const currentMilestone = milestones.find(
      (m) => m.status === "in_progress"
    );
    const nextMilestone =
      milestones.find((m) => m.status === "not_started") || currentMilestone;

    const totalPhases = milestones.length || 1;
    const completedPhases = completedMilestones.length;
    const progressPercent = Math.round((completedPhases / totalPhases) * 100);

    // Map status for client display
    const clientStatus =
      project.status === "signed" ? "active" : (project.status as any);

    return {
      id: project.id,
      name: project.name,
      status: clientStatus,
      currentPhase: currentMilestone?.name || null,
      totalPhases,
      completedPhases,
      progressPercent,
      nextMilestone: nextMilestone
        ? {
            name: nextMilestone.name,
            dueDate: nextMilestone.due_date,
          }
        : null,
      teamMembers: teamByProject.get(project.id) || [],
    };
  });
}

/**
 * Get recent activity for the client.
 */
async function getBridgeRecentActivity(
  supabase: ReturnType<typeof createAdminClient>,
  clientId: string
): Promise<BridgeActivityItem[]> {
  const items: BridgeActivityItem[] = [];
  const limit = 10;

  // Get recent files
  const { data: files } = await supabase
    .from("project_files")
    .select(`
      id,
      file_name,
      file_type,
      mime_type,
      created_at,
      project_id,
      uploaded_by,
      project:projects(name),
      uploader:profiles!uploaded_by(full_name, avatar_url)
    `)
    .eq("client_id", clientId)
    .eq("shared_with_client", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  for (const file of files || []) {
    const project = file.project as any;
    const uploader = file.uploader as any;
    items.push({
      id: file.id,
      type: "file",
      title: file.file_name,
      description: null,
      projectId: file.project_id,
      projectName: project?.name || null,
      actorName: uploader?.full_name || null,
      actorAvatarUrl: uploader?.avatar_url || null,
      createdAt: file.created_at,
      url: "/table/files",
      metadata: {
        fileType: file.file_type,
        mimeType: file.mime_type,
      },
    });
  }

  // Get recent messages (last message per conversation)
  const { data: messages } = await supabase
    .from("conversation_messages")
    .select(`
      id,
      content,
      created_at,
      sender_id,
      conversation:conversations!inner(
        id,
        project_id,
        project:projects(name)
      ),
      sender:profiles!sender_id(full_name, avatar_url)
    `)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);

  for (const msg of messages || []) {
    const conversation = msg.conversation as any;
    const sender = msg.sender as any;
    const project = conversation?.project as any;
    items.push({
      id: msg.id,
      type: "message",
      title: "New message",
      description:
        msg.content?.substring(0, 100) + (msg.content?.length > 100 ? "..." : ""),
      projectId: conversation?.project_id || null,
      projectName: project?.name || null,
      actorName: sender?.full_name || null,
      actorAvatarUrl: sender?.avatar_url || null,
      createdAt: msg.created_at,
      url: "/table/inbox",
    });
  }

  // Get recent milestone completions
  const { data: milestones } = await supabase
    .from("project_milestones")
    .select(`
      id,
      name,
      completed_at,
      project:projects!inner(id, name, client_id)
    `)
    .eq("status", "complete")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(limit);

  // Filter milestones by client (since we can't filter by nested client_id directly)
  const clientMilestones = (milestones || []).filter(
    (m) => (m.project as any)?.client_id === clientId
  );

  for (const milestone of clientMilestones) {
    const project = milestone.project as any;
    items.push({
      id: milestone.id,
      type: "milestone",
      title: milestone.name,
      description: "Milestone completed",
      projectId: project?.id || null,
      projectName: project?.name || null,
      actorName: null,
      actorAvatarUrl: null,
      createdAt: milestone.completed_at!,
      url: `/table/projects/${project?.id}`,
    });
  }

  // Sort all items by date and limit
  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return items.slice(0, limit);
}

/**
 * Get pinned team message for the client.
 *
 * Resolution order:
 * 1. Client-specific message (client_id = clientId)
 * 2. Studio default message (client_id IS NULL)
 * 3. No message
 */
async function getBridgeTeamMessage(
  supabase: ReturnType<typeof createAdminClient>,
  clientId: string
): Promise<BridgeTeamMessage | null> {
  try {
    const now = new Date().toISOString();

    // First, try to get client-specific announcement
    const { data: clientAnnouncement } = await supabase
      .from("client_announcements")
      .select(`
        id,
        message,
        created_at,
        expires_at,
        author:profiles!author_id(full_name, avatar_url)
      `)
      .eq("client_id", clientId)
      .is("dismissed_at", null)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (clientAnnouncement) {
      const author = clientAnnouncement.author as any;
      return {
        id: clientAnnouncement.id,
        message: clientAnnouncement.message,
        authorName: author?.full_name || "Your Team",
        authorAvatarUrl: author?.avatar_url || null,
        createdAt: clientAnnouncement.created_at,
        expiresAt: clientAnnouncement.expires_at,
      };
    }

    // No client-specific message, try studio default
    // First get the studio_id for this client
    const { data: client } = await supabase
      .from("clients")
      .select("studio_id")
      .eq("id", clientId)
      .single();

    if (!client?.studio_id) return null;

    // Get studio default (client_id IS NULL)
    const { data: studioDefault } = await supabase
      .from("client_announcements")
      .select(`
        id,
        message,
        created_at,
        expires_at,
        author:profiles!author_id(full_name, avatar_url)
      `)
      .eq("studio_id", client.studio_id)
      .is("client_id", null)
      .is("dismissed_at", null)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!studioDefault) return null;

    const author = studioDefault.author as any;
    return {
      id: studioDefault.id,
      message: studioDefault.message,
      authorName: author?.full_name || "Your Team",
      authorAvatarUrl: author?.avatar_url || null,
      createdAt: studioDefault.created_at,
      expiresAt: studioDefault.expires_at,
    };
  } catch {
    // Table doesn't exist yet or other error
    return null;
  }
}

/**
 * Get summary stats for the overview.
 */
async function getBridgeStats(
  adminSupabase: ReturnType<typeof createAdminClient>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  userId: string
): Promise<BridgeOverviewData["stats"]> {
  // Get unread message count
  const { data: messages } = await adminSupabase
    .from("conversation_messages")
    .select("id")
    .eq("client_id", clientId)
    .not("sender_id", "eq", userId);

  const { data: readStates } = await supabase
    .from("inbox_read_states")
    .select("source_id, read_at")
    .eq("user_id", userId)
    .eq("source_table", "conversation_messages");

  const readMessageIds = new Set(
    (readStates || []).filter((r) => r.read_at).map((r) => r.source_id)
  );

  const unreadMessages = (messages || []).filter(
    (m) => !readMessageIds.has(m.id)
  ).length;

  // Get file count
  const { count: fileCount } = await adminSupabase
    .from("project_files")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("shared_with_client", true);

  // Get outstanding balance
  const { data: invoices } = await adminSupabase
    .from("portal_invoices")
    .select("amount_cents, currency")
    .eq("client_id", clientId)
    .in("status", ["sent", "viewed"]);

  const outstandingBalance = (invoices || []).reduce(
    (sum, inv) => sum + inv.amount_cents,
    0
  );
  const currency = invoices?.[0]?.currency || "USD";

  return {
    unreadMessages,
    totalFiles: fileCount || 0,
    outstandingBalance,
    currency,
  };
}
