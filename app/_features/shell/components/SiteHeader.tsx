"use client";

import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Sparkles,
  PenLine,
  Mic,
  Send,
  CheckCircle2,
  Loader2,
  X,
  ArrowRight,
  User as UserIcon,
  Building2,
  Briefcase,
  Users,
  FileText,
  Zap,
  Menu,
} from "lucide-react";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";
import { useDashboardShell } from "../contexts/DashboardShellContext";

/**
 * SiteHeader - Consistent header across all dashboard pages
 * Features: Search bar (triggers ⌘K), Capture button (opens panel)
 */

// Routes that provide their own header entirely
const ROUTES_WITH_CUSTOM_HEADER = ["/hq/inbox"];

type SubmitState = "idle" | "processing" | "review" | "complete";
type CaptureIntent = "auto" | "person" | "note" | "work" | "team" | "organization";
type CaptureEntityType = "person" | "organization" | "work" | "team" | "note" | "action";

type ExtractedCreation = {
  id: string;
  label: string;
  detail: string;
  entityType: CaptureEntityType;
  action: "Create" | "Link" | "Add" | "Queue";
  confidence: "high" | "medium";
};

const CAPTURE_INTENTS: Array<{
  value: CaptureIntent;
  label: string;
  helper: string;
}> = [
  { value: "auto", label: "Anything", helper: "Let Salt route it" },
  { value: "person", label: "Person", helper: "Create or update a profile" },
  { value: "note", label: "Note", helper: "Remember a thought" },
  { value: "work", label: "Work", helper: "Project or client work" },
  { value: "team", label: "Team", helper: "Internal member or team" },
  { value: "organization", label: "Org", helper: "Company or account" },
];

const PLACEHOLDERS: Record<CaptureIntent, string> = {
  auto: "What's on your mind?",
  person: "Elena Marquez at Luma Health owns patient experience and referral-site budget.",
  note: "Elena prefers concise async updates with source links before Friday launch reviews.",
  work: "New expansion idea for Luma: referral partner site rebuild. Elena owns approvals.",
  team: "Maya is the solo operator; route internal prep to Northstar Studio operations.",
  organization: "Luma Health, healthcare client. Elena owns patient experience and mentioned referral-site expansion.",
};

export function SiteHeader({
  askActive = false,
  onAskSaltOpenChange,
}: {
  askActive?: boolean;
  onAskSaltOpenChange?: (open: boolean) => void;
} = {}) {
  const pathname = usePathname();
  const dashboardShell = useDashboardShell();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureIntent] = useState<CaptureIntent>("auto");

  // ⌘C shortcut for Capture
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "c" && !e.shiftKey && !e.altKey) {
        // Only trigger if no text is selected (don't override copy)
        const selection = window.getSelection();
        if (!selection || selection.toString().length === 0) {
          e.preventDefault();
          window.dispatchEvent(
            new CustomEvent("salt:open-capture", {
              detail: { intent: "auto" },
            })
          );
          setCaptureOpen(false);
        }
      }
      if (e.key === "Escape" && captureOpen) {
        setCaptureOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [captureOpen]);

  // Hide on routes with custom headers
  if (ROUTES_WITH_CUSTOM_HEADER.some((route) => pathname.startsWith(route))) {
    return null;
  }

  const handleSearchClick = () => {
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  return (
    <>
      <header className="topbar-shell sticky top-0 z-30 shrink-0 border-b border-border/50 bg-background/75 px-4 backdrop-blur-xl lg:px-10">
        <div className="relative mx-auto flex w-full max-w-[1400px] min-h-[var(--topbar-shell-height)] items-center gap-3">
          <button
            type="button"
            onClick={() => dashboardShell?.openMobileMenu()}
            className="grid size-10 shrink-0 place-items-center rounded-xl transition-colors hover:bg-muted lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" strokeWidth={1.75} />
          </button>

          <div className="flex shrink-0 items-center lg:hidden">
            <span
              aria-label="Salt"
              role="img"
              className="block h-5 w-[40px] bg-foreground"
              style={{
                maskImage: "url(/salt-logo.svg)",
                WebkitMaskImage: "url(/salt-logo.svg)",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskPosition: "center",
                WebkitMaskPosition: "center",
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleSearchClick}
            className="group hidden h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-2xl border border-border/80 bg-muted/60 px-4 text-sm text-muted-foreground transition-all hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/5 lg:flex"
          >
            <Search className="size-4 shrink-0" strokeWidth={1.75} />
            <span className="flex-1 text-left">Search or do anything</span>
            <span className="kbd hidden sm:inline-flex">⌘K</span>
          </button>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 lg:ml-0 lg:gap-3">
            <button
              type="button"
              className={cn(
                "group hidden h-11 items-center gap-2 rounded-2xl bg-card pl-3.5 pr-4 text-sm font-medium text-foreground ring-soft hover-lift lg:inline-flex",
                askActive && "ring-2 ring-foreground/15"
              )}
              aria-label="Ask Salt"
              title="Ask Salt"
              data-ask-salt-trigger
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("salt:open-ask-salt", {
                    detail: { mode: "ask" },
                  })
                );
                onAskSaltOpenChange?.(true);
                setCaptureOpen(false);
              }}
            >
              <span className="surface-aurora grid size-5 place-items-center rounded-full">
                <Sparkles className="relative z-10 size-3 text-white" strokeWidth={2.5} />
              </span>
              Ask Salt
            </button>

            <button
              type="button"
              className={cn(
                "group inline-flex h-9 items-center gap-1.5 rounded-xl bg-card pl-2.5 pr-3 text-xs font-medium text-foreground ring-soft hover-lift lg:hidden",
                askActive && "ring-2 ring-foreground/15"
              )}
              aria-label="Ask Salt"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("salt:open-ask-salt", {
                    detail: { mode: "ask" },
                  })
                );
                onAskSaltOpenChange?.(true);
                setCaptureOpen(false);
              }}
            >
              <span className="surface-aurora grid size-5 shrink-0 place-items-center rounded-full">
                <Sparkles className="relative z-10 size-2.5 text-white" strokeWidth={2.5} />
              </span>
              Ask Salt
            </button>

            {captureOpen && (
              <CapturePanel
                initialIntent={captureIntent}
                onClose={() => setCaptureOpen(false)}
              />
            )}
          </div>
        </div>
      </header>
    </>
  );
}

// ============================================================================
// CAPTURE PANEL
// ============================================================================

function CapturePanel({
  initialIntent,
  onClose,
}: {
  initialIntent: CaptureIntent;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [intent, setIntent] = useState<CaptureIntent>(initialIntent);
  const [state, setState] = useState<SubmitState>("idle");
  const [previewItems, setPreviewItems] = useState<ExtractedCreation[]>([]);
  const [createdItems, setCreatedItems] = useState<ExtractedCreation[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-focus
  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setIntent(initialIntent);
  }, [initialIntent]);

  // Click outside dismisses
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (target.closest('[data-capture-trigger]')) return;
        onClose();
      }
    };
    const t = setTimeout(() => {
      window.addEventListener("mousedown", handler);
    }, 100);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setPreviewItems([]);
    setState("processing");
    await wait(900);
    setPreviewItems(buildDemoExtraction(text, intent));
    setState("review");
  };

  const handleCreateAll = async () => {
    setCreatedItems(previewItems);
    setState("complete");
    await wait(1800);
    onClose();
  };

  const handleRemovePreviewItem = (id: string) => {
    setPreviewItems((items) => items.filter((item) => item.id !== id));
  };

  const activeIntent = CAPTURE_INTENTS.find((item) => item.value === intent) ?? CAPTURE_INTENTS[0];

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Capture"
      className={cn(
        "absolute top-full right-0 mt-2 z-50 w-[min(30rem,calc(100vw-2rem))]",
        "rounded-xl border border-border bg-card shadow-2xl",
        "overflow-hidden",
        "animate-in fade-in slide-in-from-top-2 duration-200"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60">
        <div className="flex items-center gap-2">
          <PenLine className="size-3.5 text-accent" />
          <span className="text-sm font-medium">Capture</span>
          <span className="text-[10px] text-muted-foreground/50">⌘C</span>
          <span className="text-[10px] text-muted-foreground/50">·</span>
          <span className="text-[10px] text-muted-foreground/70">{activeIntent.helper}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {state === "complete" ? (
        <div className="px-5 py-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-center size-10 rounded-full bg-success/10 text-success mx-auto mb-2.5">
            <CheckCircle2 className="size-5" />
          </div>
          <p className="text-sm font-medium mb-1">Created from capture</p>
          <p className="text-[11px] text-muted-foreground leading-snug mb-3">
            {summarizeCreatedItems(createdItems)}
          </p>
          <Link
            href="/plays?tab=activity"
            onClick={onClose}
            className="inline-flex items-center gap-1 text-[11px] text-foreground/70 hover:text-foreground"
          >
            View activity
            <ArrowRight className="size-3" />
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 px-4 py-2.5 border-b border-border/60 bg-muted/20">
            {CAPTURE_INTENTS.map((item) => {
              const selected = intent === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setIntent(item.value)}
                  disabled={state !== "idle"}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                    selected
                      ? "border-primary/30 bg-primary/10 text-foreground"
                      : "border-border/70 bg-background/60 text-muted-foreground hover:text-foreground",
                    state !== "idle" && "cursor-not-allowed opacity-60"
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={PLACEHOLDERS[intent]}
            rows={5}
            disabled={state !== "idle"}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className={cn(
              "w-full resize-none bg-transparent border-0 px-4 py-3",
              "text-sm leading-relaxed",
              "placeholder:text-muted-foreground/70",
              "focus:outline-none disabled:opacity-60"
            )}
          />

          {state === "review" && (
            <CreationPreview
              items={previewItems}
              onRemove={handleRemovePreviewItem}
            />
          )}

          <div className="flex items-center justify-between px-2.5 py-2 border-t border-border/60 bg-muted/20">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 text-[11px] text-muted-foreground px-1.5"
                disabled
              >
                <Mic className="size-3" />
                Voice
              </Button>
              <Link
                href="/plays?tab=activity&view=captures"
                onClick={onClose}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1"
              >
                View all →
              </Link>
            </div>
            <div className="flex items-center gap-2">
              {state !== "review" && (
                <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
                  ⌘↵
                </span>
              )}
              <Button
                size="sm"
                onClick={state === "review" ? handleCreateAll : handleSubmit}
                disabled={
                  state === "review"
                    ? previewItems.length === 0
                    : !text.trim() || state !== "idle"
                }
                className="h-6 gap-1 text-[11px] px-2"
              >
                {state === "processing" ? (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    Processing
                  </>
                ) : (
                  <>
                    {state === "review" ? (
                      <>
                        <CheckCircle2 className="size-3" />
                        Create All
                      </>
                    ) : (
                      <>
                        <Send className="size-3" />
                        Save
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>

          {state === "processing" && <QuickProcessingReveal text={text} intent={intent} />}
        </>
      )}
    </div>
  );
}

function QuickProcessingReveal({
  text,
  intent,
}: {
  text: string;
  intent: CaptureIntent;
}) {
  const [revealed, setRevealed] = useState(0);
  const previewItems = React.useMemo(
    () => buildDemoExtraction(text, intent).slice(0, 4),
    [intent, text]
  );

  useEffect(() => {
    if (revealed >= previewItems.length) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), 280);
    return () => clearTimeout(t);
  }, [previewItems.length, revealed]);

  return (
    <div className="border-t border-accent/15 bg-accent/5 px-4 py-2.5 space-y-1.5 animate-in fade-in duration-200">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
        <Sparkles className="size-3 text-accent animate-pulse" />
        Saved. Reading people, notes, work, and teams…
      </div>
      {previewItems.slice(0, revealed).map((item) => {
        const meta = entityMeta(item.entityType);
        return (
          <div
            key={item.id}
            className="flex items-center gap-2 animate-in fade-in slide-in-from-left-1 duration-300"
          >
            <div
              className={cn(
                "flex items-center justify-center size-5 rounded shrink-0",
                meta.bg,
                meta.fg
              )}
            >
              <meta.Icon className="size-3" />
            </div>
            <span className="text-[11px] leading-tight flex-1 min-w-0 truncate">
              <span className="text-muted-foreground">{item.action}</span>{" "}
              <span className="font-medium">{item.label}</span>
            </span>
            <CheckCircle2 className="size-3 text-success shrink-0" />
          </div>
        );
      })}
    </div>
  );
}

function CreationPreview({
  items,
  onRemove,
}: {
  items: ExtractedCreation[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="border-t border-primary/15 bg-primary/5 px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-primary" />
          <p className="text-xs font-medium">Ready to create</p>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Remove anything Salt got wrong
        </p>
      </div>

      <div className="space-y-1.5">
        {items.map((item) => {
          const meta = entityMeta(item.entityType);

          return (
            <div
              key={item.id}
              className="flex items-start gap-2 rounded-lg border border-border/70 bg-card px-2.5 py-2"
            >
              <div
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
                  meta.bg,
                  meta.fg
                )}
              >
                <meta.Icon className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-medium">
                    <span className="text-muted-foreground">{item.action}</span>{" "}
                    {item.label}
                  </p>
                  {item.confidence === "medium" && (
                    <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning">
                      Check
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                  {item.detail}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`Remove ${item.label}`}
                className="rounded p-0.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function wait(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

function entityMeta(entityType: CaptureEntityType) {
  switch (entityType) {
    case "person":
      return { Icon: UserIcon, bg: "bg-accent/10", fg: "text-accent" };
    case "organization":
      return { Icon: Building2, bg: "bg-info/10", fg: "text-info" };
    case "work":
      return { Icon: Briefcase, bg: "bg-primary/10", fg: "text-primary" };
    case "team":
      return { Icon: Users, bg: "bg-muted", fg: "text-foreground" };
    case "note":
      return { Icon: FileText, bg: "bg-muted", fg: "text-foreground" };
    case "action":
      return { Icon: Zap, bg: "bg-warning/10", fg: "text-warning" };
  }
}

function buildDemoExtraction(content: string, intent: CaptureIntent): ExtractedCreation[] {
  const text = content.trim();
  const lower = text.toLowerCase();
  const personName = extractPersonName(text);
  const organizationName = extractOrganizationName(text);
  const workName = extractWorkName(text);
  const teamName = extractTeamName(text);
  const items: ExtractedCreation[] = [];

  const wantsPerson =
    intent === "person" ||
    Boolean(personName) ||
    containsAny(lower, ["new person", "profile", "contact", "met ", "introduced"]);
  const wantsOrganization =
    intent === "organization" ||
    Boolean(organizationName) ||
    containsAny(lower, ["company", "organization", "client", "prospect", "account"]);
  const wantsWork =
    intent === "work" ||
    Boolean(workName) ||
    containsAny(lower, ["project", "work", "launch", "rebrand", "homepage", "scope"]);
  const wantsTeam =
    intent === "team" ||
    Boolean(teamName) ||
    containsAny(lower, ["team", "contractor", "designer", "developer", "joining"]);
  const wantsAction =
    containsAny(lower, ["follow up", "follow-up", "due", "needs", "wants", "remind", "friday", "tomorrow"]);

  if (wantsPerson) {
    const label = personName ?? "Maya Patel";
    items.push({
      id: "person",
      entityType: "person",
      action: "Create",
      label,
      detail: [
        organizationName ? `Organization: ${organizationName}` : null,
        teamName ? `Team: ${teamName}` : null,
        "Profile starts with the context you typed.",
      ]
        .filter(Boolean)
        .join(" · "),
      confidence: personName ? "high" : "medium",
    });
  }

  if (wantsOrganization) {
    const label = organizationName ?? "Luma Health";
    items.push({
      id: "organization",
      entityType: "organization",
      action: organizationName ? "Link" : "Create",
      label,
      detail: "Store relationship notes, people, and active work under this account.",
      confidence: organizationName ? "high" : "medium",
    });
  }

  if (wantsWork) {
    const label = workName ?? "Patient Portal Launch";
    items.push({
      id: "work",
      entityType: "work",
      action: workName ? "Link" : "Create",
      label,
      detail: organizationName
        ? `Connect this capture to work for ${organizationName}.`
        : "Connect the people, notes, and follow-ups to this work item.",
      confidence: workName ? "high" : "medium",
    });
  }

  if (wantsTeam) {
    const label = teamName ?? "Brand team";
    items.push({
      id: "team",
      entityType: "team",
      action: intent === "team" ? "Create" : "Link",
      label,
      detail: personName
        ? `Add ${personName} to the team context for future routing.`
        : "Keep internal collaborators and responsibilities visible.",
      confidence: teamName ? "high" : "medium",
    });
  }

  items.push({
    id: "note",
    entityType: "note",
    action: "Add",
    label: "Note",
    detail: summarizeText(text),
    confidence: "high",
  });

  if (wantsAction) {
    items.push({
      id: "action",
      entityType: "action",
      action: "Queue",
      label: extractActionLabel(text),
      detail: "Commitment language becomes a Play so you can approve the next step.",
      confidence: "medium",
    });
  }

  return items;
}

function extractPersonName(text: string) {
  const known = [
    "Elena Marquez",
    "Jon Bell",
    "Maya Patel",
    "Ari Cohen",
    "Priya Shah",
    "Lisa Morgan",
    "Theo Grant",
    "Taylor Kim",
  ];
  const knownMatch = known.find((name) => text.toLowerCase().includes(name.toLowerCase()));
  if (knownMatch) return knownMatch;

  const match = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/);
  return match?.[1] ?? null;
}

function extractOrganizationName(text: string) {
  const known = ["Luma Health", "Cedar & Co.", "Brightline Legal", "Helios Advisory", "Vermilion Design", "Atlas Coaching"];
  const knownMatch = known.find((name) => text.toLowerCase().includes(name.toLowerCase()));
  if (knownMatch) return knownMatch;

  const match = text.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?\s+(?:Corp|Co|Inc|Studio|LLC|Agency))\b/);
  return match?.[1] ?? null;
}

function extractWorkName(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("patient") && lower.includes("portal")) return "Patient Portal Launch";
  if (lower.includes("referral") && lower.includes("site")) return "Referral Partner Site Expansion";
  if (lower.includes("homepage")) return "Homepage refresh";
  if (lower.includes("launch")) return "Launch project";

  const match = text.match(/\b(?:project|work)\s+(?:for\s+)?([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,3})\b/);
  return match?.[1] ?? null;
}

function extractTeamName(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("brand team")) return "Brand team";
  if (lower.includes("design team")) return "Design team";
  if (lower.includes("dev team") || lower.includes("developer")) return "Development team";

  const match = text.match(/\b([A-Z][A-Za-z]+ team)\b/i);
  if (!match?.[1]) return null;
  return match[1].slice(0, 1).toUpperCase() + match[1].slice(1).toLowerCase();
}

function extractActionLabel(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("follow")) return "Follow up";
  if (lower.includes("iteration")) return "Draft next iteration";
  if (lower.includes("remind")) return "Reminder";
  return "Review next step";
}

function containsAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

function summarizeText(text: string) {
  if (text.length <= 110) return text;
  return `${text.slice(0, 107).trim()}...`;
}

function summarizeCreatedItems(items: ExtractedCreation[]) {
  if (items.length === 0) return "Saved as a capture.";

  const labels = items
    .filter((item) => item.entityType !== "note")
    .slice(0, 3)
    .map((item) => item.label);
  const noteText = items.some((item) => item.entityType === "note") ? "+ note saved" : "";

  return [labels.join(" · "), noteText].filter(Boolean).join("\n");
}
