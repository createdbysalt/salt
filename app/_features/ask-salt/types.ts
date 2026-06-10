import type { AskSaltContext, AskSaltMode } from "@/app/_features/shell/components/AskSaltPanel";

export type AskSaltMessageRole = "user" | "assistant" | "system";

export type AskSaltConversationRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string | null;
  mode: AskSaltMode;
  context: AskSaltContext | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AskSaltMessageRow = {
  id: string;
  conversation_id: string;
  role: AskSaltMessageRole;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type AskSaltConversationSummary = {
  id: string;
  title: string;
  mode: AskSaltMode;
  lastMessageAt: string | null;
  preview: string | null;
};

export type AskSaltConversationDetail = {
  conversation: AskSaltConversationRow;
  messages: AskSaltMessageRow[];
};
