import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import { notFound } from "next/navigation";
import { getClientUnreadInfo } from "@/app/_features/messaging/actions";
import { getClientKnowledgeItems } from "./knowledge-actions";
import { ClientDetailPageClient } from "./ClientDetailPageClient";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const { studio, supabase } = await getStudioContext();

  // Get client details (without tags - tags are fetched separately)
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .eq("studio_id", studio.id)
    .single();

  if (error || !client) {
    notFound();
  }

  // Fetch tags using tag_assignments table (same pattern as clients list)
  const { data: tagAssignments } = await supabase
    .from("tag_assignments")
    .select(`
      tag:tags(id, label, color)
    `)
    .eq("entity_type", "client")
    .eq("entity_id", id);

  // Get client's projects
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description, status, created_at")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  // Get bridge portal info
  const { data: portal } = await supabase
    .from("bridge_portals")
    .select("*")
    .eq("client_id", id)
    .single();

  // Get client users
  const { data: clientUsers } = await supabase
    .from("client_users")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  // Get client invoices
  const { data: invoices } = await supabase
    .from("bridge_invoices")
    .select("id, invoice_number, amount_cents, currency, description, status, due_date, created_at, sent_at, paid_at")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  // Get client retainer (active subscription)
  const { data: retainer } = await supabase
    .from("bridge_client_subscriptions")
    .select("id, status, amount_cents, currency, interval, interval_count, description, current_period_end, cancel_at_period_end, canceled_at")
    .eq("client_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Get messaging info for this client
  const messageInfoResult = await getClientUnreadInfo(id);
  const unreadCount =
    "data" in messageInfoResult ? messageInfoResult.data.unreadCount : 0;
  const conversationId =
    "data" in messageInfoResult ? messageInfoResult.data.conversationId : null;

  // Get knowledge base items
  const knowledgeResult = await getClientKnowledgeItems(id);
  const knowledgeItems = knowledgeResult.success && knowledgeResult.data
    ? knowledgeResult.data
    : [];

  // Calculate payment totals from invoices
  const paidInvoices = (invoices || []).filter((inv) => inv.status === "paid");
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.amount_cents, 0) / 100;
  const outstandingInvoices = (invoices || []).filter((inv) =>
    inv.status === "sent" || inv.status === "viewed" || inv.status === "overdue"
  );
  const outstandingBalance = outstandingInvoices.reduce((sum, inv) => sum + inv.amount_cents, 0) / 100;
  const lastPaymentDate = paidInvoices.length > 0
    ? paidInvoices[0].paid_at
    : null;

  // Transform tags from nested structure (Supabase nested select returns complex type)
  type Tag = { id: string; label: string; color: string };
  const tags = (tagAssignments || [])
    .map((t) => {
      // Supabase returns array type but actual runtime is single object
      const tag = Array.isArray(t.tag) ? t.tag[0] : t.tag;
      return tag as Tag | null;
    })
    .filter((tag): tag is Tag => tag !== null);

  // Transform subscriptions for sidebar
  const subscriptions = retainer ? [{
    id: retainer.id,
    name: retainer.description || "Monthly Retainer",
    status: retainer.status === "active" ? "active" as const :
            retainer.status === "past_due" ? "past_due" as const :
            "cancelled" as const,
    nextBillingDate: retainer.current_period_end,
  }] : [];

  return (
    <ClientDetailPageClient
      client={{
        id: client.id,
        name: client.name,
        email: client.contact_email,
        phone: client.contact_phone,
        company: client.company || null,
        tags,
        status: client.status || "active",
        createdAt: client.created_at,
        notes: client.notes,
      }}
      bridgeUrl={portal ? "https://bridge.saltcore.io" : undefined}
      payment={{
        lastPaymentDate,
        totalPaid,
        outstandingBalance,
      }}
      subscriptions={subscriptions}
      stats={[
        { label: "Projects", value: projects?.length || 0 },
        { label: "Users", value: clientUsers?.length || 0 },
        { label: "Files", value: knowledgeItems.length },
      ]}
      projects={projects || []}
      invoices={invoices || []}
      clientUsers={clientUsers || []}
      knowledgeItems={knowledgeItems}
      unreadCount={unreadCount}
      conversationId={conversationId}
      defaultTab={tab}
    />
  );
}
