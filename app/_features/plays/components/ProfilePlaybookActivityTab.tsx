"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { ProfileProvenanceFeedItem } from "@/app/_features/plays/playbooks/profile/types";
import { formatRelationshipLabel } from "@/app/_features/plays/playbooks/profile/resolve-rules";
import { profileFieldLabel } from "@/app/_features/plays/utils/profile-rule-display";
import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";
import { cn } from "@repo/utils";

type ProfilePlaybookActivityTabProps = {
  recentProvenance: ProfileProvenanceFeedItem[];
};

export function ProfilePlaybookActivityTab({ recentProvenance }: ProfilePlaybookActivityTabProps) {
  if (recentProvenance.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No profile fills recorded yet. Fields appear here after capture resolves a person.
      </p>
    );
  }

  return (
    <MemoryOverviewSection title="What Salt filled lately" salt>
      <ol className="relative space-y-0 border-l border-border/60 ml-3">
        {recentProvenance.map((item, index) => (
          <li
            key={item.id}
            className={cn("relative pl-6", index < recentProvenance.length - 1 && "pb-6")}
          >
            <span className="absolute -left-[13px] top-0 size-6 rounded-full bg-sky/10 text-sky grid place-items-center">
              <Sparkles className="size-3" strokeWidth={2.25} />
            </span>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                {item.entityHref ? (
                  <Link href={item.entityHref} className="text-sm font-semibold hover:underline">
                    {item.entityName ?? "Person"}
                  </Link>
                ) : (
                  <p className="text-sm font-semibold">{item.entityName ?? "Record"}</p>
                )}
                <p className="text-sm text-foreground/80">
                  {profileFieldLabel(item.field)} →{" "}
                  {item.field === "relationship_type"
                    ? formatRelationshipLabel(item.value)
                    : item.value ?? "—"}
                </p>
                {item.because && (
                  <p className="text-xs text-muted-foreground">{item.because}</p>
                )}
                <p className="text-[11px] text-muted-foreground/80">
                  {formatProvenanceTime(item.setAt)}
                </p>
              </div>
              <ProvenanceBadge item={item} />
            </div>
          </li>
        ))}
      </ol>
    </MemoryOverviewSection>
  );
}

function ProvenanceBadge({ item }: { item: ProfileProvenanceFeedItem }) {
  if (item.status === "pending") {
    return (
      <span className="inline-flex shrink-0 rounded-full bg-flame/10 px-2 py-0.5 text-[10px] font-semibold text-flame">
        Pending
      </span>
    );
  }
  if (item.source === "manual") {
    return (
      <span className="inline-flex shrink-0 rounded-full bg-sky/10 px-2 py-0.5 text-[10px] font-semibold text-sky">
        Corrected
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 rounded-full bg-violet/10 px-2 py-0.5 text-[10px] font-semibold text-violet">
      Auto-applied
    </span>
  );
}

function formatProvenanceTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (date >= startOfToday) {
    return `Today · ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }
  if (date >= startOfYesterday) {
    return "Yesterday";
  }
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return "This week";
  return date.toLocaleDateString();
}
