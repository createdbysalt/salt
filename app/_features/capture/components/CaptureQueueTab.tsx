"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { QueueProgress } from "@/app/_features/plays/components/QueueProgress";
import { PENDING_CAPTURES, type PendingCapture } from "@/app/_lib/demo/capture-demo-data";
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
};

export function CaptureQueueTab({ onAddContext, askOpen = false }: Props = {}) {
  const mockContent = useMockContent();
  const [source, setSource] = useState<StreamSourceFilter>("all");
  const [reviewed, setReviewed] = useState(0);
  const [display, setDisplay] = useState<CaptureDisplayOptions>(DEFAULT_CAPTURE_DISPLAY);

  const pendingCaptures = mockContent ? PENDING_CAPTURES : [];

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
