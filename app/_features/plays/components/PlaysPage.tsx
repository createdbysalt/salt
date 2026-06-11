"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { ActivityEntryRow } from "@/app/_features/plays/types";
import type { QueuePlay } from "@/app/_lib/demo/plays-demo-data";
import type { AskSaltContext } from "@/app/_features/shell/components/AskSaltPanel";
import type { ConnectorsPageData } from "@/app/_features/connectors";
import { CONNECTORS_TAB } from "@/app/_features/connectors/constants";
import { ConnectorsPage } from "@/app/_features/connectors/components/ConnectorsPage";
import { ActivityTab } from "./ActivityTab";
import { PlaysListView } from "./PlaysListView";
import { PlaysSectionHeader } from "./PlaysSectionHeader";
import { PlaysTabs, type PlaysTab } from "./PlaysTabs";
import { PlayersTab } from "./PlayersTab";
import { PlaybookTab } from "./PlaybookTab";

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

function parsePlaysTab(value: string | null): PlaysTab {
  if (
    value === "players" ||
    value === "playbook" ||
    value === "activity" ||
    value === "connectors"
  ) {
    return value;
  }
  return "queue";
}

export function PlaysPage({
  initialQueue,
  initialActivity,
  connectors,
}: {
  initialQueue: QueuePlay[];
  initialActivity: ActivityEntryRow[];
  connectors: ConnectorsPageData;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<PlaysTab>(() => parsePlaysTab(searchParams.get("tab")));

  useEffect(() => {
    setTab(parsePlaysTab(searchParams.get("tab")));
  }, [searchParams]);

  const handleTabChange = useCallback(
    (nextTab: PlaysTab) => {
      setTab(nextTab);
      const params = new URLSearchParams(searchParams.toString());
      if (nextTab === "queue") {
        params.delete("tab");
      } else {
        params.set("tab", nextTab);
      }
      const query = params.toString();
      router.replace(query ? `/plays?${query}` : "/plays", { scroll: false });
    },
    [router, searchParams],
  );

  function handleEditPlay(play: QueuePlay) {
    openAskSalt({
      prompt: `Edit this Play before it sends — `,
      context: {
        type: "play",
        id: play.id,
        title: play.subject,
        recipientLabel: play.recipient,
        sourceLabel: play.source,
        href: "/plays",
      },
    });
    handleTabChange("queue");
  }

  const showCreatePlay = tab !== CONNECTORS_TAB;

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className="mx-auto w-full max-w-[1400px] space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PlaysTabs active={tab} onChange={handleTabChange} />
          {showCreatePlay && (
            <button
              type="button"
              onClick={() => openAskSalt()}
              className="group inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-card pl-3 pr-4 text-[13px] font-semibold text-foreground shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)] transition hover:bg-card/90 hover-lift"
            >
              <Sparkles className="size-4 text-flame" strokeWidth={2.25} />
              Create a Play
            </button>
          )}
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
                eyebrow="Ready to send"
                title="Plays Queue"
                description="Approve, edit, or dismiss what Salt has drafted. Nothing sends without you."
              />
              <PlaysListView onEditPlay={handleEditPlay} initialQueue={initialQueue} />
            </motion.div>
          )}

          {tab === "players" && (
            <motion.div
              key="players"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <PlayersTab />
            </motion.div>
          )}

          {tab === "playbook" && (
            <motion.div
              key="playbook"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <PlaysSectionHeader
                eyebrow="Reusable tactics"
                title="Playbooks"
                description="The library of moves Salt runs on your behalf. Each playbook is owned by a player and tuned to your preferences."
              />
              <PlaybookTab />
            </motion.div>
          )}

          {tab === "activity" && (
            <motion.div
              key="activity"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <PlaysSectionHeader
                eyebrow="Trust ledger"
                title="Activity"
                description="Everything Salt has done, approved, or learned from. A complete record of what shipped and why."
              />
              <ActivityTab initialActivity={initialActivity} />
            </motion.div>
          )}

          {tab === "connectors" && (
            <motion.div
              key="connectors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <ConnectorsPage connectors={connectors} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
