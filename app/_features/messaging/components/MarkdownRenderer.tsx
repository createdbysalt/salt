"use client";

import ReactMarkdown from "react-markdown";
import { cn } from "@repo/utils";

interface MarkdownRendererProps {
  content: string | null | undefined;
  className?: string;
}

/**
 * MarkdownRenderer - Safely renders markdown content
 *
 * Supports:
 * - **bold**, *italic*, `code`, ```code blocks```
 * - Lists (- item or * item)
 * - Links [text](url) - opens in new tab
 *
 * Security:
 * - Only allows safe elements (whitelist approach)
 * - Links have rel="noopener noreferrer"
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Handle empty/null content gracefully
  if (!content) {
    return null;
  }

  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        allowedElements={[
          "p",
          "strong",
          "em",
          "code",
          "pre",
          "ul",
          "ol",
          "li",
          "a",
          "br",
          "blockquote",
        ]}
        components={{
          // Links open in new tab with security attributes
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          ),
          // Code blocks with distinct styling
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName?.includes("language-");
            if (isInline) {
              return (
                <code
                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={cn("font-mono text-sm", codeClassName)} {...props}>
                {children}
              </code>
            );
          },
          // Code blocks wrapper
          pre: ({ children }) => (
            <pre className="rounded-md bg-muted p-3 overflow-x-auto font-mono text-sm">
              {children}
            </pre>
          ),
          // Lists with proper styling
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-foreground">{children}</li>
          ),
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-muted-foreground/20 pl-3 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          // Paragraphs
          p: ({ children }) => (
            <p className="mb-2 last:mb-0">{children}</p>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
