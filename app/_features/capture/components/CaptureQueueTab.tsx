"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { QueueProgress } from "@/app/_features/plays/components/QueueProgress";
import { PENDING_CAPTURES, type PendingCapture } from "@/app/_lib/demo/capture-demo-data";
import type { PendingCaptureSummary } from "../types";
import { getSourceMeta } from "../source-taxonomy";
import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";
import { CaptureQueueStack } from "./CaptureQueueStack";
import { CaptureQueueFilterPopover, type StreamSourceFilter } from "./CaptureFilterPopover";
import {
  CaptureDisplayPopover,
  DEFAULT_CAPTURE_DISPLAY,
  type CaptureDisplayOptions,
} from "./CaptureDisplayPopover";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

type Props = {
  onAddContext?: (c: PendingCapture) => void;
  askOpen?: boolean;
  realPendingCaptures?: PendingCaptureSummary[];
  hasRealData?: boolean;
};

export function CaptureQueueTab({
  onAddContext,
  askOpen = false,
  realPendingCaptures = [],
  hasRealData = false,
}: Props = {}) {
  const mockContent = useMockContent();
  const [source, setSource] = useState<StreamSourceFilter>("all");
  const [reviewed, setReviewed] = useState(0);
  const [display, setDisplay] = useState<CaptureDisplayOptions>(DEFAULT_CAPTURE_DISPLAY);

  // Convert real captures to PendingCapture format for display
  const realPendingEntries: PendingCapture[] = useMemo(() => {
    if (!hasRealData || realPendingCaptures.length === 0) return [];

    return realPendingCaptures.map((c) => {
      const sourceMeta = getSourceMeta(c.source_type);
      const createdAt = new Date(c.created_at);

      return {
        id: c.capture_id,
        source: c.origin,
        origin: c.source_type as PendingCapture["origin"],
        time: createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        headline: c.title || "Untitled capture",
        quote: c.title || "Captured context awaiting review",
        confidence: c.overall_confidence ?? 50,
        reasoning: `Salt captured this from ${sourceMeta.label} and needs your input on where to route it.`,
        proposedRoute: {
          kind: "memory" as const,
          label: "Save to Memory",
          hint: `${c.routing_count} routing suggestion${c.routing_count !== 1 ? "s" : ""}`,
        },
        tags: [sourceMeta.label, c.capture_type],
      };
    });
  }, [realPendingCaptures, hasRealData]);

  // Use real data if available, fall back to demo data if mock content is enabled
  const pendingCaptures = hasRealData && realPendingEntries.length > 0
    ? realPendingEntries
    : mockContent
      ? PENDING_CAPTURES
      : [];

  const captures = useMemo(
    () => (source === "all" ? pendingCaptures : pendingCaptures.filter((c) => c.source === source)),
    [source, pendingCaptures],
  );

  const handleProgress = useCallback((r: number) => setReviewed(r), []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: APPLE_EASE }}
      className="space-y-3"
    >
      <div className="flex w-full items-center justify-between gap-3">
        <QueueProgress total={captures.length} reviewed={reviewed} streak={0} />
        <div className="flex items-center gap-1">
          <CaptureDisplayPopover value={display} onChange={setDisplay} />
          <CaptureQueueFilterPopover source={source} onSource={setSource} />
        </div>
      </div>

      <CaptureQueueStack
        captures={captures}
        onProgress={handleProgress}
        onAddContext={onAddContext}
        askOpen={askOpen}
        showUpNext={display.showUpNext}
      />
    </motion.div>
  );
}
