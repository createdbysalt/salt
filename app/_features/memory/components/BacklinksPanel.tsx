"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Link2, FileText, Sparkles } from "lucide-react";
import { cn } from "@repo/utils";
import { relativeDays } from "@/app/_lib/demo/people-demo-data";

export type Backlink = {
  id: string;
  sourceType: "note" | "person" | "org" | "work" | "space";
  sourceId: string;
  sourceName: string;
  sourceSlug?: string;
  excerpt: string;
  author: "you" | "salt";
  createdAt: string;
};

type BacklinksPanelProps = {
  entityName: string;
  backlinks: Backlink[];
  className?: string;
};

export function BacklinksPanel({ entityName, backlinks, className }: BacklinksPanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (backlinks.length === 0) {
    return null;
  }

  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card/60", className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors rounded-t-2xl"
      >
        <div className="flex items-center gap-2">
          <Link2 className="size-4 text-muted-foreground" strokeWidth={2} />
          <span className="text-sm font-medium text-foreground">
            {backlinks.length} backlink{backlinks.length !== 1 ? "s" : ""}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="size-4 text-muted-foreground" strokeWidth={2} />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" strokeWidth={2} />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-xs text-muted-foreground mb-3">
            Notes and records that mention {entityName}
          </p>
          {backlinks.map((backlink) => (
            <BacklinkCard key={backlink.id} backlink={backlink} />
          ))}
        </div>
      )}
    </div>
  );
}

function BacklinkCard({ backlink }: { backlink: Backlink }) {
  const isSalt = backlink.author === "salt";
  const href = getBacklinkHref(backlink);

  return (
    <Link
      href={href}
      className={cn(
        "block p-3 rounded-xl border transition-all hover:shadow-sm",
        isSalt ? "border-flame/25 hover:border-flame/40" : "border-border/60 hover:border-border"
      )}
    >
      <div className="flex items-start gap-2 mb-1.5">
        {isSalt ? (
          <span className="size-5 rounded-full bg-flame/10 grid place-items-center text-flame shrink-0">
            <Sparkles className="size-3" strokeWidth={2.25} />
          </span>
        ) : (
          <span className="size-5 rounded-full bg-muted grid place-items-center shrink-0">
            <FileText className="size-3 text-muted-foreground" strokeWidth={2} />
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-foreground truncate">
              {backlink.sourceName}
            </span>
            <span className="text-[10px] text-muted-foreground">
              · {relativeDays(backlink.createdAt)}
            </span>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 pl-7">{backlink.excerpt}</p>
    </Link>
  );
}

function getBacklinkHref(backlink: Backlink): string {
  const slug = backlink.sourceSlug ?? backlink.sourceId;
  switch (backlink.sourceType) {
    case "note":
      return `/notes/${slug}`;
    case "person":
      return `/people/${slug}`;
    case "org":
      return `/orgs/${slug}`;
    case "work":
      return `/work/${slug}`;
    default:
      return "#";
  }
}
