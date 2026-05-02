import { createClient } from "@/app/_lib/supabase/server";
import type { InboxItem, InboxItemUrgency } from "./types";

/**
 * Helper to safely extract first item from Supabase join results
 */
function extractFirst<T>(data: unknown): T | undefined {
  if (Array.isArray(data)) {
    return data[0] as T;
  }
  return data as T | undefined;
}

// Type for read state records
interface ReadState {
  source_table: string;
  source_id: string;
  read_at: string;
  archived_at: string | null;
  snoozed_until: string | null;
}

export type BridgeInboxViewMode = "inbox" | "done";

/**
 * Fetch inbox items for a Bridge (client portal) user
 *
 * Shows items relevant to the client:
 * - Messages (conversations with the studio)
 * - Emails (correspondence about their projects)
 * - Invoices (payment requests)
 * - Milestones (project progress updates)
 * - Meetings (upcoming meetings with studio)
 *
 * All filtered by the client's client_id from tenant context.
 */
export async function getBridgeInboxItems(
  clientId: string,
  viewMode: BridgeInboxViewMode = "inbox"
): Promise<InboxItem[]> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch all data sources and read states in parallel
  const [
    messagesResult,
    emailsResult,
    invoicesResult,
    milestonesResult,
    meetingsResult,
    readStatesResult,
  ] = await Promise.all([
    getClientMessages(supabase, clientId),
    getClientEmails(supabase, clientId),
    getClientInvoices(supabase, clientId),
    getClientMilestones(supabase, clientId),
    getClientMeetings(supabase, clientId),
    getBridgeReadStates(supabase, user.id),
  ]);

  // Create a map of read states for quick lookup
  const readStateMap = new Map<string, ReadState>();
  for (const state of readStatesResult) {
    const key = `${state.source_table}:${state.source_id}`;
    readStateMap.set(key, state);
  }

  // Combine all items
  const items: InboxItem[] = [];
  items.push(...messagesResult);
  items.push(...emailsResult);
  items.push(...invoicesResult);
  items.push(...milestonesResult);
  items.push(...meetingsResult);

  // Apply read states and filter based on view mode
  const now = new Date();
  const filteredItems: InboxItem[] = [];

  for (const item of items) {
    const key = `${item.source_table}:${item.source_id}`;
    const readState = readStateMap.get(key);

    const isArchived = !!readState?.archived_at;
    const isSnoozed = readState?.snoozed_until
      ? new Date(readState.snoozed_until) > now
      : false;

    // Filter based on view mode
    if (viewMode === "inbox") {
      if (isArchived || isSnoozed) continue;
    } else if (viewMode === "done") {
      if (!isArchived) continue;
    }

    if (readState) {
      const isRead = !!readState.read_at;
      item.metadata = {
        ...item.metadata,
        is_read: isRead,
        read_at: readState.read_at,
        archived_at: readState.archived_at,
        snoozed_until: readState.snoozed_until,
      };
    } else {
      item.metadata = {
        ...item.metadata,
        is_read: false,
      };
    }

    filteredItems.push(item);
  }

  // Sort by urgency, then unread, then date
  const urgencyOrder: InboxItemUrgency[] = [
    "overdue",
    "unread",
    "alert",
    "today",
    "new",
    "pending",
  ];

  filteredItems.sort((a, b) => {
    const aUnread = a.metadata?.is_read === false;
    const bUnread = b.metadata?.is_read === false;

    const urgencyDiff =
      urgencyOrder.indexOf(a.urgency) - urgencyOrder.indexOf(b.urgency);
    if (urgencyDiff !== 0) return urgencyDiff;

    if (aUnread && !bUnread) return -1;
    if (!aUnread && bUnread) return 1;

    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });

  return filteredItems;
}

/**
 * Get read states for bridge user
 */
async function getBridgeReadStates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<ReadState[]> {
  const { data, error } = await supabase
    .from("inbox_read_states")
    .select("source_table, source_id, read_at, archived_at, snoozed_until")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching bridge read states:", error);
    return [];
  }

  return data || [];
}

// =============================================================================
// MESSAGES (Conversations with Studio)
// =============================================================================

async function getClientMessages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string
): Promise<InboxItem[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select(
      `
      id,
      client_id,
      last_message_at,
      last_message_preview,
      created_at,
      messages (
        id,
        content,
        sender_type,
        read_at,
        created_at
      )
    `
    )
    .eq("client_id", clientId)
    .order("last_message_at", { ascending: false })
    .limit(20);

  if (error || !data) {
    console.error("Error fetching client messages:", error);
    return [];
  }

  return data
    .filter((conv) => {
      // Include conversations with studio messages
      const hasStudioMessages = conv.messages?.some(
        (m: { sender_type: string }) => m.sender_type === "studio_member"
      );
      return hasStudioMessages;
    })
    .map((conv) => {
      const latestMessage = conv.messages?.[0] as {
        content: string;
        created_at: string;
        read_at: string | null;
        sender_type: string;
      };

      // Check for unread messages from studio
      const hasUnread = conv.messages?.some(
        (m: { sender_type: string; read_at: string | null }) =>
          m.sender_type === "studio_member" && !m.read_at
      );

      return {
        id: `msg-${conv.id}`,
        type: "message" as const,
        mode: "studio" as const,
        urgency: hasUnread ? ("unread" as const) : ("pending" as const),
        state: "inbox" as const,
        title: "Studio Message",
        subtitle: hasUnread ? "New message" : "Message",
        preview: conv.last_message_preview || latestMessage?.content || "",
        client_id: conv.client_id,
        created_at: new Date(conv.last_message_at || conv.created_at),
        href: `/table/messages/${conv.id}`,
        source_table: "conversations",
        source_id: conv.id,
        metadata: {
          is_read: !hasUnread,
        },
      };
    });
}

// =============================================================================
// EMAILS
// =============================================================================

async function getClientEmails(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string
): Promise<InboxItem[]> {
  const { data, error } = await supabase
    .from("client_emails")
    .select(
      `
      id,
      client_id,
      sender_name,
      sender_email,
      subject,
      content,
      direction,
      read_at,
      created_at
    `
    )
    .eq("client_id", clientId)
    .eq("direction", "outbound") // Emails sent TO the client
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error || !data) {
    console.error("Error fetching client emails:", error);
    return [];
  }

  return data.map((email) => {
    const preview = email.content
      ? email.content.length > 100
        ? email.content.slice(0, 100) + "..."
        : email.content
      : "";

    const isUnread = !email.read_at;

    return {
      id: `email-${email.id}`,
      type: "email" as const,
      mode: "studio" as const,
      urgency: isUnread ? ("unread" as const) : ("pending" as const),
      state: "inbox" as const,
      title: email.subject || "(No Subject)",
      subtitle: email.sender_name || "Studio",
      preview,
      client_id: email.client_id,
      created_at: new Date(email.created_at),
      href: `/table/messages?email=${email.id}`,
      source_table: "client_emails",
      source_id: email.id,
      metadata: {
        is_read: !isUnread,
        full_content: email.content || "",
        sender_email: email.sender_email,
        sender_name: email.sender_name,
      },
    };
  });
}

// =============================================================================
// INVOICES
// =============================================================================

async function getClientInvoices(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string
): Promise<InboxItem[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
      id,
      invoice_number,
      total_amount,
      currency,
      status,
      due_date,
      created_at,
      projects (
        id,
        name
      )
    `
    )
    .eq("client_id", clientId)
    .in("status", ["sent", "viewed", "overdue"])
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) {
    console.error("Error fetching client invoices:", error);
    return [];
  }

  const now = new Date();

  return data.map((invoice) => {
    const project = extractFirst<{ id: string; name: string }>(invoice.projects);
    const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
    const daysUntilDue = dueDate
      ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    let urgency: InboxItemUrgency = "pending";
    let statusText = "Payment requested";

    if (invoice.status === "overdue" || (daysUntilDue !== null && daysUntilDue < 0)) {
      urgency = "overdue";
      statusText = "Overdue";
    } else if (daysUntilDue !== null && daysUntilDue <= 3) {
      urgency = "alert";
      statusText = `Due in ${daysUntilDue} days`;
    } else if (invoice.status === "sent") {
      urgency = "new";
      statusText = "New invoice";
    }

    const amount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: invoice.currency || "USD",
      minimumFractionDigits: 0,
    }).format(invoice.total_amount || 0);

    return {
      id: `inv-${invoice.id}`,
      type: "invoice" as const,
      mode: "studio" as const,
      urgency,
      state: "inbox" as const,
      title: `Invoice ${invoice.invoice_number || ""}`,
      subtitle: project?.name || "Project",
      preview: `${amount} - ${statusText}`,
      client_id: clientId,
      project_id: project?.id,
      project_name: project?.name,
      created_at: new Date(invoice.created_at),
      href: `/table/billing?invoice=${invoice.id}`,
      source_table: "invoices",
      source_id: invoice.id,
      metadata: {
        amount: invoice.total_amount,
        currency: invoice.currency,
        status: invoice.status,
        due_date: invoice.due_date,
        days_until_due: daysUntilDue,
      },
    };
  });
}

// =============================================================================
// MILESTONES
// =============================================================================

async function getClientMilestones(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string
): Promise<InboxItem[]> {
  const { data, error } = await supabase
    .from("project_milestones")
    .select(
      `
      id,
      title,
      description,
      due_at,
      status,
      created_at,
      projects!inner (
        id,
        name,
        client_id
      )
    `
    )
    .eq("projects.client_id", clientId)
    .in("status", ["upcoming", "in_progress"])
    .order("due_at", { ascending: true })
    .limit(10);

  if (error || !data) {
    console.error("Error fetching client milestones:", error);
    return [];
  }

  const now = new Date();

  return data.map((milestone) => {
    const project = extractFirst<{ id: string; name: string; client_id: string }>(
      milestone.projects
    );
    const dueAt = milestone.due_at ? new Date(milestone.due_at) : null;
    const daysUntilDue = dueAt
      ? Math.ceil((dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    let urgency: InboxItemUrgency = "pending";
    if (daysUntilDue !== null && daysUntilDue < 0) {
      urgency = "overdue";
    } else if (daysUntilDue !== null && daysUntilDue <= 1) {
      urgency = "today";
    } else if (daysUntilDue !== null && daysUntilDue <= 3) {
      urgency = "alert";
    } else if (milestone.status === "in_progress") {
      urgency = "new";
    }

    return {
      id: `mile-${milestone.id}`,
      type: "milestone" as const,
      mode: "studio" as const,
      urgency,
      state: "inbox" as const,
      title: milestone.title,
      subtitle: project?.name,
      preview: milestone.description || "",
      client_id: clientId,
      project_id: project?.id,
      project_name: project?.name,
      created_at: new Date(milestone.created_at),
      href: `/table/progress`,
      source_table: "project_milestones",
      source_id: milestone.id,
      metadata: {
        due_date: milestone.due_at,
        status: milestone.status,
        days_until_due: daysUntilDue,
      },
    };
  });
}

// =============================================================================
// MEETINGS
// =============================================================================

async function getClientMeetings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string
): Promise<InboxItem[]> {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("client_meetings")
    .select(
      `
      id,
      title,
      description,
      start_time,
      end_time,
      meeting_url,
      status,
      created_at,
      projects (
        id,
        name
      )
    `
    )
    .eq("client_id", clientId)
    .gte("start_time", now.toISOString())
    .lte("start_time", nextWeek.toISOString())
    .eq("status", "scheduled")
    .order("start_time", { ascending: true })
    .limit(5);

  if (error || !data) {
    console.error("Error fetching client meetings:", error);
    return [];
  }

  return data.map((meeting) => {
    const project = extractFirst<{ id: string; name: string }>(meeting.projects);
    const startTime = new Date(meeting.start_time);
    const hoursUntil = Math.floor(
      (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    );

    const timeStr = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(startTime);

    return {
      id: `mtg-${meeting.id}`,
      type: "meeting" as const,
      mode: "studio" as const,
      urgency: hoursUntil <= 2 ? ("today" as const) : ("pending" as const),
      state: "inbox" as const,
      title: meeting.title,
      subtitle: project?.name || "Meeting",
      preview: `${timeStr}${meeting.description ? ` - ${meeting.description}` : ""}`,
      client_id: clientId,
      project_id: project?.id,
      project_name: project?.name,
      created_at: new Date(meeting.created_at),
      href: meeting.meeting_url || `/table/progress`,
      source_table: "client_meetings",
      source_id: meeting.id,
      metadata: {
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        meeting_url: meeting.meeting_url,
        hours_until: hoursUntil,
      },
    };
  });
}

/**
 * Get unread count for Bridge inbox badge
 */
export async function getBridgeUnreadCount(clientId: string): Promise<number> {
  const items = await getBridgeInboxItems(clientId, "inbox");
  return items.filter((item) => item.metadata?.is_read === false).length;
}
