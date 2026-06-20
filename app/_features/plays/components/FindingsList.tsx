"use client";

import { AnimatePresence } from "framer-motion";
import { Inbox } from "lucide-react";
import type { FindingWithContext } from "@/app/_features/capture/types/intelligence-findings";
import { FindingCard } from "./FindingCard";

/**
 * FindingsList — Grid of intelligence findings
 *
 * Displays findings in a responsive grid layout.
 * Shows empty state when no findings match the filter.
 */

interface FindingsListProps {
  findings: FindingWithContext[];
  emptyMessage?: string;
  emptyDescription?: string;
}

export function FindingsList({
  findings,
  emptyMessage = "Queue clear",
  emptyDescription = "Salt's looking for opportunities. Check back soon.",
}: FindingsListProps) {
  if (findings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/50 py-16 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <Inbox className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">{emptyMessage}</p>
        <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence mode="popLayout">
        {findings.map((finding) => (
          <FindingCard key={finding.id} finding={finding} />
        ))}
      </AnimatePresence>
    </div>
  );
}
