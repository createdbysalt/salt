"use client";

import Link from "next/link";
import {
  User,
  Building2,
  Briefcase,
  CreditCard,
  FileText,
  Calendar,
  MessageSquare,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";
import type { LinkedRecord, MemorySurface } from "../services/enrichment/types";

const SURFACE_CONFIG: Record<MemorySurface, { icon: LucideIcon; label: string; route: string }> = {
  people: { icon: User, label: "Person", route: "/people" },
  orgs: { icon: Building2, label: "Org", route: "/orgs" },
  work: { icon: Briefcase, label: "Work", route: "/work" },
  billing: { icon: CreditCard, label: "Billing", route: "/billing" },
  files: { icon: FileText, label: "File", route: "/resources" },
  meetings: { icon: Calendar, label: "Meeting", route: "/meetings" },
  conversations: { icon: MessageSquare, label: "Conversation", route: "/conversations" },
  me: { icon: User, label: "Me", route: "/me" },
};

interface LinkedRecordsSectionProps {
  records: LinkedRecord[];
  onLinkNew?: () => void;
  className?: string;
}

export function LinkedRecordsSection({
  records,
  onLinkNew,
  className,
}: LinkedRecordsSectionProps) {
  if (records.length === 0 && !onLinkNew) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Linked to
      </p>

      <div className="space-y-1.5">
        {records.map((record) => {
          const config = SURFACE_CONFIG[record.surface];
          const Icon = config.icon;

          return (
            <Link
              key={`${record.surface}-${record.entity_id}`}
              href={`${config.route}/${record.entity_id}`}
              className="flex items-center gap-2 rounded-lg p-2 transition hover:bg-muted"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted">
                <Icon className="size-3.5 text-muted-foreground" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {record.entity_label}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {config.label} · {record.confidence}% match
                </p>
              </div>
            </Link>
          );
        })}

        {onLinkNew && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLinkNew}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-3.5" strokeWidth={2} />
            <span className="text-xs">Link to record</span>
          </Button>
        )}
      </div>
    </div>
  );
}
