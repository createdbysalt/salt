"use client";

import type { ConvoThread } from "../data";
import { ConvoConversation } from "./ConvoConversation";
import { ConvosShell } from "./ConvosShell";
import { ConvosThreadList } from "./ConvosThreadList";

export function ConvosThreadPage({ thread }: { thread: ConvoThread }) {
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
