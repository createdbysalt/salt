"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@repo/utils";

interface ConnectorConnectHelpProps {
  content: string;
  className?: string;
  /** Tighter step list for the detail sidebar. */
  variant?: "default" | "steps";
}

/** Wrap bare host/path URLs so markdown renders them as links. */
function linkifyBareUrls(content: string): string {
  return content.replace(
    /(^|[\s(])((?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s),.]*)?)/gi,
    (full, prefix: string, url: string) => {
      if (full.includes("](")) {
        return full;
      }
      const href = url.startsWith("http") ? url : `https://${url}`;
      return `${prefix}[${url}](${href})`;
    },
  );
}

/** Convert legacy `**1.**` / `•` connectHelp into real markdown lists. */
function normalizeLegacySteps(content: string): string {
  const lines = content.split("\n");
  const out: string[] = [];

  for (const line of lines) {
    const step = line.match(/^\*\*(\d+)\.\*\*\s*(.*)$/);
    if (step) {
      out.push(`${step[1]}. ${step[2]}`);
      continue;
    }
    const bullet = line.match(/^\s*•\s*(.+)$/);
    if (bullet) {
      out.push(`   - ${bullet[1].replace(/ → /g, " — ")}`);
      continue;
    }
    out.push(line);
  }

  return out
    .join("\n")
    .replace(/paste it below/gi, "paste it in the field above");
}

/** Renders catalog `connectHelp` markdown (steps, links, permissions). */
export function ConnectorConnectHelp({
  content,
  className,
  variant = "default",
}: ConnectorConnectHelpProps) {
  const normalizedContent = linkifyBareUrls(normalizeLegacySteps(content));
  const isSteps = variant === "steps";

  return (
    <div
      className={cn(
        "leading-relaxed text-muted-foreground",
        isSteps ? "text-xs" : "text-sm",
        "[&_a]:cursor-pointer [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-primary/80",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        isSteps
          ? [
              "[&_ol]:list-decimal [&_ol]:space-y-3 [&_ol]:pl-4",
              "[&_ol>li]:pl-1 [&_ol>li]:marker:font-medium [&_ol>li]:marker:text-foreground",
              "[&_ol>li>ul]:mt-2 [&_ol>li>ul]:list-disc [&_ol>li>ul]:space-y-1 [&_ol>li>ul]:pl-4",
              "[&_ol>li>ul>li]:text-muted-foreground",
            ]
          : [
              "[&_ul]:mt-2 [&_ul]:list-inside [&_ul]:space-y-1",
              "[&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-4",
              "[&_p]:mt-2 first:[&_p]:mt-0",
            ],
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          ol: ({ children }) => (
            <ol className={isSteps ? "list-decimal space-y-3 pl-4" : undefined}>
              {children}
            </ol>
          ),
          ul: ({ children }) => (
            <ul
              className={
                isSteps
                  ? "mt-2 list-disc space-y-1 pl-4 text-muted-foreground"
                  : undefined
              }
            >
              {children}
            </ul>
          ),
          li: ({ children }) => (
            <li className={isSteps ? "pl-1 leading-snug" : undefined}>
              {children}
            </li>
          ),
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
