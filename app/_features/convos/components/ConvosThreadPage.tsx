"use client";

import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";
import { ConvoConversation } from "./ConvoConversation";
import { ConvosShell } from "./ConvosShell";
import { ConvosThreadList } from "./ConvosThreadList";
import { findThread } from "../data";

export function ConvosThreadPage({ personId }: { personId: string }) {
  const thread = findThread(personId);

  if (!thread) {
    return (
      <ConvosShell>
        <div className="relative flex h-full min-h-0 overflow-hidden bg-card">
          <div className="hidden h-full lg:flex">
            <ConvosThreadList />
          </div>
          <div className="flex flex-1 items-center justify-center p-8">
            <MockContentEmptyState
              title="Conversation not found"
              description="Messages for this contact will appear here once you connect email or start a thread."
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
          <ConvosThreadList />
        </div>
        <ConvoConversation thread={thread} key={thread.personId} />
      </div>
    </ConvosShell>
  );
}
