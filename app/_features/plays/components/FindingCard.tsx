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
} from "lucide-react";
import { Button } from "@repo/ui";
import {
  actOnFinding,
  dismissFinding,
} from "@/app/_features/capture/actions/intelligence-findings";
import type {
  FindingType,
  FindingWithContext,
} from "@/app/_features/capture/types/intelligence-findings";

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

  const isRevenue = finding.finding_type.startsWith("revenue_");
  const isPendingAction = finding.finding_type.startsWith("pending_");

  const handleAct = () => {
    startTransition(async () => {
      const result = await actOnFinding(finding.id);
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
        isRevenue
          ? "border-flame/20 ring-1 ring-flame/10"
          : "border-border/60 ring-soft"
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
        <span className="text-xs text-muted-foreground">
          {formatConfidence(finding.confidence)}
        </span>
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
      </div>

      {/* Finding Content */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-foreground">{finding.title}</h3>
        {finding.content && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {finding.content}
          </p>
        )}
      </div>

      {/* Evidence Quote */}
      {finding.evidence?.quotes?.[0] && (
        <div className="mb-4 rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-xs italic text-muted-foreground line-clamp-2">
            &ldquo;{finding.evidence.quotes[0]}&rdquo;
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
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
      return "Add to Memory";
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
