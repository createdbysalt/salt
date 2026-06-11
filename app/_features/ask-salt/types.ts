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

export type ConnectorCardPayload = {
  connectorId: string;
  name: string;
  description: string;
  connected: boolean;
  statusLabel?: string;
  ownership: "native" | "composio" | "internal";
  comingSoon?: boolean;
  nativeBadge?: string;
  oauthUrl?: string;
  error?: string;
};

/** Single inline connect affordance shown inside the assistant turn (not a card stack). */
export type InlineConnectAction = {
  connectorId: string;
  name: string;
  connected: boolean;
  comingSoon: boolean;
  ownership: ConnectorCardPayload["ownership"];
  canConnect: boolean;
  canDisconnect: boolean;
  error?: string;
  oauthUrl?: string;
  statusLabel?: string;
};

export type AskSaltConnectorTurnResult = {
  kind: "connector";
  assistantMessage: string;
  inlineAction?: InlineConnectAction | null;
  showBrowseConnectors?: boolean;
  suggestions?: string[];
  /** @deprecated Legacy metadata — prefer inlineAction */
  connectors?: ConnectorCardPayload[];
  oauthUrl?: string;
};

export type AskSaltTurnStatus = "idle" | "collecting" | "review" | "connector";
