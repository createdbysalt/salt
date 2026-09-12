"use client";

import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";
import { ConvoConversation } from "./ConvoConversation";
import { ConvosShell } from "./ConvosShell";
import { ConvosThreadList } from "./ConvosThreadList";
import type { ConvoThread } from "../data";

export function ConvosThreadPage({
  threads,
  thread,
}: {
  threads: ConvoThread[];
  thread: ConvoThread | null;
}) {
  if (!thread) {
    return (
      <ConvosShell>
        <div className="relative flex h-full min-h-0 overflow-hidden bg-card">
          <div className="hidden h-full lg:flex">
            <ConvosThreadList threads={threads} />
          </div>
          <div className="flex flex-1 items-center justify-center p-8">
            <MockContentEmptyState
              title="Conversation not found"
              description="This thread may have been captured under a different workspace, or not ingested yet."
            />
          </div>
        </div>
      </ConvosShell>
    );
  }

  return (
    <ConvosShell>
      <div className="relative flex h-full min-h-0 overflow-hidden bg-card">
        <div className="hidden h-full lg:flex">
          <ConvosThreadList threads={threads} />
        </div>
        <ConvoConversation thread={thread} key={thread.threadId} />
      </div>
    </ConvosShell>
  );
}
