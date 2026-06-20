"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { cn } from "@repo/utils";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  UserPlus,
  Building2,
  Users,
  HelpCircle,
  Package,
  Reply,
  Check,
  X,
  ChevronRight,
  Loader2,
  Route,
  Star,
  Briefcase,
  Calendar,
  Brain,
} from "lucide-react";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@repo/ui";
import {
  actOnFinding,
  applyMemoryPlan,
  dismissFinding,
  toggleFlagFinding,
} from "@/app/_features/capture/actions/intelligence-findings";
import type {
  FindingType,
  FindingWithContext,
} from "@/app/_features/capture/types/intelligence-findings";
import type { MemoryProposal } from "@/app/_features/capture/types/memory-proposals";
import { SourceExternalLink } from "@/app/_features/capture/components/SourceExternalLink";

/**
 * FindingCard — People-centric intelligence display
 *
 * Shows a finding with its attached person/org context.
 * Revenue signals get prominent treatment; pending actions show deadlines.
 */

interface FindingCardProps {
  finding: FindingWithContext;
  onActed?: () => void;
  onDismissed?: () => void;
}

export function FindingCard({ finding, onActed, onDismissed }: FindingCardProps) {
  const [isPending, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState(false);
  const [flagged, setFlagged] = useState(Boolean(finding.flagged_at));

  const isRevenue = finding.finding_type.startsWith("revenue_");
  const memoryProposals = finding.memory_proposals ?? [];
  const hasMemoryProposals =
    memoryProposals.length > 0 && !finding.memory_applied_at;
  const isPendingAction = finding.finding_type.startsWith("pending_");

  const handleAct = () => {
    startTransition(async () => {
      const result = await actOnFinding(finding.id);
      if (result.success) {
        onActed?.();
      }
    });
  };

  const handleApplyMemory = () => {
    startTransition(async () => {
      const result = await applyMemoryPlan(finding.id);
      if (result.success) {
        onActed?.();
      }
    });
  };

  const handleDismiss = () => {
    setDismissed(true);
    startTransition(async () => {
      const result = await dismissFinding(finding.id);
      if (result.success) {
        onDismissed?.();
      } else {
        setDismissed(false);
      }
    });
  };

  const handleToggleFlag = () => {
    startTransition(async () => {
      const result = await toggleFlagFinding(finding.id);
      if (result.success) {
        setFlagged(result.flagged);
      }
    });
  };

  if (dismissed) {
    return null;
  }

  const icon = FINDING_ICONS[finding.finding_type];
  const Icon = icon.component;
  const label = FINDING_LABELS[finding.finding_type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "group relative rounded-2xl border bg-card p-4 transition-all",
        flagged && "border-flame/30 ring-1 ring-flame/20",
        isRevenue
          ? "border-flame/20 ring-1 ring-flame/10"
          : !flagged && "border-border/60 ring-soft"
      )}
    >
      {/* Type Badge */}
      <div className="mb-3 flex items-center justify-between">
        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            icon.bgClass,
            icon.textClass
          )}
        >
          <Icon className="size-3.5" strokeWidth={2} />
          {label}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">
            {formatConfidence(finding.confidence)}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleToggleFlag}
            disabled={isPending}
            className={cn(
              "size-8 shrink-0",
              flagged ? "text-flame hover:text-flame" : "text-muted-foreground"
            )}
            aria-pressed={flagged}
            aria-label={flagged ? "Unflag finding" : "Flag finding for follow-up"}
            title={flagged ? "Unflag" : "Flag for follow-up"}
          >
            <Star
              className="size-4"
              strokeWidth={2}
              fill={flagged ? "currentColor" : "none"}
            />
          </Button>
        </div>
      </div>

      {/* Person/Org Context */}
      <div className="mb-3 flex items-center gap-3">
        {finding.person && (
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">
              {getInitials(finding.person.name || finding.person.email)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {finding.person.name || finding.person.email}
              </p>
              {finding.person.email && finding.person.name && (
                <p className="text-xs text-muted-foreground truncate">
                  {finding.person.email}
                </p>
              )}
            </div>
          </div>
        )}
        {finding.org && !finding.person && (
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">
              <Building2 className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {finding.org.name || "Unknown Org"}
              </p>
            </div>
          </div>
        )}
        {finding.finding_type === "needs_routing" && !finding.person && !finding.org && (
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">
              <Route className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {getRoutingSenderLabel(finding)}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Pick person or org in Memory
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Finding Content */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-foreground">{finding.title}</h3>
        {finding.content && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {finding.content}
          </p>
        )}
        {finding.source_url ? (
          <div className="mt-2">
            <SourceExternalLink href={finding.source_url} />
          </div>
        ) : null}
      </div>

      {/* Evidence Quote */}
      {finding.evidence?.quotes?.[0] && (
        <div className="mb-4 rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-xs italic text-muted-foreground line-clamp-2">
            &ldquo;{finding.evidence.quotes[0]}&rdquo;
          </p>
        </div>
      )}

      {hasMemoryProposals ? (
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Brain className="size-3.5" strokeWidth={2} />
            Suggested Memory
          </div>
          <div className="flex flex-wrap gap-1.5">
            {memoryProposals.map((proposal, index) => (
              <MemoryProposalChip key={`${proposal.surface}-${index}`} proposal={proposal} />
            ))}
          </div>
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {hasMemoryProposals ? (
          <Button
            size="sm"
            onClick={handleApplyMemory}
            disabled={isPending}
            className="flex-1 gap-1.5"
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Brain className="size-3.5" />
            )}
            Apply to Memory
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleAct}
            disabled={isPending}
            className="flex-1 gap-1.5"
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            {getActionLabel(finding.finding_type)}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          disabled={isPending}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </motion.div>
  );
}

const FINDING_ICONS: Record<
  FindingType,
  { component: typeof DollarSign; bgClass: string; textClass: string }
> = {
  revenue_buying: {
    component: DollarSign,
    bgClass: "bg-flame/10",
    textClass: "text-flame",
  },
  revenue_closing: {
    component: TrendingUp,
    bgClass: "bg-emerald-500/10",
    textClass: "text-emerald-600 dark:text-emerald-400",
  },
  revenue_upsell: {
    component: TrendingUp,
    bgClass: "bg-sky/10",
    textClass: "text-sky",
  },
  revenue_risk: {
    component: AlertTriangle,
    bgClass: "bg-destructive/10",
    textClass: "text-destructive",
  },
  new_person: {
    component: UserPlus,
    bgClass: "bg-violet/10",
    textClass: "text-violet",
  },
  new_org: {
    component: Building2,
    bgClass: "bg-muted",
    textClass: "text-muted-foreground",
  },
  referral: {
    component: Users,
    bgClass: "bg-blush/10",
    textClass: "text-blush",
  },
  pending_question: {
    component: HelpCircle,
    bgClass: "bg-warning/10",
    textClass: "text-warning",
  },
  pending_deliverable: {
    component: Package,
    bgClass: "bg-warning/10",
    textClass: "text-warning",
  },
  pending_reply: {
    component: Reply,
    bgClass: "bg-muted",
    textClass: "text-muted-foreground",
  },
  needs_routing: {
    component: Route,
    bgClass: "bg-violet/10",
    textClass: "text-violet",
  },
};

const FINDING_LABELS: Record<FindingType, string> = {
  revenue_buying: "Buying Intent",
  revenue_closing: "Ready to Close",
  revenue_upsell: "Upsell",
  revenue_risk: "Risk",
  new_person: "New Contact",
  new_org: "New Org",
  referral: "Referral",
  pending_question: "Question",
  pending_deliverable: "Deliverable",
  pending_reply: "Your Turn",
  needs_routing: "Route to Profile",
};

function MemoryProposalChip({ proposal }: { proposal: MemoryProposal }) {
  const Icon = MEMORY_SURFACE_ICONS[proposal.surface] ?? Brain;
  const actionLabel =
    proposal.action === "link"
      ? "Link"
      : proposal.action === "update"
        ? "Update"
        : "Create";

  return (
    <Badge variant="secondary" className="gap-1 font-normal">
      <Icon className="size-3" strokeWidth={2} />
      <span>
        {actionLabel} {MEMORY_SURFACE_LABELS[proposal.surface]}
        {proposal.hint.name ? `: ${proposal.hint.name}` : ""}
      </span>
    </Badge>
  );
}

const MEMORY_SURFACE_ICONS: Record<
  MemoryProposal["surface"],
  typeof Building2
> = {
  people: UserPlus,
  orgs: Building2,
  work: Briefcase,
  meetings: Calendar,
  files: Package,
  billing: DollarSign,
  conversations: Reply,
  me: UserPlus,
};

const MEMORY_SURFACE_LABELS: Record<MemoryProposal["surface"], string> = {
  people: "Person",
  orgs: "Org",
  work: "Work",
  meetings: "Meeting",
  files: "File",
  billing: "Billing",
  conversations: "Conversation",
  me: "Profile",
};

function getActionLabel(type: FindingType): string {
  switch (type) {
    case "revenue_buying":
    case "revenue_closing":
      return "Follow up";
    case "revenue_upsell":
      return "Explore";
    case "revenue_risk":
      return "Address";
    case "new_person":
    case "new_org":
    case "needs_routing":
      return "Choose profile";
    case "referral":
      return "Reach out";
    case "pending_question":
    case "pending_deliverable":
    case "pending_reply":
      return "Reply";
    default:
      return "Act";
  }
}

function formatConfidence(confidence: number): string {
  if (confidence >= 90) return "High confidence";
  if (confidence >= 70) return "Medium confidence";
  return "Low confidence";
}

function getInitials(nameOrEmail: string | null): string {
  if (!nameOrEmail) return "?";
  const parts = nameOrEmail.split(/[@\s]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return nameOrEmail.slice(0, 2).toUpperCase();
}

function getRoutingSenderLabel(finding: FindingWithContext): string {
  const metadata = finding.evidence?.metadata as
    | { from_name?: string | null; from_email?: string | null; payment_payer_hint?: string | null }
    | undefined;

  if (metadata?.payment_payer_hint) {
    return metadata.payment_payer_hint;
  }

  return metadata?.from_name?.trim() || metadata?.from_email || "Unknown sender";
}
