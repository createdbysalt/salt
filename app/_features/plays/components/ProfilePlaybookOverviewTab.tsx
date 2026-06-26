"use client";

import { Sparkles } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { PlaybookBlueprintView } from "@/app/_features/plays/types";

type ProfilePlaybookOverviewTabProps = {
  blueprint: PlaybookBlueprintView;
  procedureText: string | null;
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
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-2xl border border-border/60">
      <table className="min-w-full text-left text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/50 text-foreground">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-border/60 px-3 py-2 font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="align-top border-b border-border/40 px-3 py-2 text-muted-foreground last:border-b-0">
      {children}
    </td>
  ),
};

function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^\s*#\s+.+\n+/, "");
}

export function ProfilePlaybookOverviewTab({
  blueprint,
  procedureText,
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

      <p className="text-xs text-muted-foreground inline-flex items-start gap-1.5">
        <Sparkles className="size-3 mt-0.5 shrink-0 text-sky" />
        Locked vocabulary: relationship categories and signal types cannot be changed.
      </p>
    </div>
  );
}
