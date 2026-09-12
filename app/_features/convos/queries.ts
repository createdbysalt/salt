import "server-only";

import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import type { Channel, ConvoMessage, ConvoThread } from "./data";

/**
 * Convos queries (Memory Sourcing Overhaul, Phase 5).
 *
 * Read-only revival over the learn-layer message store
 * (conversation_threads / conversation_messages) written by the capture
 * ingest pipeline. No drafts, no sends — Convos is a reader here. Bodies
 * past their 90-day TTL read as an honest expired placeholder; thread
 * metadata persists.
 */

const THREAD_LIST_LIMIT = 100;
const THREAD_MESSAGES_LIMIT = 200;
/** Preview fetch: one recents page across the listed threads. */
const PREVIEW_MESSAGES_LIMIT = 300;

const KNOWN_CHANNELS = new Set<Channel>([
  "email",
  "slack",
  "whatsapp",
  "imessage",
  "linkedin",
]);

function asChannel(value: string): Channel {
  return KNOWN_CHANNELS.has(value as Channel) ? (value as Channel) : "email";
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

interface ThreadRow {
  id: string;
  person_id: string | null;
  counterparty_email: string | null;
  channel: string;
  subject: string | null;
  last_message_at: string | null;
  created_at: string;
  people: { name: string; email: string | null } | null;
}

interface MessageRow {
  id: string;
  thread_id: string;
  direction: string;
  author_email: string | null;
  author_name: string | null;
  body_text: string | null;
  occurred_at: string | null;
  created_at: string;
}

function mapMessage(row: MessageRow, channel: Channel): ConvoMessage {
  const direction = row.direction === "out" ? "out" : "in";
  return {
    id: row.id,
    channel,
    direction,
    at: row.occurred_at ?? row.created_at,
    authorName:
      direction === "out"
        ? "You"
        : (row.author_name ?? row.author_email ?? "Unknown"),
    // Bodies are extraction fuel with a TTL — after purge the row and its
    // metadata persist, and the UI says so honestly.
    body: row.body_text ?? "(message body expired)",
  };
}

function counterpartyName(thread: ThreadRow, messages: ConvoMessage[]): string {
  // Person record name wins; otherwise the last inbound author, then the
  // bare counterparty address.
  const lastInbound = [...messages].reverse().find((m) => m.direction === "in");
  return (
    thread.people?.name ??
    (lastInbound && lastInbound.authorName !== "Unknown"
      ? lastInbound.authorName
      : null) ??
    thread.counterparty_email ??
    "Unknown sender"
  );
}

function toConvoThread(
  thread: ThreadRow,
  messages: ConvoMessage[],
): ConvoThread {
  const channel = asChannel(thread.channel);
  const name = counterpartyName(thread, messages);
  const last = messages[messages.length - 1];
  return {
    threadId: thread.id,
    personId: thread.person_id,
    person: {
      name,
      initials: initialsFor(name),
      channels: [channel],
      preferredChannel: channel,
    },
    summary: thread.subject ?? last?.body ?? "",
    lastTouchAt: thread.last_message_at ?? thread.created_at,
    // Read-only status model: the last inbound message needs you; anything
    // else is quiet. No draft/snooze states until the act layer owns them.
    status: last?.direction === "in" ? "waiting_you" : "quiet",
    messages,
    relatedWorkIds: [],
    fileIds: [],
    spaceIds: [],
  };
}

/** Inbox list: recent threads with their messages for preview + search. */
export async function listConvoThreads(): Promise<ConvoThread[]> {
  const { workspace, supabase } = await getWorkspaceContext();

  const { data: threads, error } = await supabase
    .from("conversation_threads")
    .select(
      "id, person_id, counterparty_email, channel, subject, last_message_at, created_at, people(name, email)",
    )
    .eq("workspace_id", workspace.id)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(THREAD_LIST_LIMIT);

  if (error) {
    console.error("[convos] thread list query failed:", error.message);
    return [];
  }
  const threadRows = (threads ?? []) as unknown as ThreadRow[];
  if (threadRows.length === 0) return [];

  const threadIds = threadRows.map((t) => t.id);
  const { data: messages, error: messagesError } = await supabase
    .from("conversation_messages")
    .select(
      "id, thread_id, direction, author_email, author_name, body_text, occurred_at, created_at",
    )
    .in("thread_id", threadIds)
    .order("occurred_at", { ascending: true })
    .limit(PREVIEW_MESSAGES_LIMIT);

  if (messagesError) {
    console.error("[convos] message preview query failed:", messagesError.message);
  }

  const byThread = new Map<string, ConvoMessage[]>();
  const channelByThread = new Map(threadRows.map((t) => [t.id, asChannel(t.channel)]));
  for (const row of (messages ?? []) as unknown as MessageRow[]) {
    const list = byThread.get(row.thread_id) ?? [];
    list.push(mapMessage(row, channelByThread.get(row.thread_id) ?? "email"));
    byThread.set(row.thread_id, list);
  }

  return threadRows.map((t) => toConvoThread(t, byThread.get(t.id) ?? []));
}

/** Single thread with its full (capped) message history. */
export async function getConvoThread(threadId: string): Promise<ConvoThread | null> {
  const { workspace, supabase } = await getWorkspaceContext();

  const { data: thread, error } = await supabase
    .from("conversation_threads")
    .select(
      "id, person_id, counterparty_email, channel, subject, last_message_at, created_at, people(name, email)",
    )
    .eq("workspace_id", workspace.id)
    .eq("id", threadId)
    .maybeSingle();

  if (error) {
    console.error("[convos] thread query failed:", error.message);
    return null;
  }
  if (!thread) return null;

  const threadRow = thread as unknown as ThreadRow;
  const channel = asChannel(threadRow.channel);

  const { data: messages, error: messagesError } = await supabase
    .from("conversation_messages")
    .select(
      "id, thread_id, direction, author_email, author_name, body_text, occurred_at, created_at",
    )
    .eq("thread_id", threadRow.id)
    .order("occurred_at", { ascending: true })
    .limit(THREAD_MESSAGES_LIMIT);

  if (messagesError) {
    console.error("[convos] thread messages query failed:", messagesError.message);
  }

  const mapped = ((messages ?? []) as unknown as MessageRow[]).map((row) =>
    mapMessage(row, channel),
  );
  return toConvoThread(threadRow, mapped);
}
