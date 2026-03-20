import { SupabaseClient } from "@supabase/supabase-js";
import { studioRoutes, strategyRoutes } from "@/app/_features/shell/routes";
import type { InboxItem, InboxFilters } from "./types";

// Helper to safely extract id/name from Supabase join results
function getRelation(data: unknown): { id: string; name: string } | null {
  if (!data) return null;
  if (typeof data === "object" && data !== null && "id" in data && "name" in data) {
    return { id: String((data as Record<string, unknown>).id), name: String((data as Record<string, unknown>).name) };
  }
  return null;
}

/**
 * Get inbox items from various sources
 *
 * Sources:
 * - Unread messages
 * - Today's meetings
 * - Overdue invoices
 * - Pending proposals
 * - Client health alerts
 */
export async function getInboxItems(
  supabase: SupabaseClient,
  studioId: string,
  filters?: InboxFilters
): Promise<InboxItem[]> {
  const items: InboxItem[] = [];
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  // 1. Unread messages
  if (!filters?.type || filters.type === "message") {
    try {
      let messagesQuery = supabase
        .from("conversations")
        .select(`
          id,
          last_message_at,
          last_message_preview,
          client:clients!conversations_client_id_fkey(id, name),
          project:projects(id, name)
        `)
        .eq("studio_id", studioId)
        .eq("has_unread_studio", true)
        .order("last_message_at", { ascending: false })
        .limit(10);

      if (filters?.clientId) {
        messagesQuery = messagesQuery.eq("client_id", filters.clientId);
      }
      if (filters?.projectId) {
        messagesQuery = messagesQuery.eq("project_id", filters.projectId);
      }

      const { data: conversations } = await messagesQuery;

      if (conversations) {
        for (const conv of conversations) {
          const client = getRelation(conv.client);
          const project = getRelation(conv.project);

          items.push({
            id: `message-${conv.id}`,
            type: "message",
            urgency: "unread",
            title: conv.last_message_preview || "New message",
            clientId: client?.id,
            clientName: client?.name,
            projectId: project?.id,
            projectName: project?.name,
            timestamp: new Date(conv.last_message_at),
            href: studioRoutes.messages.conversation(conv.id),
          });
        }
      }
    } catch {
      // Silently fail - table might not exist
    }
  }

  // 2. Today's meetings
  if (!filters?.type || filters.type === "meeting") {
    try {
      let meetingsQuery = supabase
        .from("meetings")
        .select(`
          id,
          title,
          scheduled_at,
          client:clients(id, name),
          project:projects(id, name)
        `)
        .eq("studio_id", studioId)
        .gte("scheduled_at", todayStart.toISOString())
        .lt("scheduled_at", todayEnd.toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(10);

      if (filters?.clientId) {
        meetingsQuery = meetingsQuery.eq("client_id", filters.clientId);
      }
      if (filters?.projectId) {
        meetingsQuery = meetingsQuery.eq("project_id", filters.projectId);
      }

      const { data: meetings } = await meetingsQuery;

      if (meetings) {
        for (const meeting of meetings) {
          const client = getRelation(meeting.client);
          const project = getRelation(meeting.project);
          const meetingTime = new Date(meeting.scheduled_at);
          const timeStr = meetingTime.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });

          items.push({
            id: `meeting-${meeting.id}`,
            type: "meeting",
            urgency: "today",
            title: meeting.title,
            subtitle: timeStr,
            clientId: client?.id,
            clientName: client?.name,
            projectId: project?.id,
            projectName: project?.name,
            timestamp: meetingTime,
            href: studioRoutes.meetings.detail(meeting.id),
          });
        }
      }
    } catch {
      // Silently fail
    }
  }

  // 3. Overdue invoices
  if (!filters?.type || filters.type === "invoice") {
    try {
      let invoicesQuery = supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          due_date,
          amount,
          client:clients(id, name)
        `)
        .eq("studio_id", studioId)
        .eq("status", "sent")
        .lt("due_date", now.toISOString())
        .order("due_date", { ascending: true })
        .limit(10);

      if (filters?.clientId) {
        invoicesQuery = invoicesQuery.eq("client_id", filters.clientId);
      }

      const { data: invoices } = await invoicesQuery;

      if (invoices) {
        for (const invoice of invoices) {
          const client = getRelation(invoice.client);
          const daysOverdue = Math.floor(
            (now.getTime() - new Date(invoice.due_date).getTime()) /
              (1000 * 60 * 60 * 24)
          );

          items.push({
            id: `invoice-${invoice.id}`,
            type: "invoice",
            urgency: "overdue",
            title: `Invoice ${invoice.invoice_number}`,
            subtitle: `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue`,
            clientId: client?.id,
            clientName: client?.name,
            timestamp: new Date(invoice.due_date),
            href: studioRoutes.billing.invoices,
          });
        }
      }
    } catch {
      // Silently fail
    }
  }

  // 4. Pending proposals (awaiting response)
  if (!filters?.type || filters.type === "proposal") {
    try {
      let proposalsQuery = supabase
        .from("proposals")
        .select(`
          id,
          title,
          sent_at,
          client:clients(id, name)
        `)
        .eq("studio_id", studioId)
        .eq("status", "sent")
        .order("sent_at", { ascending: true })
        .limit(10);

      if (filters?.clientId) {
        proposalsQuery = proposalsQuery.eq("client_id", filters.clientId);
      }

      const { data: proposals } = await proposalsQuery;

      if (proposals) {
        for (const proposal of proposals) {
          const client = getRelation(proposal.client);
          const daysPending = Math.floor(
            (now.getTime() - new Date(proposal.sent_at).getTime()) /
              (1000 * 60 * 60 * 24)
          );

          items.push({
            id: `proposal-${proposal.id}`,
            type: "proposal",
            urgency: "pending",
            title: proposal.title,
            subtitle: `Awaiting response (${daysPending} day${daysPending === 1 ? "" : "s"})`,
            clientId: client?.id,
            clientName: client?.name,
            timestamp: new Date(proposal.sent_at),
            href: strategyRoutes.proposals.detail(proposal.id),
          });
        }
      }
    } catch {
      // Silently fail
    }
  }

  // 5. Client health alerts (no contact in 14+ days)
  if (!filters?.type || filters.type === "alert") {
    try {
      const alertThreshold = new Date();
      alertThreshold.setDate(alertThreshold.getDate() - 14);

      let clientsQuery = supabase
        .from("clients")
        .select("id, name, last_contact_at")
        .eq("studio_id", studioId)
        .eq("status", "active")
        .lt("last_contact_at", alertThreshold.toISOString())
        .order("last_contact_at", { ascending: true })
        .limit(5);

      if (filters?.clientId) {
        clientsQuery = clientsQuery.eq("id", filters.clientId);
      }

      const { data: clients } = await clientsQuery;

      if (clients) {
        for (const client of clients) {
          const daysNoContact = Math.floor(
            (now.getTime() - new Date(client.last_contact_at).getTime()) /
              (1000 * 60 * 60 * 24)
          );

          items.push({
            id: `alert-client-${client.id}`,
            type: "alert",
            urgency: "alert",
            title: `No contact with ${client.name}`,
            subtitle: `${daysNoContact} days since last contact`,
            clientId: client.id,
            clientName: client.name,
            timestamp: new Date(client.last_contact_at),
            href: studioRoutes.clients.detail(client.id),
          });
        }
      }
    } catch {
      // Silently fail
    }
  }

  // Sort by urgency priority, then by timestamp
  const urgencyOrder = ["overdue", "unread", "alert", "today", "pending"];
  items.sort((a, b) => {
    const urgencyDiff =
      urgencyOrder.indexOf(a.urgency) - urgencyOrder.indexOf(b.urgency);
    if (urgencyDiff !== 0) return urgencyDiff;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  return items;
}
