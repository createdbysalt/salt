"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import type { AskSaltContext, AskSaltMode } from "@/app/_features/shell/components/AskSaltPanel";
import type {
  AskSaltConversationDetail,
  AskSaltConversationSummary,
  AskSaltMessageRole,
} from "./types";

export type AskSaltActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; errorCode: string; message: string };

function deriveTitle(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "New chat";
  if (trimmed.length <= 60) return trimmed;
  return `${trimmed.slice(0, 57).trim()}...`;
}

export async function listAskSaltConversations(
  query?: string,
): Promise<AskSaltActionResult<AskSaltConversationSummary[]>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;
  if (!userId) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: "Sign in required" };
  }

  const supabase = await createClient();
  let request = supabase
    .from("ask_salt_conversations")
    .select("id, title, mode, last_message_at")
    .eq("workspace_id", workspace.id)
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(50);

  if (query?.trim()) {
    request = request.ilike("title", `%${query.trim()}%`);
  }

  const { data, error } = await request;

  if (error) {
    return { ok: false, errorCode: "QUERY_FAILED", message: error.message };
  }

  const summaries: AskSaltConversationSummary[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title?.trim() || "New chat",
    mode: row.mode as AskSaltMode,
    lastMessageAt: row.last_message_at,
    preview: null,
  }));

  return { ok: true, data: summaries };
}

export async function getAskSaltConversation(
  conversationId: string,
): Promise<AskSaltActionResult<AskSaltConversationDetail>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;
  if (!userId) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: "Sign in required" };
  }

  const supabase = await createClient();
  const { data: conversation, error: conversationError } = await supabase
    .from("ask_salt_conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("workspace_id", workspace.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (conversationError) {
    return { ok: false, errorCode: "QUERY_FAILED", message: conversationError.message };
  }
  if (!conversation) {
    return { ok: false, errorCode: "NOT_FOUND", message: "Conversation not found" };
  }

  const { data: messages, error: messagesError } = await supabase
    .from("ask_salt_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return { ok: false, errorCode: "QUERY_FAILED", message: messagesError.message };
  }

  return {
    ok: true,
    data: {
      conversation,
      messages: messages ?? [],
    },
  };
}

export async function createAskSaltConversation(input: {
  mode?: AskSaltMode;
  context?: AskSaltContext | null;
  title?: string;
}): Promise<AskSaltActionResult<{ id: string }>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;
  if (!userId) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: "Sign in required" };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("ask_salt_conversations")
    .insert({
      workspace_id: workspace.id,
      user_id: userId,
      title: input.title?.trim() || "New chat",
      mode: input.mode ?? "ask",
      context: input.context ?? null,
      last_message_at: now,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      errorCode: "INSERT_FAILED",
      message: error?.message ?? "Failed to create conversation",
    };
  }

  revalidatePath("/hq");
  return { ok: true, data: { id: data.id } };
}

export async function appendAskSaltMessage(input: {
  conversationId: string;
  role: AskSaltMessageRole;
  content: string;
  metadata?: Record<string, unknown> | null;
}): Promise<AskSaltActionResult<{ id: string }>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;
  if (!userId) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: "Sign in required" };
  }

  const trimmed = input.content.trim();
  if (!trimmed) {
    return { ok: false, errorCode: "VALIDATION", message: "Message cannot be empty" };
  }

  const supabase = await createClient();
  const { data: conversation, error: conversationError } = await supabase
    .from("ask_salt_conversations")
    .select("id, title")
    .eq("id", input.conversationId)
    .eq("workspace_id", workspace.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (conversationError) {
    return { ok: false, errorCode: "QUERY_FAILED", message: conversationError.message };
  }
  if (!conversation) {
    return { ok: false, errorCode: "NOT_FOUND", message: "Conversation not found" };
  }

  const now = new Date().toISOString();
  const { data: message, error: messageError } = await supabase
    .from("ask_salt_messages")
    .insert({
      conversation_id: input.conversationId,
      role: input.role,
      content: trimmed,
      metadata: input.metadata ?? null,
    })
    .select("id")
    .single();

  if (messageError || !message) {
    return {
      ok: false,
      errorCode: "INSERT_FAILED",
      message: messageError?.message ?? "Failed to save message",
    };
  }

  const patch: Record<string, unknown> = {
    last_message_at: now,
    updated_at: now,
  };

  if (
    input.role === "user" &&
    (!conversation.title || conversation.title === "New chat")
  ) {
    patch.title = deriveTitle(trimmed);
  }

  const { error: updateError } = await supabase
    .from("ask_salt_conversations")
    .update(patch)
    .eq("id", input.conversationId)
    .eq("workspace_id", workspace.id)
    .eq("user_id", userId);

  if (updateError) {
    return { ok: false, errorCode: "UPDATE_FAILED", message: updateError.message };
  }

  revalidatePath("/hq");
  return { ok: true, data: { id: message.id } };
}
