"use client";

import * as React from "react";
import { Streamdown } from "streamdown";
import { cn } from "@repo/utils";

/**
 * Message layout primitives for Ask Salt, adapted from vercel/chatbot
 * ai-elements/message.tsx. Branching, votes, and toolbars are out of scope —
 * Salt only needs content containers plus streaming markdown.
 */

export type MessageContentProps = React.HTMLAttributes<HTMLDivElement>;

export function MessageContent({
  children,
  className,
  ...props
}: MessageContentProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full flex-col gap-2 overflow-hidden text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type MessageResponseProps = React.ComponentProps<typeof Streamdown>;

/** Streaming-safe markdown. Memoized on children so deltas re-render cheaply. */
export const MessageResponse = React.memo(
  ({ className, linkSafety, ...props }: MessageResponseProps) => (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
      // Disable link safety modal by default — it renders block elements (div)
      // inside markdown paragraphs, causing React hydration errors.
      linkSafety={linkSafety ?? { enabled: false }}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

MessageResponse.displayName = "MessageResponse";
