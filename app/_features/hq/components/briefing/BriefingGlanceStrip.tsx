"use client";

import Link from "next/link";
import { Calendar, MessageSquare, AlertTriangle, Trophy } from "lucide-react";
import { cn } from "@repo/utils";
import type { GlanceData } from "./types";

interface GlanceItemProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  href: string;
  variant?: "default" | "warning" | "success";
}

function GlanceItem({ icon, value, label, href, variant = "default" }: GlanceItemProps) {
  const hasValue = value > 0;

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all duration-200",
        "hover:bg-white/[0.04]"
      )}
    >
      <span
        className={cn(
          "transition-colors",
          variant === "default" && "text-muted-foreground/60 group-hover:text-muted-foreground",
          variant === "warning" && (hasValue ? "text-warning/80" : "text-muted-foreground/60"),
          variant === "success" && (hasValue ? "text-success/80" : "text-muted-foreground/60")
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          variant === "default" && "text-foreground/80",
          variant === "warning" && (hasValue ? "text-warning" : "text-muted-foreground/60"),
          variant === "success" && (hasValue ? "text-success" : "text-muted-foreground/60")
        )}
      >
        {value}
      </span>
      <span className="text-xs text-muted-foreground/50 group-hover:text-muted-foreground/70 transition-colors">
        {label}
      </span>
    </Link>
  );
}

interface BriefingGlanceStripProps {
  data: GlanceData;
  className?: string;
}

export function BriefingGlanceStrip({ data, className }: BriefingGlanceStripProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <GlanceItem
        icon={<Calendar className="size-3.5" />}
        value={data.meetings}
        label="meetings"
        href="/hq/calendar"
      />
      <span className="text-muted-foreground/20">·</span>
      <GlanceItem
        icon={<MessageSquare className="size-3.5" />}
        value={data.unread}
        label="unread"
        href="/hq/inbox"
      />
      <span className="text-muted-foreground/20">·</span>
      <GlanceItem
        icon={<AlertTriangle className="size-3.5" />}
        value={data.warnings}
        label="alerts"
        href="#needs-attention"
        variant="warning"
      />
      <span className="text-muted-foreground/20">·</span>
      <GlanceItem
        icon={<Trophy className="size-3.5" />}
        value={data.wins}
        label="wins"
        href="#wins"
        variant="success"
      />
    </div>
  );
}
