"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Mic2,
  Receipt,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";
import {
  SiGmail,
  SiGooglecalendar,
  SiGoogledrive,
  SiNotion,
  SiQuickbooks,
  SiStripe,
} from "@icons-pack/react-simple-icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Card,
  Progress,
} from "@repo/ui";

const TOOL_GROUPS = [
  {
    id: "communication",
    title: "Connect communication",
    description: "Import the client threads and decisions Salt should be able to cite.",
    icon: Mail,
    tools: [
      { id: "gmail", name: "Gmail", detail: "Necessary", logo: SiGmail, color: "#EA4335", required: true },
      { id: "slack", name: "Slack", detail: "Optional", logo: SlackLogo },
      { id: "calendar", name: "Google Calendar", detail: "Necessary", logo: SiGooglecalendar, color: "#4285F4", required: true },
    ],
  },
  {
    id: "meetings",
    title: "Connect meetings",
    description: "Let Salt join calls, take notes, and pull out follow-ups.",
    icon: Mic2,
    tools: [
      {
        id: "salt-meeting-bot",
        name: "Salt Meeting Bot",
        detail: "Joins client calls, captures decisions, and drafts follow-ups",
        logo: SaltBotLogo,
        color: "currentColor",
      },
    ],
  },
  {
    id: "work",
    title: "Connect work files",
    description: "Bring in proposals, briefs, contracts, and client assets.",
    icon: FileText,
    tools: [
      { id: "drive", name: "Google Drive", detail: "Necessary", logo: SiGoogledrive, color: "#4285F4", required: true },
      { id: "notion", name: "Notion", detail: "Optional", logo: SiNotion, color: "#111111" },
    ],
  },
  {
    id: "finance",
    title: "Connect billing",
    description: "Let Salt spot invoices, retainers, and payment timing.",
    icon: Receipt,
    tools: [
      { id: "stripe", name: "Stripe", detail: "Recommended", logo: SiStripe, color: "#635BFF" },
      { id: "quickbooks", name: "QuickBooks", detail: "Optional", logo: SiQuickbooks, color: "#2CA01C" },
    ],
  },
];

const LAUNCH_PLAYERS = [
  {
    name: "Follow-up",
    detail: "Revives quiet clients, leads, and promised next steps.",
    icon: MessageSquare,
  },
  {
    name: "Brief",
    detail: "Turns calls, notes, files, and Roundtables into usable briefs.",
    icon: ClipboardList,
  },
  {
    name: "Client Risk",
    detail: "Flags relationship, delivery, payment, and expectation risk.",
    icon: AlertTriangle,
  },
  {
    name: "Scope",
    detail: "Prepares proposals, scope changes, and project outlines.",
    icon: FileText,
  },
  {
    name: "Billing",
    detail: "Prepares invoices, payment follow-ups, and renewal reminders.",
    icon: Receipt,
  },
];

function SlackLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#36C5F0" d="M8.7 3.2a2 2 0 0 1 4 0v4.7h-4V3.2Z" />
      <path fill="#2EB67D" d="M20.8 8.7a2 2 0 0 1 0 4h-4.7v-4h4.7Z" />
      <path fill="#ECB22E" d="M15.3 20.8a2 2 0 0 1-4 0v-4.7h4v4.7Z" />
      <path fill="#E01E5A" d="M3.2 15.3a2 2 0 0 1 0-4h4.7v4H3.2Z" />
      <path fill="#36C5F0" d="M7.9 8.7H5.2a2 2 0 1 1 2.7-2.7v2.7Z" />
      <path fill="#2EB67D" d="M15.3 7.9V5.2A2 2 0 1 1 18 7.9h-2.7Z" />
      <path fill="#ECB22E" d="M16.1 15.3h2.7a2 2 0 1 1-2.7 2.7v-2.7Z" />
      <path fill="#E01E5A" d="M8.7 16.1v2.7A2 2 0 1 1 6 16.1h2.7Z" />
    </svg>
  );
}

function SaltBotLogo({ className }: { className?: string; color?: string }) {
  return (
    <span
      className={className}
      aria-hidden="true"
    >
      <Sparkles className="size-full text-primary" />
    </span>
  );
}

export function OnboardingDemoPage() {
  const [connectedTools, setConnectedTools] = React.useState<string[]>([]);
  const [isScanning, setIsScanning] = React.useState(false);
  const connectedCount = connectedTools.length;
  const setupProgress = Math.min(92, Math.round((connectedCount / 5) * 76));
  const coreReady = ["gmail", "calendar", "drive"].every((tool) => connectedTools.includes(tool));
  const showPayoff = coreReady && !isScanning;

  React.useEffect(() => {
    if (!coreReady) return;
    setIsScanning(true);
    const timeout = window.setTimeout(() => setIsScanning(false), 900);
    return () => window.clearTimeout(timeout);
  }, [coreReady]);

  const handleConnect = (toolId: string) => {
    setConnectedTools((current) =>
      current.includes(toolId) ? current : [...current, toolId]
    );
  };

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
            <Sparkles className="size-5 text-primary" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome to Salt, Maya
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Connect the tools you already use. Salt will organize your Memory and
            suggest the first Plays before you land in HQ.
          </p>
        </div>

        <Card className="overflow-hidden">
          <Accordion type="single" defaultValue="communication" collapsible>
            {TOOL_GROUPS.map((group) => {
              const GroupIcon = group.icon;
              const groupConnectedCount = group.tools.filter((tool) =>
                connectedTools.includes(tool.id)
              ).length;
              return (
                <AccordionItem key={group.id} value={group.id} className="border-b last:border-b-0">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline">
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <GroupIcon className="size-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{group.title}</span>
                          {groupConnectedCount > 0 && (
                            <Badge variant="secondary">{groupConnectedCount} connected</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs font-normal text-muted-foreground">
                          {group.description}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5">
                    <div className="space-y-2">
                      {group.tools.map((tool) => {
                        const ToolLogo = tool.logo;
                        const isConnected = connectedTools.includes(tool.id);
                        return (
                          <div
                            key={tool.name}
                            className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                                <ToolLogo className="size-5" color={tool.color} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{tool.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {tool.detail}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <button className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                                Learn more
                                <ChevronDown className="size-3" />
                              </button>
                              <Button
                                size="sm"
                                variant={isConnected ? "outline" : "default"}
                                onClick={() => handleConnect(tool.id)}
                              >
                                {isConnected ? (
                                  <>
                                    <CheckCircle2 className="size-3.5" />
                                    Connected
                                  </>
                                ) : (
                                  "Connect"
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          <div className="flex items-start gap-2 border-t border-border px-5 py-4 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            <p>
              Your data is only used to organize your workspace. Salt will ask before
              saving Memory, sending messages, or running Plays.
            </p>
          </div>
        </Card>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {coreReady
                ? "Core tools connected"
                : "Connect Gmail, Calendar, and Drive to let Salt start organizing."}
            </span>
            <span className="font-medium">{connectedCount} connected</span>
          </div>
          <Progress value={coreReady ? 76 : Math.max(8, setupProgress)} />
        </div>

        {(isScanning || showPayoff) && (
          <Card className="mt-5 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {isScanning ? (
                    <Loader2 className="size-4 animate-spin text-primary" />
                  ) : (
                    <Sparkles className="size-4 text-primary" />
                  )}
                  <h2 className="font-semibold tracking-tight">
                    {isScanning
                      ? "Salt is organizing your Memory"
                      : "Salt found your first workspace map"}
                  </h2>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {isScanning
                    ? "Checking threads, meetings, files, and invoices for context worth saving."
                    : "People, Orgs, Work, Files, Meetings, Billing, Convos, and the first five Players are ready for review."}
                </p>
              </div>
              <Button asChild disabled={isScanning}>
                <Link href="/hq">
                  Review in HQ
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Setup progress</span>
                <span className="font-medium">
                  {isScanning ? "Scanning" : `${setupProgress}%`}
                </span>
              </div>
              <Progress value={isScanning ? 84 : setupProgress} />
            </div>

            {!isScanning && (
              <div className="mt-5 grid gap-2 md:grid-cols-2">
                {LAUNCH_PLAYERS.map((player) => {
                  const PlayerIcon = player.icon;
                  return (
                    <div
                      key={player.name}
                      className="rounded-lg border border-border bg-background p-3"
                    >
                      <div className="flex items-center gap-2">
                        <PlayerIcon className="size-3.5 text-primary" />
                        <p className="text-sm font-medium">{player.name}</p>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {player.detail}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        <div className="mt-6 flex justify-end">
          <Button asChild size="lg">
            <Link href="/hq">
              Continue
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
