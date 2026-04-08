"use client";

import Link from "next/link";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";
import {
  Calendar,
  Target,
  MessageSquare,
  FileText,
  Users,
  FolderKanban,
  ArrowRight,
} from "lucide-react";
import type { BriefingItemData, BriefingItemType } from "./types";

const typeConfig: Record<
  BriefingItemType,
  { icon: React.ReactNode; bg: string; iconColor: string; glow: string }
> = {
  meeting: {
    icon: <Calendar className="size-4" />,
    bg: "bg-violet-500/10",
    iconColor: "text-violet-400",
    glow: "shadow-violet-500/20",
  },
  milestone: {
    icon: <Target className="size-4" />,
    bg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    glow: "shadow-blue-500/20",
  },
  message: {
    icon: <MessageSquare className="size-4" />,
    bg: "bg-indigo-500/10",
    iconColor: "text-indigo-400",
    glow: "shadow-indigo-500/20",
  },
  invoice: {
    icon: <FileText className="size-4" />,
    bg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    glow: "shadow-amber-500/20",
  },
  lead: {
    icon: <Users className="size-4" />,
    bg: "bg-orange-500/10",
    iconColor: "text-orange-400",
    glow: "shadow-orange-500/20",
  },
  project: {
    icon: <FolderKanban className="size-4" />,
    bg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    glow: "shadow-emerald-500/20",
  },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface BriefingItemProps {
  item: BriefingItemData;
  showBorder?: boolean;
}

export function BriefingItem({ item, showBorder = true }: BriefingItemProps) {
  const config = typeConfig[item.type];

  const content = (
    <div
      className={cn(
        "group flex items-center gap-4 px-5 py-4 transition-all duration-200",
        showBorder && "border-b border-white/[0.04] last:border-b-0",
        "hover:bg-white/[0.02]"
      )}
    >
      {/* Icon with glow effect */}
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
          config.bg,
          config.iconColor,
          "group-hover:shadow-lg",
          `group-hover:${config.glow}`
        )}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-foreground/90 truncate group-hover:text-foreground transition-colors">
            {item.title}
          </p>
          {item.time && (
            <span className="shrink-0 rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {item.time}
            </span>
          )}
        </div>
        {item.subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground/70 truncate">
            {item.subtitle}
            {item.daysOverdue && item.daysOverdue > 0 && (
              <span className="ml-1 text-amber-500/80">
                · {item.daysOverdue}d overdue
              </span>
            )}
          </p>
        )}
      </div>

      {/* Amount (if present) */}
      {item.amount !== undefined && (
        <span className="shrink-0 text-base font-semibold tabular-nums tracking-tight text-foreground">
          {formatCurrency(item.amount)}
        </span>
      )}

      {/* Actions */}
      {item.actions.length > 0 && (
        <div className="flex shrink-0 items-center gap-2">
          {item.actions.map((action, idx) => (
            <Button
              key={idx}
              variant={action.variant || "outline"}
              size="sm"
              className={cn(
                "h-8 rounded-lg text-xs font-medium transition-all",
                action.variant === "outline" &&
                  "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20"
              )}
              asChild={!!action.href}
              onClick={action.onClick}
            >
              {action.href ? (
                <Link href={action.href}>
                  {action.label}
                  {idx === 0 && <ArrowRight className="ml-1 size-3" />}
                </Link>
              ) : (
                action.label
              )}
            </Button>
          ))}
        </div>
      )}
    </div>
  );

  if (item.href && item.actions.length === 0) {
    return <Link href={item.href}>{content}</Link>;
  }

  return content;
}
