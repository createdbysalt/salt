"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ClipboardList,
  Command,
  FileText,
  History,
  Loader2,
  Maximize2,
  MessageSquare,
  Minimize2,
  Orbit,
  PenLine,
  Play,
  Search,
  Sparkles,
  SquarePen,
  X,
} from "lucide-react";
import type { UIMessage } from "ai";
import { Input } from "@repo/ui";
import {
  appendAskSaltMessage,
  createAskSaltConversation,
  getAskSaltConversation,
  listAskSaltConversations,
} from "@/app/_features/ask-salt/actions";
import { AskSaltMessages } from "@/app/_features/ask-salt/components/chat/AskSaltMessages";
import { AskSaltPromptInput } from "@/app/_features/ask-salt/components/chat/AskSaltPromptInput";
import { extractSavedArtifacts } from "@/app/_features/ask-salt/components/chat/artifact-card";
import {
  createTextUIMessage,
  rowsToUIMessages,
  uiMessageMetadata,
  uiMessageToPersistPayload,
} from "@/app/_features/ask-salt/message-adapters";
import {
  connectConnectorFromAskSalt,
  disconnectConnectorFromAskSalt,
} from "@/app/_features/ask-salt/connect-actions";
import { useAskSaltChat } from "@/app/_features/ask-salt/hooks/useAskSaltChat";
import {
  classifyAskSaltIntent,
  isConnectorIntent,
  submitConnectorIntent,
} from "@/app/_features/ask-salt";
import { connectorsPageUrl } from "@/app/_features/connectors/constants";
import type {
  AskSaltConversationSummary,
  InlineConnectAction,
} from "@/app/_features/ask-salt/types";
import { useIsMobile } from "@/app/_lib/hooks/use-mobile";
import { useBodyScrollLock } from "@/app/_lib/hooks/use-body-scroll-lock";
import { ASK_SALT_PANEL_WIDTH_PX } from "@/app/_features/shell/constants";
import { useDashboardUser } from "@/app/_features/shell/contexts/DashboardUserContext";

export type AskSaltMode = "ask" | "capture";

type AskSaltStatus = "idle" | "processing" | "collecting" | "review" | "created";

export type AskSaltContext =
  | {
      type: "play";
      id: string;
      title: string;
      recipientLabel: string;
      sourceLabel?: string | null;
      href?: string;
    }
  | {
      type: "capture";
      captureId: string;
      routingId?: string;
      title: string;
      sourceLabel: string;
      suggestedSurface?: string;
      href?: string;
    };

interface AskSaltPanelProps {
  open: boolean;
  mode?: AskSaltMode;
  initialPrompt?: string;
  context?: AskSaltContext | null;
  autoSubmit?: boolean;
  onOpenChange: (open: boolean) => void;
  onFullscreenChange?: (fullscreen: boolean) => void;
}

type StarterAction = {
  label: string;
  message: string;
  nextQuestion: string;
  suggestions?: string[];
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

const STARTER_ACTIONS: StarterAction[] = [
  {
    label: "Create a new Play",
    message: "Create a new Play",
    nextQuestion:
      "What should this Play accomplish? Tell me the goal, when it should run, and what needs your approval.",
    suggestions: [
      "Email quiet clients every Monday",
      "Follow up after every meeting",
      "Remind me when someone goes quiet",
    ],
    icon: ClipboardList,
  },
  {
    label: "Run a Play",
    message: "Run a Play",
    nextQuestion: "Which Play do you want to run, and who or what should it run for?",
    suggestions: ["My weekly check-in Play", "The onboarding Play"],
    icon: Play,
  },
  {
    label: "Search Memory",
    message: "Search Memory",
    nextQuestion:
      "What should I search across Conversations, Meetings, People, Orgs, Work, Files, and Me?",
    suggestions: [
      "What did we agree with Acme last month?",
      "Who haven't I talked to lately?",
    ],
    icon: FileText,
  },
  {
    label: "Capture to Memory",
    message: "Capture to Memory",
    nextQuestion: "What should I remember? A rough version is fine.",
    suggestions: ["Client prefers email over text", "Project deadline moved to Friday"],
    icon: PenLine,
  },
  {
    label: "Explore insights and connections",
    message: "Explore insights and connections",
    nextQuestion: "What person, client, project, or pattern should I explore?",
    suggestions: ["Who needs a follow-up?", "Any revenue I'm leaving on the table?"],
    icon: Sparkles,
  },
  {
    label: "Create a Space",
    message: "Create a Space",
    nextQuestion:
      "What client, project, relationship, or decision should this Space gather context around?",
    icon: Orbit,
  },
];

const CONNECTORS_NAV_SUGGESTIONS = ["open connectors", "browse connectors", "browse all connectors"];

export const ASK_SALT_PANEL_WIDTH = ASK_SALT_PANEL_WIDTH_PX;

const ASK_SALT_HISTORY_HEADER_CLASS = "h-[101px]";
const SPRING = { type: "spring" as const, stiffness: 340, damping: 36, mass: 0.9 };

export function AskSaltPanel({
  open,
  mode = "ask",
  initialPrompt = "",
  context = null,
  autoSubmit = false,
  onOpenChange,
  onFullscreenChange,
}: AskSaltPanelProps) {
  const isMobile = useIsMobile();
  useBodyScrollLock(open && isMobile);
  const { firstName } = useDashboardUser();
  const [text, setText] = React.useState(initialPrompt);
  const [status, setStatus] = React.useState<AskSaltStatus>("idle");
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [conversations, setConversations] = React.useState<AskSaltConversationSummary[]>([]);
  const [historySearch, setHistorySearch] = React.useState("");
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [showMobileHistory, setShowMobileHistory] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [connectingId, setConnectingId] = React.useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = React.useState<string | null>(null);
  const autoSubmitKeyRef = React.useRef("");
  const conversationIdRef = React.useRef<string | null>(conversationId);
  conversationIdRef.current = conversationId;

  const {
    messages: chatMessages,
    sendMessage,
    status: chatStatus,
    stop,
    addToolApprovalResponse,
    setMessages: setChatMessages,
  } = useAskSaltChat(() => conversationIdRef.current);

  const isChatBusy = chatStatus === "streaming" || chatStatus === "submitted";

  const setFullscreen = React.useCallback(
    (value: boolean) => {
      setIsFullscreen(value);
      onFullscreenChange?.(value);
    },
    [onFullscreenChange],
  );

  const refreshConversations = React.useCallback(async (query?: string) => {
    setHistoryLoading(true);
    const result = await listAskSaltConversations(query);
    if (result.ok) {
      setConversations(result.data);
    }
    setHistoryLoading(false);
  }, []);

  const startNewChat = React.useCallback(
    (prompt = "") => {
      conversationIdRef.current = null;
      setConversationId(null);
      setText(prompt);
      setChatMessages([]);
      setStatus("idle");
      setShowMobileHistory(false);
    },
    [setChatMessages],
  );

  const panelOpenedRef = React.useRef(false);

  React.useEffect(() => {
    if (!open) {
      setFullscreen(false);
    }
  }, [open, setFullscreen]);

  /** Append a local turn to the unified UIMessage stream. */
  const appendLocalMessage = React.useCallback(
    (
      role: "user" | "assistant",
      content: string,
      metadata?: Record<string, unknown>,
    ): UIMessage => {
      const message = createTextUIMessage(role, content, metadata);
      setChatMessages((current) => [...current, message]);
      return message;
    },
    [setChatMessages],
  );

  const persistUIMessage = React.useCallback(
    async (activeConversationId: string, message: UIMessage) => {
      const payload = uiMessageToPersistPayload(message);
      await appendAskSaltMessage({
        conversationId: activeConversationId,
        role: message.role === "user" ? "user" : "assistant",
        content: payload.content,
        metadata: payload.metadata,
      });
      void refreshConversations();
    },
    [refreshConversations],
  );

  const loadConversation = React.useCallback(
    async (id: string) => {
      const result = await getAskSaltConversation(id);
      if (!result.ok) return;

      const { conversation, messages: rows } = result.data;
      setConversationId(conversation.id);

      setChatMessages(rowsToUIMessages(rows));

      const savedArtifacts = rows.flatMap((row) => extractSavedArtifacts(row.metadata));
      setStatus(
        savedArtifacts.length > 0
          ? "review"
          : rows.length > 0
            ? "collecting"
            : "idle",
      );
      setText("");
      setShowMobileHistory(false);
    },
    [setChatMessages],
  );

  const ensureConversationId = React.useCallback(async () => {
    if (conversationId) return conversationId;

    const result = await createAskSaltConversation({
      mode,
      context,
    });
    if (!result.ok) return null;

    conversationIdRef.current = result.data.id;
    setConversationId(result.data.id);
    void refreshConversations();
    return result.data.id;
  }, [context, conversationId, mode, refreshConversations]);

  React.useEffect(() => {
    if (!open) return;
    void refreshConversations(historySearch);
  }, [historySearch, open, refreshConversations]);

  React.useEffect(() => {
    if (!open) {
      panelOpenedRef.current = false;
      return;
    }
    if (panelOpenedRef.current) return;
    panelOpenedRef.current = true;
    if (initialPrompt || context || autoSubmit) {
      startNewChat(initialPrompt);
      return;
    }
    startNewChat("");
  }, [autoSubmit, context, initialPrompt, open, startNewChat]);

  React.useEffect(() => {
    if (!open || !autoSubmit || !initialPrompt.trim()) return;
    const key = `${initialPrompt}:${mode}`;
    if (autoSubmitKeyRef.current === key) return;
    autoSubmitKeyRef.current = key;
    const timeout = window.setTimeout(() => {
      const starterAction = STARTER_ACTIONS.find((action) => action.message === initialPrompt);
      if (starterAction) {
        void handleStarterAction(starterAction);
        return;
      }

      void handleSubmit(initialPrompt, context);
    }, 120);
    return () => window.clearTimeout(timeout);
    // handleSubmit intentionally omitted so this effect only follows incoming events.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmit, context, initialPrompt, mode, open]);

  const runConnectorIntent = React.useCallback(
    async (
      activeConversationId: string,
      prompt: string,
    ): Promise<"success" | "not_connector" | "error"> => {
      setStatus("processing");
      const result = await submitConnectorIntent({
        conversationId: activeConversationId,
        prompt,
      });

      if (!result.ok) {
        if (result.errorCode === "NOT_CONNECTOR") {
          setStatus("collecting");
          return "not_connector";
        }
        appendLocalMessage("user", prompt);
        appendLocalMessage("assistant", result.message);
        setStatus("collecting");
        return "error";
      }

      appendLocalMessage("user", prompt);
      appendLocalMessage("assistant", result.data.assistantMessage, {
        kind: "connector",
        inlineAction: result.data.inlineAction ?? null,
        showBrowseConnectors: result.data.showBrowseConnectors ?? false,
        suggestions: result.data.suggestions ?? [],
      });
      setStatus("collecting");
      void refreshConversations();
      return "success";
    },
    [appendLocalMessage, refreshConversations],
  );

  /** Surface a connect/disconnect failure on the active inline connect turn. */
  const setConnectorError = React.useCallback(
    (connectorId: string, error: string) => {
      setChatMessages((current) =>
        current.map((message, index) => {
          if (index !== current.length - 1) return message;
          const metadata = uiMessageMetadata(message);
          if (!metadata || metadata.kind !== "connector") return message;
          const inlineAction = metadata.inlineAction as InlineConnectAction | null;
          if (!inlineAction || inlineAction.connectorId !== connectorId) return message;
          return {
            ...message,
            metadata: { ...metadata, inlineAction: { ...inlineAction, error } },
          };
        }),
      );
    },
    [setChatMessages],
  );

  const handleConnectorConnect = React.useCallback(
    async (connectorId: string) => {
      const activeConversationId = conversationId ?? (await ensureConversationId());
      if (!activeConversationId) return;

      setConnectingId(connectorId);
      const result = await connectConnectorFromAskSalt(connectorId);
      setConnectingId(null);

      if (!result.success) {
        setConnectorError(connectorId, result.error);
        return;
      }

      window.open(result.url, "_blank", "noopener,noreferrer");
      appendLocalMessage(
        "assistant",
        "Finish signing in to Google in the new tab. When you're back, tell me what you want to do next.",
        { suggestions: ["Create a new Play", "What's connected?"] },
      );
    },
    [appendLocalMessage, conversationId, ensureConversationId, setConnectorError],
  );

  const handleConnectorDisconnect = React.useCallback(
    async (connectorId: string) => {
      const activeConversationId = conversationId ?? (await ensureConversationId());
      if (!activeConversationId) return;

      setDisconnectingId(connectorId);
      const result = await disconnectConnectorFromAskSalt(connectorId);
      setDisconnectingId(null);

      if (!result.success) {
        setConnectorError(connectorId, result.error);
        return;
      }

      await runConnectorIntent(activeConversationId, "what's connected");
    },
    [conversationId, ensureConversationId, runConnectorIntent, setConnectorError],
  );

  const handleSubmit = async (overrideText?: string, overrideContext?: AskSaltContext | null) => {
    const prompt = (overrideText ?? text).trim();
    if (!prompt || status === "processing" || isChatBusy) return;

    const activeConversationId = await ensureConversationId();
    if (!activeConversationId) {
      appendLocalMessage("assistant", "Couldn't start a new chat. Sign in and try again.");
      return;
    }

    setText("");

    if (overrideContext?.type === "play") {
      setStatus("processing");
      const userMessage = appendLocalMessage("user", prompt);
      void persistUIMessage(activeConversationId, userMessage);
      const assistantMessage = appendLocalMessage(
        "assistant",
        `I’ve got ${overrideContext.title} open. Tell me what you want changed, or ask me to make it warmer, shorter, firmer, or more specific.`,
      );
      void persistUIMessage(activeConversationId, assistantMessage);
      setStatus("collecting");
      return;
    }

    const intent = classifyAskSaltIntent(prompt);
    if (isConnectorIntent(intent)) {
      const outcome = await runConnectorIntent(activeConversationId, prompt);
      if (outcome !== "not_connector") return;
    }

    setStatus("processing");
    try {
      await sendMessage({ text: prompt });
      setStatus("collecting");
      void refreshConversations();
    } catch {
      appendLocalMessage(
        "assistant",
        "Something went wrong. Try again or connect Google first.",
      );
      setStatus("collecting");
    }
  };

  const handleStarterAction = async (action: StarterAction) => {
    if (status === "processing" || isChatBusy) return;

    const activeConversationId = await ensureConversationId();
    if (!activeConversationId) return;

    setText("");
    setStatus("processing");
    const userMessage = appendLocalMessage("user", action.message);
    void persistUIMessage(activeConversationId, userMessage);
    const assistantMessage = appendLocalMessage("assistant", action.nextQuestion, {
      suggestions: action.suggestions ?? [],
    });
    void persistUIMessage(activeConversationId, assistantMessage);
    setStatus("collecting");
  };

  const handleSuggestionSelect = React.useCallback(
    (suggestion: string) => {
      if (
        CONNECTORS_NAV_SUGGESTIONS.some((label) =>
          suggestion.toLowerCase().includes(label),
        )
      ) {
        window.location.href = connectorsPageUrl({ askSalt: "1" });
        return;
      }
      void handleSubmit(suggestion, context);
    },
    // handleSubmit intentionally omitted — stable enough for chip taps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [context],
  );

  const handleApproval = React.useCallback(
    (approvalId: string, approved: boolean) => {
      addToolApprovalResponse({
        id: approvalId,
        approved,
        ...(approved ? {} : { reason: "User denied" }),
      });
    },
    [addToolApprovalResponse],
  );

  const handleCreate = () => {
    if (status === "processing") return;
    setStatus("created");
    window.setTimeout(() => onOpenChange(false), 600);
  };

  const isCaptureMode = mode === "capture";
  const groupedConversations = groupConversationsByTime(conversations);
  const showHistoryRail = isFullscreen || (isMobile && showMobileHistory);
  const isIdleEmpty = status === "idle" && chatMessages.length === 0;

  return (
    <motion.aside
      initial={isMobile ? { y: "100%" } : { x: "100%" }}
      animate={isMobile ? { y: 0, x: 0 } : { x: 0, y: 0 }}
      exit={isMobile ? { y: "100%" } : { x: "100%" }}
      transition={SPRING}
      className={
        isFullscreen
          ? "fixed inset-0 z-50 grid h-dvh grid-cols-[minmax(240px,280px)_minmax(0,1fr)] overflow-hidden bg-background"
          : isMobile
            ? "fixed inset-0 z-50 flex h-dvh w-full flex-col overflow-hidden bg-background"
            : "fixed inset-y-0 right-0 z-40 flex h-dvh flex-col overflow-hidden border-l border-border/60 bg-background"
      }
      style={!isFullscreen && !isMobile ? { width: ASK_SALT_PANEL_WIDTH } : undefined}
      aria-label="Ask Salt"
    >
      {showHistoryRail && (
        <AskSaltHistoryRail
          variant={isFullscreen ? "fullscreen" : "overlay"}
          conversations={groupedConversations}
          activeConversationId={conversationId}
          loading={historyLoading}
          search={historySearch}
          onSearchChange={setHistorySearch}
          onSelectConversation={(id) => void loadConversation(id)}
          onClose={isMobile ? () => setShowMobileHistory(false) : undefined}
          className={isMobile ? "absolute inset-0 z-20 bg-background" : undefined}
        />
      )}

      <div className="grid h-full min-h-0 w-full min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
      <div
        className={`z-10 border-b border-border/50 bg-background/75 backdrop-blur-xl px-4 py-3 ${
          isFullscreen ? "flex items-center" : "lg:px-5 lg:py-4"
        }`}
      >
        <div className="flex h-11 w-full items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {isMobile && (
              <button
                type="button"
                onClick={() => setShowMobileHistory(true)}
                className="grid size-8 shrink-0 place-items-center rounded-lg transition hover:bg-muted"
                aria-label="Conversation history"
              >
                <History className="size-4" />
              </button>
            )}
            <span className="surface-aurora grid size-5 place-items-center rounded-full">
              <Sparkles className="relative z-10 size-3 text-white" strokeWidth={2.5} />
            </span>
            <h2 className="truncate text-sm font-semibold tracking-tight">Ask Salt</h2>
            <span className="inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Command className="size-2.5" /> P
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => startNewChat("")}
              className="grid size-8 place-items-center rounded-lg transition hover:bg-muted"
              aria-label="New chat"
              title="New chat"
            >
              <SquarePen className="size-4" />
            </button>
            {!isMobile && (
              <button
                type="button"
                onClick={() => setFullscreen(!isFullscreen)}
                className="grid size-8 place-items-center rounded-lg transition hover:bg-muted"
                aria-label={
                  isFullscreen ? "Exit full screen" : "Switch to full screen"
                }
                title={isFullscreen ? "Exit full screen" : "Switch to full screen"}
              >
                {isFullscreen ? (
                  <Minimize2 className="size-4" />
                ) : (
                  <Maximize2 className="size-4" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="grid size-8 place-items-center rounded-lg transition hover:bg-muted"
              aria-label="Close Ask Salt"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <AskSaltMessages
        messages={chatMessages}
        chatStatus={chatStatus}
        processing={status === "processing" && !isChatBusy}
        approvalsBusy={isChatBusy}
        onApproval={handleApproval}
        connector={{
          connectingId,
          disconnectingId,
          onConnect: (id) => void handleConnectorConnect(id),
          onDisconnect: (id) => void handleConnectorDisconnect(id),
        }}
        onOptionSelect={handleSuggestionSelect}
        optionsDisabled={status === "processing" || isChatBusy}
        centered={isFullscreen}
        resetKey={conversationId}
        before={
          <>
            {context?.type === "play" && <AskSaltContextCard context={context} />}
            {isIdleEmpty && (
              <IdleStarterActions
                firstName={firstName}
                compact={!isFullscreen}
                onSelect={(action) => void handleStarterAction(action)}
              />
            )}
          </>
        }
        after={
          status === "created" ? (
            <div className="flex items-start gap-2.5">
              <span className="surface-aurora grid size-7 shrink-0 place-items-center rounded-full">
                <Sparkles className="relative z-10 size-3.5 text-white" strokeWidth={2.5} />
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl rounded-bl-md border border-border/55 bg-muted/45 px-3.5 py-2.5 text-[13px] leading-relaxed text-success">
                <CheckCircle2 className="size-4" />
                <span className="font-medium">Context saved and Play draft created.</span>
              </div>
            </div>
          ) : null
        }
      />

      <div
        className={`bg-background px-4 pb-4 pt-3 ${
          isFullscreen ? "mx-auto w-full max-w-2xl" : ""
        }`}
      >
        <AskSaltPromptInput
          value={text}
          onChange={setText}
          onSubmit={() => void handleSubmit(undefined, context)}
          onStop={stop}
          chatStatus={chatStatus}
          processing={status === "processing" && !isChatBusy}
          reviewMode={status === "review"}
          onCreate={handleCreate}
          placeholder={
            isCaptureMode
              ? "Capture context, a goal, or a client-specific exception..."
              : "Ask a question"
          }
        />
      </div>
      </div>
    </motion.aside>
  );
}

type ConversationGroup = {
  label: string;
  items: AskSaltConversationSummary[];
};

function groupConversationsByTime(
  conversations: AskSaltConversationSummary[],
): ConversationGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  const startOf30Days = new Date(startOfToday);
  startOf30Days.setDate(startOf30Days.getDate() - 30);

  const buckets: Record<string, AskSaltConversationSummary[]> = {
    "Past week": [],
    "Past 30 days": [],
    Older: [],
  };

  for (const conversation of conversations) {
    const touchedAt = conversation.lastMessageAt
      ? new Date(conversation.lastMessageAt)
      : new Date();
    if (touchedAt >= startOfWeek) {
      buckets["Past week"].push(conversation);
      continue;
    }
    if (touchedAt >= startOf30Days) {
      buckets["Past 30 days"].push(conversation);
      continue;
    }
    buckets.Older.push(conversation);
  }

  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

function AskSaltHistoryRail({
  variant,
  conversations,
  activeConversationId,
  loading,
  search,
  onSearchChange,
  onSelectConversation,
  onClose,
  className,
}: {
  variant: "fullscreen" | "overlay";
  conversations: ConversationGroup[];
  activeConversationId: string | null;
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectConversation: (id: string) => void;
  onClose?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-0 flex-col border-r border-border/60 bg-muted/15 ${className ?? ""}`}
    >
      <div
        className={`px-4 ${
          variant === "fullscreen"
            ? `flex ${ASK_SALT_HISTORY_HEADER_CLASS} flex-col justify-center gap-3`
            : "space-y-3 border-b border-border/50 py-4"
        }`}
      >
        <div className="flex h-11 shrink-0 items-center justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight">Chat history</h3>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-lg transition hover:bg-muted"
              aria-label="Close chat history"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search"
            className="h-9 pl-9 text-sm"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            {variant === "fullscreen"
              ? "No chats yet. Start one from the compose button."
              : "No chats yet."}
          </p>
        )}

        {!loading &&
          conversations.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => onSelectConversation(conversation.id)}
                    className={`flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition ${
                      activeConversationId === conversation.id
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    <MessageSquare className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} />
                    <span className="line-clamp-2 min-w-0 flex-1 font-medium">
                      {conversation.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function AskSaltContextCard({ context }: { context: AskSaltContext }) {
  if (context.type !== "play") return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-start gap-3">
        <span className="surface-aurora grid size-8 shrink-0 place-items-center rounded-xl">
          <Sparkles className="relative z-10 size-3.5 text-white" strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-muted-foreground">
            Editing Play · to {context.recipientLabel}
          </p>
          <p className="mt-0.5 truncate text-[13.5px] font-semibold leading-snug tracking-tight">
            {context.title}
          </p>
          {context.sourceLabel && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Source: {context.sourceLabel}
            </p>
          )}
        </div>
        {context.href && (
          <a
            href={context.href}
            className="shrink-0 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
          >
            View Play
          </a>
        )}
      </div>
    </div>
  );
}

function IdleStarterActions({
  firstName,
  compact,
  onSelect,
}: {
  firstName?: string;
  compact?: boolean;
  onSelect: (action: StarterAction) => void;
}) {
  const displayName = formatGreetingName(firstName);

  return (
    <div className="space-y-5">
      <p
        className={`font-display tracking-tight text-foreground ${
          compact ? "text-xl" : "text-2xl"
        }`}
      >
        Hi{displayName ? ` ${displayName}` : ""}, how can I help?
      </p>
      <div className="space-y-2">
        {STARTER_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => onSelect(action)}
              className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-3 py-3 text-left text-sm text-foreground transition hover:bg-muted/60"
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatGreetingName(name?: string) {
  const trimmed = name?.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}
