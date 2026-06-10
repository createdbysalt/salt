"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ClipboardList,
  Command,
  FileText,
  History,
  Loader2,
  Maximize2,
  MessageSquare,
  Mic,
  Minimize2,
  Orbit,
  Paperclip,
  PenLine,
  Play,
  Search,
  Sparkles,
  SquarePen,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, Card, Input } from "@repo/ui";
import {
  appendAskSaltMessage,
  createAskSaltConversation,
  getAskSaltConversation,
  listAskSaltConversations,
} from "@/app/_features/ask-salt/actions";
import type { AskSaltConversationSummary } from "@/app/_features/ask-salt/types";
import {
  getMockPlayer,
  MOCK_PLAY_TEMPLATES,
  type MockPlayer,
} from "@/app/_lib/demo";
import { useIsMobile } from "@/app/_lib/hooks/use-mobile";
import { useBodyScrollLock } from "@/app/_lib/hooks/use-body-scroll-lock";
import { ASK_SALT_PANEL_WIDTH_PX } from "@/app/_features/shell/constants";
import { useDashboardUser } from "@/app/_features/shell/contexts/DashboardUserContext";

export type AskSaltMode = "ask" | "capture";

type AskSaltStatus = "idle" | "processing" | "collecting" | "review" | "created";

type AskSaltMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AskSaltContext =
  | {
      type: "play";
      id: string;
      title: string;
      recipientLabel: string;
      sourceLabel?: string | null;
      href?: string;
    };

type AskSaltArtifact =
  | {
      type: "knowledge";
      title: string;
      description: string;
    }
  | {
      type: "player";
      player: MockPlayer;
      description: string;
    }
  | {
      type: "play";
      title: string;
      description: string;
      steps: string[];
      player: MockPlayer;
    }
  | {
      type: "queue";
      title: string;
      description: string;
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
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

const STARTER_ACTIONS: StarterAction[] = [
  {
    label: "Run a Play",
    message: "Run a Play",
    nextQuestion: "Which Play do you want to run, and who or what should it run for?",
    icon: Play,
  },
  {
    label: "Create a new Play",
    message: "Create a new Play",
    nextQuestion:
      "What should this Play accomplish? Tell me the end goal, when it should run, and what should need approval.",
    icon: ClipboardList,
  },
  {
    label: "Capture to Memory",
    message: "Capture to Memory",
    nextQuestion: "What should I remember? Type it, say it, or attach a file. A rough version is fine.",
    icon: PenLine,
  },
  {
    label: "Search Memory",
    message: "Search Memory",
    nextQuestion: "What should I search across Conversations, Meetings, People, Orgs, Work, Files, Billing, and Me?",
    icon: FileText,
  },
  {
    label: "Explore insights and connections",
    message: "Explore insights and connections",
    nextQuestion: "What person, client, project, or pattern should I explore?",
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

export const ASK_SALT_PANEL_WIDTH = ASK_SALT_PANEL_WIDTH_PX;

const ASK_SALT_HISTORY_HEADER_CLASS = "h-[101px]";
const SPRING = { type: "spring" as const, stiffness: 340, damping: 36, mass: 0.9 };

function isAskSaltArtifact(value: unknown): value is AskSaltArtifact {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return type === "knowledge" || type === "player" || type === "play" || type === "queue";
}

function extractSavedArtifacts(
  metadata: Record<string, unknown> | null,
): AskSaltArtifact[] {
  const artifacts = metadata?.artifacts;
  if (!Array.isArray(artifacts)) return [];
  return artifacts.filter(isAskSaltArtifact);
}

function isReviewArtifactMessage(metadata: Record<string, unknown> | null): boolean {
  return metadata?.status === "review" && extractSavedArtifacts(metadata).length > 0;
}

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
  const chatScrollRef = React.useRef<HTMLDivElement>(null);
  const [text, setText] = React.useState(initialPrompt);
  const [status, setStatus] = React.useState<AskSaltStatus>("idle");
  const [messages, setMessages] = React.useState<AskSaltMessage[]>([]);
  const [artifacts, setArtifacts] = React.useState<AskSaltArtifact[]>([]);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [conversations, setConversations] = React.useState<AskSaltConversationSummary[]>([]);
  const [historySearch, setHistorySearch] = React.useState("");
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [showMobileHistory, setShowMobileHistory] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const autoSubmitKeyRef = React.useRef("");

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

  const startNewChat = React.useCallback((prompt = "") => {
    setConversationId(null);
    setText(prompt);
    setMessages([]);
    setArtifacts([]);
    setStatus("idle");
    setShowMobileHistory(false);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setFullscreen(false);
    }
  }, [open, setFullscreen]);

  const loadConversation = React.useCallback(async (id: string) => {
    const result = await getAskSaltConversation(id);
    if (!result.ok) return;

    const { conversation, messages: rows } = result.data;
    setConversationId(conversation.id);
    setMessages(
      rows
        .filter(
          (row) =>
            (row.role === "user" || row.role === "assistant") &&
            !isReviewArtifactMessage(row.metadata),
        )
        .map((row) => ({
          role: row.role as "user" | "assistant",
          content: row.content,
        })),
    );
    const savedArtifacts = rows.flatMap((row) => extractSavedArtifacts(row.metadata));
    setArtifacts(savedArtifacts);
    setStatus(savedArtifacts.length > 0 ? "review" : rows.length > 0 ? "collecting" : "idle");
    setText("");
    setShowMobileHistory(false);
  }, []);

  const ensureConversationId = React.useCallback(async () => {
    if (conversationId) return conversationId;

    const result = await createAskSaltConversation({
      mode,
      context,
    });
    if (!result.ok) return null;

    setConversationId(result.data.id);
    void refreshConversations();
    return result.data.id;
  }, [context, conversationId, mode, refreshConversations]);

  const persistMessage = React.useCallback(
    async (
      activeConversationId: string,
      role: "user" | "assistant",
      content: string,
      metadata?: Record<string, unknown> | null,
    ) => {
      await appendAskSaltMessage({
        conversationId: activeConversationId,
        role,
        content,
        metadata,
      });
      void refreshConversations();
    },
    [refreshConversations],
  );

  React.useEffect(() => {
    if (!open) return;
    void refreshConversations(historySearch);
  }, [historySearch, open, refreshConversations]);

  React.useEffect(() => {
    if (!open) return;
    if (initialPrompt || context || autoSubmit) {
      startNewChat(initialPrompt);
      return;
    }
    startNewChat("");
  }, [autoSubmit, context, initialPrompt, open, startNewChat]);

  React.useEffect(() => {
    if (!open || messages.length === 0) return;
    const scroller = chatScrollRef.current;
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
  }, [messages, status, artifacts, open]);

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

  const handleSubmit = async (overrideText?: string, overrideContext?: AskSaltContext | null) => {
    const prompt = (overrideText ?? text).trim();
    if (!prompt || status === "processing") return;

    const activeConversationId = await ensureConversationId();
    if (!activeConversationId) return;

    setMessages((current) => [...current, { role: "user", content: prompt }]);
    setText("");
    setStatus("processing");
    setArtifacts([]);
    void persistMessage(activeConversationId, "user", prompt);
    await wait(850);
    if (overrideContext?.type === "play") {
      const assistantContent = `I’ve got ${overrideContext.title} open. Tell me what you want changed, or ask me to make it warmer, shorter, firmer, or more specific.`;
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: assistantContent,
        },
      ]);
      void persistMessage(activeConversationId, "assistant", assistantContent);
      setStatus("collecting");
      return;
    }

    const nextArtifacts = buildArtifacts(prompt);
    setArtifacts(nextArtifacts);
    const assistantContent =
      "Here’s what Salt understood. Chat is only the builder — these cards are the artifacts that would become the system of record.";
    void persistMessage(activeConversationId, "assistant", assistantContent, {
      artifacts: nextArtifacts,
      status: "review",
    });
    setStatus("review");
  };

  const handleStarterAction = async (action: StarterAction) => {
    if (status === "processing") return;

    const activeConversationId = await ensureConversationId();
    if (!activeConversationId) return;

    setText("");
    setArtifacts([]);
    setMessages([{ role: "user", content: action.message }]);
    setStatus("processing");
    void persistMessage(activeConversationId, "user", action.message);
    await wait(450);
    setMessages((current) => [
      ...current,
      { role: "assistant", content: action.nextQuestion },
    ]);
    void persistMessage(activeConversationId, "assistant", action.nextQuestion);
    setStatus("collecting");
  };

  const handleCreate = async () => {
    if (status === "processing") return;
    setStatus("created");
    await wait(1000);
    onOpenChange(false);
  };

  const isCaptureMode = mode === "capture";
  const groupedConversations = groupConversationsByTime(conversations);
  const showHistoryRail = isFullscreen || (isMobile && showMobileHistory);
  const isIdleEmpty = status === "idle" && messages.length === 0;

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

      <div
        ref={chatScrollRef}
        className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-4 pt-6"
      >
        <div
          className={`space-y-5 ${isFullscreen && isIdleEmpty ? "mx-auto w-full max-w-2xl" : ""}`}
        >
          {context?.type === "play" && <AskSaltContextCard context={context} />}

          {isIdleEmpty && (
            <IdleStarterActions
              firstName={firstName}
              compact={!isFullscreen}
              onSelect={(action) => void handleStarterAction(action)}
            />
          )}

          {messages.map((message, index) =>
            message.role === "user" ? (
              <UserMessage key={`${message.role}-${index}`}>{message.content}</UserMessage>
            ) : (
              <AssistantMessage key={`${message.role}-${index}`}>
                <p>{message.content}</p>
              </AssistantMessage>
            )
          )}

          {status === "processing" && (
            <AssistantMessage>
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                <span>Reading captures, people, Players, and Playbooks...</span>
              </div>
            </AssistantMessage>
          )}

          {status === "review" && (
            <AssistantMessage>
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-foreground">Here’s what Salt understood.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Chat is only the builder. These cards are the artifacts that would become the
                    system of record.
                  </p>
                </div>
                <div className="space-y-2">
                  {artifacts.map((artifact, index) => (
                    <ArtifactCard key={`${artifact.type}-${index}`} artifact={artifact} />
                  ))}
                </div>
              </div>
            </AssistantMessage>
          )}

          {status === "created" && (
            <AssistantMessage>
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="size-4" />
                <span className="font-medium">Context saved and Play draft created.</span>
              </div>
            </AssistantMessage>
          )}
        </div>
      </div>

      <div
        className={`bg-background px-4 pb-4 pt-3 ${
          isFullscreen ? "mx-auto w-full max-w-2xl" : ""
        }`}
      >
        <div className="rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-lift)] transition focus-within:border-border focus-within:ring-4 focus-within:ring-foreground/5">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={status === "processing"}
            placeholder={
              isCaptureMode
                ? "Capture context, a goal, or a client-specific exception..."
                : "Ask a question"
            }
            rows={3}
            className="w-full resize-none bg-transparent px-4 pb-1 pt-3 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void handleSubmit(undefined, context);
              }
            }}
          />
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                disabled
                className="grid size-8 place-items-center rounded-lg transition hover:bg-muted disabled:opacity-40"
                aria-label="Attach file"
                title="Attach file"
              >
                <Paperclip className="size-4 text-muted-foreground" />
              </button>
              <button
                type="button"
                disabled
                className="grid size-8 place-items-center rounded-lg transition hover:bg-muted disabled:opacity-40"
                aria-label="Voice input"
                title="Voice input coming soon"
              >
                <Mic className="size-4 text-muted-foreground" />
              </button>
            </div>
            <button
              type="button"
              onClick={
                status === "review" ? handleCreate : () => void handleSubmit(undefined, context)
              }
              disabled={status === "review" ? false : !text.trim() || status === "processing"}
              aria-label={status === "review" ? "Create Play" : "Ask Salt"}
              title={status === "review" ? "Create Play" : "Ask Salt"}
              className="grid size-8 place-items-center rounded-lg bg-foreground text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === "processing" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : status === "review" ? (
                <Play className="size-4" strokeWidth={2.5} />
              ) : (
                <ArrowUp className="size-4" strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>
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

function AssistantMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="surface-aurora grid size-7 shrink-0 place-items-center rounded-full">
        <Sparkles className="relative z-10 size-3.5 text-white" strokeWidth={2.5} />
      </span>
      <div className="min-w-0 flex-1 rounded-2xl rounded-bl-md border border-border/55 bg-muted/45 px-3.5 py-2.5 text-[13px] leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[92%] rounded-2xl rounded-br-md bg-foreground px-3.5 py-2.5 text-[13px] leading-relaxed text-background">
        {children}
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

function ArtifactCard({ artifact }: { artifact: AskSaltArtifact }) {
  if (artifact.type === "knowledge") {
    return (
      <Card className="p-3">
        <ArtifactHeader icon={FileText} label="Saved context" />
        <p className="mt-2 text-sm font-medium">{artifact.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{artifact.description}</p>
      </Card>
    );
  }

  if (artifact.type === "player") {
    const Icon = artifact.player.icon;
    return (
      <Card className="p-3">
        <ArtifactHeader icon={Icon} label="Assigned Player" />
        <div className="mt-3 flex items-start gap-3">
          <Avatar className="size-8">
            <AvatarFallback>{artifact.player.avatar}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{artifact.player.name}</p>
            <p className="text-xs text-muted-foreground">{artifact.description}</p>
          </div>
        </div>
      </Card>
    );
  }

  if (artifact.type === "play") {
    return (
      <Card className="p-3">
        <ArtifactHeader icon={Play} label="Play draft" />
        <p className="mt-2 text-sm font-medium">{artifact.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{artifact.description}</p>
        <div className="mt-3 space-y-1">
          {artifact.steps.map((step, index) => (
            <div key={step} className="flex items-center gap-2 text-xs">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">
                {index + 1}
              </span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3">
      <ArtifactHeader icon={ClipboardList} label="Queue item" />
      <p className="mt-2 text-sm font-medium">{artifact.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{artifact.description}</p>
    </Card>
  );
}

function ArtifactHeader({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <ArrowRight className="size-3 text-muted-foreground" />
    </div>
  );
}

function buildArtifacts(prompt: string): AskSaltArtifact[] {
  const lower = prompt.toLowerCase();
  const briefPlayer = getMockPlayer("player_brief");
  const followUpPlayer = getMockPlayer("player_follow_up");
  const billingPlayer = getMockPlayer("player_billing");
  const scopePlayer = getMockPlayer("player_scope");
  const riskPlayer = getMockPlayer("player_client_risk");
  const selectedPlayer =
    lower.includes("invoice") || lower.includes("payment")
      ? billingPlayer
      : lower.includes("scope") || lower.includes("proposal")
        ? scopePlayer
        : lower.includes("risk") || lower.includes("overdue") || lower.includes("stale")
          ? riskPlayer
          : lower.includes("follow") || lower.includes("reply") || lower.includes("check")
            ? followUpPlayer
        : lower.includes("capture") ||
            lower.includes("remember") ||
            lower.includes("context") ||
            lower.includes("note") ||
            lower.includes("find") ||
            lower.includes("insight") ||
            lower.includes("connection")
          ? briefPlayer
          : followUpPlayer;

  const player = selectedPlayer ?? followUpPlayer ?? briefPlayer ?? billingPlayer ?? scopePlayer ?? riskPlayer;
  if (!player) return [];

  const onboardingTemplate = MOCK_PLAY_TEMPLATES.find((template) => template.id === "play_onboard");
  const checkinTemplate = MOCK_PLAY_TEMPLATES.find((template) => template.id === "play_checkin");
  const captureCleanupTemplate = MOCK_PLAY_TEMPLATES.find(
    (template) => template.id === "play_capture_cleanup"
  );
  const template =
    player.id === "player_brief"
      ? captureCleanupTemplate
      : player.id === "player_follow_up"
        ? checkinTemplate
        : onboardingTemplate;
  const steps = template?.steps.slice(0, 5) ?? [
    "Save context",
    "Resolve related client",
    "Draft next step",
    "Queue for approval",
  ];

  const isGoal =
    lower.includes("need") ||
    lower.includes("make") ||
    lower.includes("create") ||
    lower.includes("draft") ||
    lower.includes("onboarding") ||
    lower.includes("play");

  const artifacts: AskSaltArtifact[] = [
    {
      type: "knowledge",
      title: extractKnowledgeTitle(prompt),
      description: "Stored as Capture context and available to People, Work, and Plays.",
    },
    {
      type: "player",
      player,
      description: `${player.departmentLabel} owns this because it maps to ${player.role.toLowerCase()}`,
    },
  ];

  if (isGoal) {
    artifacts.push({
      type: "play",
      title: lower.includes("onboarding")
        ? "Custom client onboarding"
        : template?.name ?? "Draft next-step Play",
      description:
        "A draft workflow the Player can refine from connected tools, client context, and approval rules.",
      steps,
      player,
    });
  }

  artifacts.push({
    type: "queue",
    title: isGoal ? "Review Play before it runs" : "Review suggested next step",
    description:
      "Anything client-visible or commitment-heavy stays in Queue until approved.",
  });

  return artifacts;
}

function extractKnowledgeTitle(prompt: string) {
  const trimmed = prompt.trim();
  if (trimmed.length <= 80) return trimmed;
  return `${trimmed.slice(0, 77).trim()}...`;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}
