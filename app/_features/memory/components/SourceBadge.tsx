"use client";

import {
  CreditCard,
  Mail,
  Calendar,
  MessageSquare,
  Zap,
  User,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui";
import { cn } from "@repo/utils";
import type { EvidenceChainItem } from "@/app/_lib/memory-tools";

export type ProvenanceSource =
  | "rule"
  | "ask_salt"
  | "manual"
  | "enrichment"
  | "playbook"
  | "stripe"
  | "gmail"
  | "calendar"
  | "unknown";

interface SourceBadgeConfig {
  label: string;
  icon: React.ReactNode;
  className: string;
  description: string;
}

const SOURCE_CONFIG: Record<ProvenanceSource, SourceBadgeConfig> = {
  manual: {
    label: "You set this",
    icon: <User className="size-3" />,
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
    description: "You set this value directly",
  },
  rule: {
    label: "Auto-detected",
    icon: <Zap className="size-3" />,
    className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800",
    description: "Salt detected this from your data",
  },
  playbook: {
    label: "Auto-detected",
    icon: <Zap className="size-3" />,
    className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800",
    description: "Salt detected this from your data",
  },
  ask_salt: {
    label: "Via Ask Salt",
    icon: <MessageSquare className="size-3" />,
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
    description: "Set through a conversation with Ask Salt",
  },
  stripe: {
    label: "From payment",
    icon: <CreditCard className="size-3" />,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
    description: "Detected from payment data",
  },
  gmail: {
    label: "From email",
    icon: <Mail className="size-3" />,
    className: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700",
    description: "Extracted from email data",
  },
  calendar: {
    label: "From calendar",
    icon: <Calendar className="size-3" />,
    className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
    description: "Synced from calendar event",
  },
  enrichment: {
    label: "Enriched",
    icon: <Zap className="size-3" />,
    className: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800",
    description: "Enriched from connected accounts",
  },
  unknown: {
    label: "Unknown source",
    icon: <HelpCircle className="size-3" />,
    className: "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700",
    description: "Source not recorded",
  },
};

export interface FieldProvenance {
  source: ProvenanceSource;
  confidence?: number | null;
  because?: string | null;
  ruleId?: string | null;
  setAt?: string;
  evidenceChain?: EvidenceChainItem[];
}

interface SourceBadgeProps {
  provenance: FieldProvenance;
  showConfidence?: boolean;
  className?: string;
}

export function SourceBadge({
  provenance,
  showConfidence = false,
  className,
}: SourceBadgeProps) {
  const config = SOURCE_CONFIG[provenance.source] ?? SOURCE_CONFIG.unknown;
  const hasEvidenceChain = (provenance.evidenceChain?.length ?? 0) > 0;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "gap-1 text-[10px] font-medium cursor-help",
              config.className,
              className
            )}
          >
            {config.icon}
            {config.label}
            {showConfidence && provenance.confidence != null && (
              <span className="opacity-70">{provenance.confidence}%</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="max-w-xs p-0 overflow-hidden"
        >
          <div className="p-3 space-y-2">
            <p className="font-medium text-sm">{config.description}</p>
            {provenance.because && (
              <p className="text-xs text-muted-foreground">
                {provenance.because}
              </p>
            )}
            {provenance.confidence != null && (
              <p className="text-xs text-muted-foreground">
                Confidence: {provenance.confidence}%
              </p>
            )}
            {provenance.setAt && (
              <p className="text-xs text-muted-foreground">
                Set {formatRelativeTime(provenance.setAt)}
              </p>
            )}
          </div>
          {hasEvidenceChain && (
            <div className="border-t bg-muted/30 p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Evidence Chain
              </p>
              <EvidenceChainPreview chain={provenance.evidenceChain!} />
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface EvidenceChainPreviewProps {
  chain: EvidenceChainItem[];
  maxItems?: number;
}

export function EvidenceChainPreview({
  chain,
  maxItems = 3,
}: EvidenceChainPreviewProps) {
  const displayItems = chain.slice(0, maxItems);
  const hasMore = chain.length > maxItems;

  return (
    <div className="space-y-1.5">
      {displayItems.map((item, index) => (
        <div key={index} className="flex items-start gap-2 text-xs">
          <div className="flex items-center gap-1 shrink-0">
            <EvidenceTypeIcon type={item.type} />
            {index < displayItems.length - 1 && (
              <ChevronRight className="size-3 text-muted-foreground/50" />
            )}
          </div>
          <span className="text-muted-foreground truncate">
            {item.label ?? item.key}
          </span>
        </div>
      ))}
      {hasMore && (
        <p className="text-[10px] text-muted-foreground">
          +{chain.length - maxItems} more
        </p>
      )}
    </div>
  );
}

function EvidenceTypeIcon({ type }: { type: EvidenceChainItem["type"] }) {
  const iconClass = "size-3 text-muted-foreground";

  switch (type) {
    case "signal":
      return <Zap className={iconClass} />;
    case "rule":
      return <Zap className={iconClass} />;
    case "user_statement":
      return <MessageSquare className={iconClass} />;
    case "external":
      return <CreditCard className={iconClass} />;
    case "manual":
      return <User className={iconClass} />;
    case "inference":
      return <Zap className={iconClass} />;
    default:
      return <HelpCircle className={iconClass} />;
  }
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
