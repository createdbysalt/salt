"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/app/_components/ui/input";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { SegmentedTabs } from "@/app/_features/shared/components/SegmentedTabs";
import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";
import { SPACES } from "../data";
import { SpaceCard } from "./SpaceCard";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

type Tab = "attention" | "all" | "pinned";

const TABS = [
  { id: "attention" as const, label: "Worth Attention" },
  { id: "all" as const, label: "All" },
  { id: "pinned" as const, label: "Pinned" },
];

export function SpacesPage() {
  const mockContent = useMockContent();
  const [tab, setTab] = useState<Tab>("attention");
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    let items = mockContent ? SPACES : [];
    if (tab === "attention") items = items.filter((r) => r.status !== "closed");
    if (tab === "pinned") items = items.filter((r) => r.pinned);
    if (query.trim()) {
      const q = query.toLowerCase();
      items = items.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.linked.label.toLowerCase().includes(q) ||
          r.worthAttention.toLowerCase().includes(q)
      );
    }
    return items;
  }, [mockContent, tab, query]);

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className="mx-auto w-full max-w-[1400px] space-y-8">
        <SegmentedTabs
          active={tab}
          onChange={setTab}
          tabs={TABS}
          layoutId="spaces-tab-pill"
          ariaLabel="Spaces sections"
        />

        <PlaysSectionHeader
          eyebrow={
            tab === "attention"
              ? "Needs your eye"
              : tab === "pinned"
                ? "Kept close"
                : "All shared rooms"
          }
          title="Spaces"
          description="Shared rooms where Salt keeps decisions, files, and next moves in one place. Open one to see what changed, what's blocked, and what's ready to send."
          action={
            <button
              type="button"
              onClick={() => toast("Ask Salt to create a Space (coming soon)")}
              className="surface-aurora group inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl pl-3.5 pr-5 text-sm font-semibold text-white hover-lift"
            >
              <Plus className="size-4" strokeWidth={2.25} />
              New Space
            </button>
          }
        />

        {tab !== "attention" && (
          <div className="relative max-w-md">
            <Search
              className="absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={2}
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Spaces, clients, projects…"
              className="h-10 rounded-xl border-border/60 bg-card/60 pl-9 pr-3 text-sm shadow-none focus-visible:border-foreground/30 focus-visible:ring-0"
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: APPLE_EASE }}
            className="grid gap-4 lg:grid-cols-2 lg:gap-5"
          >
            {list.map((r, i) => (
              <SpaceCard key={r.id} r={r} index={i} />
            ))}
          </motion.div>
        </AnimatePresence>

        {list.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border/60 p-12 text-center">
            <p className="text-sm text-muted-foreground">
              Nothing here yet.{" "}
              <button
                type="button"
                onClick={() => toast("Ask Salt to create a Space (coming soon)")}
                className="font-semibold text-foreground underline-offset-2 hover:underline"
              >
                Ask Salt to create a Space
              </button>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
