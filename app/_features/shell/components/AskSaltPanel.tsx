"use client";

import * as React from "react";
import {
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Mic,
  Paperclip,
  PenLine,
  Play,
  Sparkles,
} from "lucide-react";
import {
  AIButton,
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  Textarea,
} from "@repo/ui";
import { cn } from "@repo/utils";
import {
  getMockPlayer,
  MOCK_PLAY_TEMPLATES,
  type MockPlayer,
} from "@/app/_lib/demo";
import { useDashboardUser } from "@/app/_features/shell/contexts/DashboardUserContext";

export type AskSaltMode = "ask" | "capture";

type AskSaltStatus = "idle" | "processing" | "collecting" | "review" | "created";

type AskSaltMessage = {
  role: "user" | "assistant";
  content: string;
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
  autoSubmit?: boolean;
  onOpenChange: (open: boolean) => void;
}

type StarterAction = {
  label: string;
  message: string;
  nextQuestion: string;
  icon: React.ComponentType<{ className?: string }>;
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
    label: "Capture something to remember",
    message: "Capture something to remember",
    nextQuestion: "What should I remember? Type it, say it, or attach a file. A rough version is fine.",
    icon: PenLine,
  },
  {
    label: "Find context",
    message: "Find context",
    nextQuestion: "What are you trying to find context about?",
    icon: FileText,
  },
  {
    label: "Explore insights and connections",
    message: "Explore insights and connections",
    nextQuestion: "What person, client, project, or pattern should I explore?",
    icon: Sparkles,
  },
];

export function AskSaltPanel({
  open,
  mode = "ask",
  initialPrompt = "",
  autoSubmit = false,
  onOpenChange,
}: AskSaltPanelProps) {
  const { firstName } = useDashboardUser();
  const [text, setText] = React.useState(initialPrompt);
  const [status, setStatus] = React.useState<AskSaltStatus>("idle");
  const [messages, setMessages] = React.useState<AskSaltMessage[]>([]);
  const [artifacts, setArtifacts] = React.useState<AskSaltArtifact[]>([]);
  const autoSubmitKeyRef = React.useRef("");

  React.useEffect(() => {
    if (!open) return;
    setText(initialPrompt);
    setMessages([]);
    setArtifacts([]);
    setStatus("idle");
  }, [initialPrompt, open]);

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

      void handleSubmit(initialPrompt);
    }, 120);
    return () => window.clearTimeout(timeout);
    // handleSubmit intentionally omitted so this effect only follows incoming events.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmit, initialPrompt, mode, open]);

  const handleSubmit = async (overrideText?: string) => {
    const prompt = (overrideText ?? text).trim();
    if (!prompt || status === "processing") return;

    setMessages((current) => [...current, { role: "user", content: prompt }]);
    setText("");
    setStatus("processing");
    setArtifacts([]);
    await wait(850);
    setArtifacts(buildArtifacts(prompt));
    setStatus("review");
  };

  const handleStarterAction = async (action: StarterAction) => {
    if (status === "processing") return;

    setText("");
    setArtifacts([]);
    setMessages([{ role: "user", content: action.message }]);
    setStatus("processing");
    await wait(450);
    setMessages((current) => [
      ...current,
      { role: "assistant", content: action.nextQuestion },
    ]);
    setStatus("collecting");
  };

  const handleCreate = async () => {
    if (status === "processing") return;
    setStatus("created");
    await wait(1000);
    onOpenChange(false);
  };

  const isCaptureMode = mode === "capture";

  if (!open) return null;

  return (
    <aside className="flex h-full max-h-full min-h-0 w-[380px] shrink-0 flex-col overflow-hidden border-l border-border/50 bg-white xl:w-[420px]">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/50 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-lg font-normal text-foreground">Ask Salt</h2>
          <kbd className="inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted/50 px-1.5 text-[10px] font-medium text-muted-foreground">
            <span className="text-[11px]">⌘</span>P
          </kbd>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onOpenChange(false)}
          aria-label="Close Ask Salt"
        >
          <span aria-hidden>×</span>
        </Button>
        </div>

      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-x-0 top-0 bottom-44 overflow-y-auto px-5 py-4">
          <div className="space-y-4">
            {status === "idle" && messages.length === 0 && (
              <IdleStarterActions
                firstName={firstName}
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
                  <Loader2 className="size-4 animate-spin text-primary" />
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
                      Chat is only the builder. These cards are the artifacts that
                      would become the system of record.
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

        <div className="absolute inset-x-0 bottom-0 z-10 bg-white px-4 pb-4 pt-3">
          <div className="rounded-2xl border border-border bg-white p-3 shadow-sm">
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              disabled={status === "processing"}
              placeholder={
                isCaptureMode
                  ? "Capture context, a goal, or a client-specific exception..."
                  : "No need to phrase it perfectly. Tell Salt what you know."
              }
              className="h-20 resize-none border-0 bg-transparent px-0 py-1 text-sm leading-5 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  void handleSubmit();
                }
              }}
            />
            <div className="mt-3 flex items-center justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled
                  aria-label="Attach file"
                  title="Attach file"
                  className="size-7 text-muted-foreground"
                >
                  <Paperclip className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled
                  aria-label="Voice input"
                  title="Voice input coming soon"
                  className="size-7 text-muted-foreground"
                >
                  <Mic className="size-3.5" />
                </Button>
              <Button
                type="button"
                variant={text.trim() || status === "review" ? "default" : "secondary"}
                size="icon-sm"
                onClick={status === "review" ? handleCreate : () => void handleSubmit()}
                disabled={!text.trim() || status === "processing"}
                aria-label={status === "review" ? "Create Play" : "Ask Salt"}
                title={status === "review" ? "Create Play" : "Ask Salt"}
                className="size-8 rounded-full"
              >
                {status === "processing" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : status === "review" ? (
                  <Play className="size-3.5" />
                ) : (
                  <ArrowUp className="size-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function AssistantMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1 rounded-2xl border border-border bg-muted/30 px-3 py-2 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm leading-relaxed text-primary-foreground">
        {children}
      </div>
    </div>
  );
}

function IdleStarterActions({
  firstName,
  onSelect,
}: {
  firstName?: string;
  onSelect: (action: StarterAction) => void;
}) {
  const displayName = formatGreetingName(firstName);

  return (
    <div className="space-y-5 pt-2">
      <div>
        <p className="text-base font-normal text-foreground">
          Hi{displayName ? ` ${displayName}` : ""}, how can I help?
        </p>
      </div>
      <div className="space-y-1.5">
        {STARTER_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => onSelect(action)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <Icon className="size-3.5 shrink-0" />
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
  const onboardingPlayer = getMockPlayer("player_onboarding_coordinator");
  const successPlayer = getMockPlayer("player_client_success_assistant");
  const financePlayer = getMockPlayer("player_finance_steward");
  const memoryPlayer = getMockPlayer("player_memory_steward");
  const selectedPlayer =
    lower.includes("invoice") || lower.includes("payment")
      ? financePlayer
      : lower.includes("onboarding") || lower.includes("new client") || lower.includes("client")
        ? onboardingPlayer
        : lower.includes("capture") ||
            lower.includes("remember") ||
            lower.includes("context") ||
            lower.includes("note") ||
            lower.includes("find") ||
            lower.includes("insight") ||
            lower.includes("connection")
          ? memoryPlayer
          : successPlayer;

  const player = selectedPlayer ?? onboardingPlayer ?? successPlayer ?? financePlayer ?? memoryPlayer;
  if (!player) return [];

  const onboardingTemplate = MOCK_PLAY_TEMPLATES.find((template) => template.id === "play_onboard");
  const checkinTemplate = MOCK_PLAY_TEMPLATES.find((template) => template.id === "play_checkin");
  const captureCleanupTemplate = MOCK_PLAY_TEMPLATES.find(
    (template) => template.id === "play_capture_cleanup"
  );
  const template =
    player.id === "player_memory_steward"
      ? captureCleanupTemplate
      : player.id === "player_client_success_assistant"
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
