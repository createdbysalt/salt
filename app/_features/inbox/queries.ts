import { createClient } from "@/app/_lib/supabase/server";
import type { InboxItem, InboxItemUrgency } from "./types";

/**
 * Helper to safely extract first item from Supabase join results
 * Supabase can return either a single object or array depending on the relationship
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

export type InboxViewMode = "inbox" | "done";

/**
 * Fetch unified inbox items from all sources
 * Aggregates: messages, proposals, meetings, milestones, SEO alerts
 * Includes read state from inbox_read_states table
 *
 * @param viewMode - "inbox" for active items, "done" for archived items
 */
export async function getInboxItems(viewMode: InboxViewMode = "inbox"): Promise<InboxItem[]> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch all data sources and read states in parallel
  const [
    messagesResult,
    emailsResult,
    proposalsResult,
    meetingsResult,
    milestonesResult,
    seoAlertsResult,
    readStatesResult,
  ] = await Promise.all([
    getUnreadMessages(supabase),
    getUnreadEmails(supabase),
    getActiveProposals(supabase),
    getUpcomingMeetings(supabase),
    getPendingMilestones(supabase),
    getUndismissedSeoAlerts(supabase),
    getReadStates(supabase, user.id),
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
  items.push(...proposalsResult);
  items.push(...meetingsResult);
  items.push(...milestonesResult);
  items.push(...seoAlertsResult);

  // Apply read states to items and filter based on view mode
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
      // In inbox view: skip archived and snoozed items
      if (isArchived || isSnoozed) {
        continue;
      }
    } else if (viewMode === "done") {
      // In done view: only show archived items
      if (!isArchived) {
        continue;
      }
    }

    if (readState) {
      // Check if actually read (read_at is set) - read_at can be null for unread items
      const isRead = !!readState.read_at;
      item.metadata = {
        ...item.metadata,
        is_read: isRead,
        read_at: readState.read_at,
        archived_at: readState.archived_at,
        snoozed_until: readState.snoozed_until,
      };
    } else {
      // No read state row = unread
      item.metadata = {
        ...item.metadata,
        is_read: false,
      };
    }

    filteredItems.push(item);
  }

  // Replace items with filtered list
  items.length = 0;
  items.push(...filteredItems);

  // Sort by urgency priority, then by created_at
  const urgencyOrder: InboxItemUrgency[] = [
    "overdue",
    "unread",
    "alert",
    "today",
    "new",
    "pending",
  ];

  items.sort((a, b) => {
    // Unread items first (within same urgency)
    const aUnread = a.metadata?.is_read === false;
    const bUnread = b.metadata?.is_read === false;

    const urgencyDiff =
      urgencyOrder.indexOf(a.urgency) - urgencyOrder.indexOf(b.urgency);
    if (urgencyDiff !== 0) return urgencyDiff;

    // Within same urgency, show unread first
    if (aUnread && !bUnread) return -1;
    if (!aUnread && bUnread) return 1;

    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });

  return items;
}

/**
 * Fetch read states for the current user
 */
async function getReadStates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<ReadState[]> {
  const { data, error } = await supabase
    .from("inbox_read_states")
    .select("source_table, source_id, read_at, archived_at, snoozed_until")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching read states:", error);
    return [];
  }

  return data || [];
}

// =============================================================================
// MESSAGES
// =============================================================================

async function getUnreadMessages(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<InboxItem[]> {
  // Fetch recent conversations (not just unread)
  // The inbox_read_states table controls inbox vs done, not the read_at field
  const { data, error } = await supabase
    .from("conversations")
    .select(
      `
      id,
      client_id,
      last_message_at,
      last_message_preview,
      created_at,
      clients!inner (
        id,
        name
      ),
      messages (
        id,
        content,
        sender_type,
        read_at,
        created_at
      )
    `
    )
    .order("last_message_at", { ascending: false })
    .limit(20);

  if (error || !data) {
    console.error("Error fetching messages:", error);
    return [];
  }

  return data
    .filter((conv) => {
      // Include conversations that have messages from clients
      const hasClientMessages = conv.messages?.some(
        (m: { sender_type: string }) => m.sender_type === "client_user"
      );
      return hasClientMessages;
    })
    .map((conv) => {
      const client = extractFirst<{ id: string; name: string }>(conv.clients);
      const latestMessage = conv.messages?.[0] as {
        content: string;
        created_at: string;
        read_at: string | null;
      };

      // Check if there are unread messages from clients
      const hasUnread = conv.messages?.some(
        (m: { sender_type: string; read_at: string | null }) =>
          m.sender_type === "client_user" && !m.read_at
      );

      return {
        id: `msg-${conv.id}`,
        type: "message" as const,
        mode: "studio" as const,
        urgency: hasUnread ? ("unread" as const) : ("pending" as const),
        state: "inbox" as const,
        title: client?.name || "Unknown Client",
        subtitle: hasUnread ? "New message" : "Message",
        preview: conv.last_message_preview || latestMessage?.content || "",
        client_id: conv.client_id,
        client_name: client?.name,
        created_at: new Date(conv.last_message_at || conv.created_at),
        href: `/studio/messages/${conv.id}`,
        source_table: "conversations",
        source_id: conv.id,
        metadata: {
          is_read: !hasUnread,
        },
      };
    });
}

// =============================================================================
// CLIENT EMAILS (Gmail integration)
// =============================================================================

async function getUnreadEmails(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<InboxItem[]> {
  // Fetch recent inbound emails (not just unread)
  // The inbox_read_states table controls inbox vs done, not the read_at field
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
      created_at,
      clients!inner (
        id,
        name
      )
    `
    )
    .eq("direction", "inbound")
    .is("sender_id", null) // External sender
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    console.error("Error fetching emails:", error);
    return [];
  }

  // Fetch attachments separately for all emails (with error handling)
  // Inbound emails store attachments in project_files with source_email_id
  const emailIds = data.map((e) => e.id);
  const attachmentsByEmail = new Map<string, any[]>();

  try {
    if (emailIds.length > 0) {
      const { data: attachmentData, error: attachmentError } = await supabase
        .from("project_files")
        .select(`
          id,
          file_name,
          size_bytes,
          mime_type,
          object_path,
          source_email_id
        `)
        .in("source_email_id", emailIds);

      if (attachmentError) {
        console.warn("Could not fetch email attachments:", attachmentError.message);
      } else if (attachmentData) {
        // Group attachments by source_email_id
        for (const file of attachmentData) {
          const emailId = file.source_email_id;
          if (!attachmentsByEmail.has(emailId)) {
            attachmentsByEmail.set(emailId, []);
          }
          attachmentsByEmail.get(emailId)!.push(file);
        }
      }
    }
  } catch (e) {
    console.warn("Error fetching email attachments:", e);
  }

  return data.map((email) => {
    const client = extractFirst<{ id: string; name: string }>(email.clients);
    // Short preview for list view (truncated)
    const preview = email.content
      ? email.content.length > 100
        ? email.content.slice(0, 100) + "..."
        : email.content
      : "";

    const isUnread = !email.read_at;

    // Extract attachments for this email (from project_files with source_email_id)
    const rawAttachments = attachmentsByEmail.get(email.id) || [];
    const attachments = rawAttachments.map((file: any) => ({
      id: file.id as string,
      name: (file.file_name || "Unknown") as string,
      size: (file.size_bytes || 0) as number,
      type: (file.mime_type || "application/octet-stream") as string,
      storage_path: (file.object_path || "") as string,
    })).filter((att: { storage_path: string }) => att.storage_path);

    return {
      id: `email-${email.id}`,
      type: "email" as const,
      mode: "studio" as const,
      urgency: isUnread ? ("unread" as const) : ("pending" as const),
      state: "inbox" as const,
      title: email.subject || "(No Subject)",
      subtitle: email.sender_name || email.sender_email,
      preview,
      client_id: email.client_id,
      client_name: client?.name,
      created_at: new Date(email.created_at),
      href: `/studio/clients/${email.client_id}?tab=communication`,
      source_table: "client_emails",
      source_id: email.id,
      metadata: {
        is_read: !isUnread,
        // Full content for detail view
        full_content: email.content || "",
        sender_email: email.sender_email,
        sender_name: email.sender_name,
        // Attachments
        has_attachments: attachments.length > 0,
        attachment_count: attachments.length,
        attachments,
      },
    };
  });
}

// =============================================================================
// PROPOSALS
// =============================================================================

async function getActiveProposals(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<InboxItem[]> {
  const { data, error } = await supabase
    .from("proposals")
    .select(
      `
      id,
      public_id,
      title,
      total_amount,
      currency,
      status,
      sent_at,
      viewed_at,
      expires_at,
      created_at,
      clients!inner (
        id,
        name
      )
    `
    )
    .in("status", ["sent", "viewed"])
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) {
    console.error("Error fetching proposals:", error);
    return [];
  }

  return data.map((proposal) => {
    const client = extractFirst<{ id: string; name: string }>(proposal.clients);
    const now = new Date();
    const expiresAt = proposal.expires_at
      ? new Date(proposal.expires_at)
      : null;
    const daysUntilExpiry = expiresAt
      ? Math.ceil(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      : null;

    let urgency: InboxItemUrgency = "pending";
    let statusText = "";

    if (daysUntilExpiry !== null && daysUntilExpiry <= 0) {
      urgency = "overdue";
      statusText = "Expired";
    } else if (daysUntilExpiry !== null && daysUntilExpiry <= 3) {
      urgency = "alert";
      statusText = `Expires in ${daysUntilExpiry} days`;
    } else if (proposal.status === "viewed") {
      urgency = "new";
      statusText = "Viewed by client";
    } else {
      urgency = "pending";
      statusText = "Awaiting response";
    }

    return {
      id: `prop-${proposal.id}`,
      type: "proposal" as const,
      mode: "strategy" as const,
      urgency,
      state: "inbox" as const,
      title: proposal.title,
      subtitle: client?.name,
      preview: statusText,
      client_id: client?.id,
      client_name: client?.name,
      created_at: new Date(proposal.sent_at || proposal.created_at),
      href: `/strategy/proposals/${proposal.id}`,
      source_table: "proposals",
      source_id: proposal.id,
      metadata: {
        amount: proposal.total_amount,
        currency: proposal.currency,
        status: proposal.status,
        sent_at: proposal.sent_at,
        viewed_at: proposal.viewed_at,
        expires_at: proposal.expires_at,
      },
    };
  });
}

// =============================================================================
// MEETINGS
// =============================================================================

async function getUpcomingMeetings(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<InboxItem[]> {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

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
      attendees,
      created_at,
      clients!inner (
        id,
        name
      ),
      projects (
        id,
        name
      )
    `
    )
    .gte("start_time", now.toISOString())
    .lte("start_time", tomorrow.toISOString())
    .eq("status", "scheduled")
    .order("start_time", { ascending: true })
    .limit(10);

  if (error || !data) {
    console.error("Error fetching meetings:", error);
    return [];
  }

  return data.map((meeting) => {
    const client = extractFirst<{ id: string; name: string }>(meeting.clients);
    const project = extractFirst<{ id: string; name: string }>(meeting.projects);
    const startTime = new Date(meeting.start_time);
    const hoursUntil = Math.floor(
      (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    );

    return {
      id: `mtg-${meeting.id}`,
      type: "meeting" as const,
      mode: "studio" as const,
      urgency: hoursUntil <= 2 ? ("today" as const) : ("pending" as const),
      state: "inbox" as const,
      title: meeting.title,
      subtitle: client?.name,
      preview: meeting.description || "",
      client_id: client?.id,
      client_name: client?.name,
      project_id: project?.id,
      project_name: project?.name,
      created_at: new Date(meeting.created_at),
      href: `/studio/meetings/${meeting.id}`,
      source_table: "client_meetings",
      source_id: meeting.id,
      metadata: {
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        meeting_url: meeting.meeting_url,
        attendees: meeting.attendees,
        duration_minutes: Math.round(
          (new Date(meeting.end_time).getTime() - startTime.getTime()) /
            (1000 * 60)
        ),
      },
    };
  });
}

// =============================================================================
// MILESTONES
// =============================================================================

async function getPendingMilestones(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<InboxItem[]> {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

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
        clients!inner (
          id,
          name
        )
      )
    `
    )
    .neq("status", "complete")
    .lte("due_at", nextWeek.toISOString())
    .order("due_at", { ascending: true })
    .limit(10);

  if (error || !data) {
    console.error("Error fetching milestones:", error);
    return [];
  }

  return data.map((milestone) => {
    const project = extractFirst<{
      id: string;
      name: string;
      clients: unknown;
    }>(milestone.projects);
    const client = project ? extractFirst<{ id: string; name: string }>(project.clients) : undefined;
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
      client_id: client?.id,
      client_name: client?.name,
      project_id: project?.id,
      project_name: project?.name,
      created_at: new Date(milestone.created_at),
      href: `/studio/projects/${project?.id}`,
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
// SEO ALERTS
// =============================================================================

async function getUndismissedSeoAlerts(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<InboxItem[]> {
  const { data, error } = await supabase
    .from("seo_alerts")
    .select(
      `
      id,
      alert_type,
      message,
      metadata,
      created_at,
      projects!inner (
        id,
        name,
        clients!inner (
          id,
          name
        )
      )
    `
    )
    .eq("is_dismissed", false)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) {
    console.error("Error fetching SEO alerts:", error);
    return [];
  }

  return data.map((alert) => {
    const project = extractFirst<{
      id: string;
      name: string;
      clients: unknown;
    }>(alert.projects);
    const client = project ? extractFirst<{ id: string; name: string }>(project.clients) : undefined;
    const metadata = alert.metadata as {
      category?: string;
      old_score?: number;
      new_score?: number;
      severity?: string;
    };

    return {
      id: `seo-${alert.id}`,
      type: "seo_alert" as const,
      mode: "strategy" as const,
      urgency:
        alert.alert_type === "critical_score"
          ? ("alert" as const)
          : ("new" as const),
      state: "inbox" as const,
      title: alert.message,
      subtitle: project?.name,
      preview: metadata?.category
        ? `${metadata.category}: ${metadata.old_score} → ${metadata.new_score}`
        : "",
      client_id: client?.id,
      client_name: client?.name,
      project_id: project?.id,
      project_name: project?.name,
      created_at: new Date(alert.created_at),
      href: `/studio/projects/${project?.id}/seo`,
      source_table: "seo_alerts",
      source_id: alert.id,
      metadata: {
        alert_type: alert.alert_type,
        severity: metadata?.severity || alert.alert_type,
        ...metadata,
      },
    };
  });
}
