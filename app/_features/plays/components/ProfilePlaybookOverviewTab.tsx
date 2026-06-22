"use client";

import { Sparkles } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { PlaybookBlueprintView } from "@/app/_features/plays/types";
import type { ProfileProvenanceStats } from "@/app/_features/plays/playbooks/profile/types";

type ProfilePlaybookOverviewTabProps = {
  blueprint: PlaybookBlueprintView;
  stats: ProfileProvenanceStats;
  procedureText: string | null;
  onViewActivity: () => void;
};

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h2 className="text-base font-semibold text-foreground mt-8 mb-3 first:mt-0">{children}</h2>
  ),
  h2: ({ children }) => (
    <h3 className="text-base font-semibold text-foreground mt-8 mb-3 first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="text-sm font-semibold text-foreground mt-6 mb-2">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="text-sm leading-relaxed text-foreground/75 mb-3">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 space-y-1.5 pl-5 list-disc text-sm leading-relaxed text-foreground/75 marker:text-muted-foreground/60">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 space-y-1.5 pl-5 list-decimal text-sm leading-relaxed text-foreground/75 marker:text-muted-foreground/60">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-medium text-foreground">{children}</strong>,
  code: ({ children }) => (
    <code className="rounded bg-muted/60 px-1.5 py-0.5 text-[13px] text-foreground">{children}</code>
  ),
};

function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^\s*#\s+.+\n+/, "");
}

export function ProfilePlaybookOverviewTab({
  blueprint,
  stats,
  procedureText,
  onViewActivity,
}: ProfilePlaybookOverviewTabProps) {
  return (
    <div className="space-y-8">
      {procedureText ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {stripLeadingH1(procedureText)}
        </ReactMarkdown>
      ) : (
        <p className="text-sm text-foreground/80 leading-relaxed">{blueprint.description}</p>
      )}

      {stats.pending > 0 && (
        <div className="rounded-2xl border border-flame/20 bg-flame/5 px-4 py-3">
          <p className="text-sm font-medium text-flame">
            {stats.pending} field{stats.pending === 1 ? "" : "s"} waiting for your review
          </p>
          <button
            type="button"
            onClick={onViewActivity}
            className="mt-1 text-xs font-semibold hover:underline"
          >
            View in Activity
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground inline-flex items-start gap-1.5">
        <Sparkles className="size-3 mt-0.5 shrink-0 text-sky" />
        Locked vocabulary: relationship categories and signal types cannot be changed.
      </p>
    </div>
  );
}
