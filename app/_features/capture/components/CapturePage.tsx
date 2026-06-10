"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { AskSaltContext } from "@/app/_features/shell/components/AskSaltPanel";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import {
  ORIGIN_META,
  type PendingCapture,
} from "@/app/_lib/demo/capture-demo-data";
import { CaptureQueueTab } from "./CaptureQueueTab";
import { CaptureStreamTab } from "./CaptureStreamTab";
import { CaptureTabs, type CaptureTab } from "./CaptureTabs";

function openAskSalt(options?: {
  prompt?: string;
  context?: AskSaltContext | null;
}) {
  window.dispatchEvent(
    new CustomEvent("salt:open-ask-salt", {
      detail: {
        prompt: options?.prompt ?? "",
        mode: "ask" as const,
        context: options?.context ?? null,
        autoSubmit: false,
      },
    })
  );
}

function openCapture() {
  window.dispatchEvent(
    new CustomEvent("salt:open-capture", {
      detail: { intent: "auto" },
    })
  );
}

export function CapturePage() {
  const [tab, setTab] = useState<CaptureTab>("queue");

  useEffect(() => {
    if (tab === "queue") {
      document.body.classList.add("queue-active");
    } else {
      document.body.classList.remove("queue-active");
    }
    return () => document.body.classList.remove("queue-active");
  }, [tab]);

  function handleAddContext(c: PendingCapture) {
    openAskSalt({
      prompt: `Add context for this capture — `,
      context: {
        type: "play",
        id: c.id,
        title: c.headline,
        recipientLabel: c.proposedRoute.label,
        sourceLabel: ORIGIN_META[c.origin].label,
        href: "/capture",
      },
    });
    setTab("queue");
  }

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      {tab === "queue" && (
        <div
          aria-hidden="true"
          className="queue-aurora-shell queue-aurora-grain pointer-events-none absolute inset-0 z-0 overflow-hidden"
        >
          <div className="queue-aurora-bg absolute inset-0" />
          <div className="queue-aurora-conic" />
          <div className="queue-aurora-sheen" />
        </div>
      )}

      <div className="relative z-10 mx-auto w-full max-w-[1400px] space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CaptureTabs active={tab} onChange={setTab} />
          <button
            type="button"
            onClick={openCapture}
            className="group inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-card pl-3 pr-4 text-[13px] font-semibold text-foreground shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)] transition hover:bg-card/90 hover-lift"
          >
            <Sparkles className="size-4 text-flame" strokeWidth={2.25} />
            Add capture
          </button>
        </div>

        <AnimatePresence mode="wait">
          {tab === "queue" && (
            <motion.div
              key="queue"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <PlaysSectionHeader
                eyebrow="Needs your eye"
                title="Capture Queue"
                tone="light"
              />
              <CaptureQueueTab onAddContext={handleAddContext} />
            </motion.div>
          )}

          {tab === "stream" && (
            <motion.div
              key="stream"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <PlaysSectionHeader
                eyebrow="All captured context"
                title="Stream"
                description="Everything Salt routed, confirmed, or learned from. A complete record of context entering your system."
              />
              <CaptureStreamTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
