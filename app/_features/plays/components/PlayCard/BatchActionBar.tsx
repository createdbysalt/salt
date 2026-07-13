"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { cn } from "@repo/utils";

interface BatchActionBarProps {
  selectedCount: number;
  onApproveAll: () => void;
  onDismissAll: () => void;
  onClearSelection: () => void;
  isPending: boolean;
  pendingAction?: "approve" | "dismiss" | null;
}

export function BatchActionBar({
  selectedCount,
  onApproveAll,
  onDismissAll,
  onClearSelection,
  isPending,
  pendingAction,
}: BatchActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-xl backdrop-blur-md">
            <span className="text-[13px] font-medium text-muted-foreground">
              {selectedCount} selected
            </span>

            <div className="h-5 w-px bg-border" />

            <button
              type="button"
              onClick={onDismissAll}
              disabled={isPending}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium transition",
                "text-muted-foreground hover:bg-muted hover:text-foreground",
                "disabled:opacity-60",
              )}
            >
              {isPending && pendingAction === "dismiss" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <X className="size-4" strokeWidth={2} />
              )}
              Dismiss all
            </button>

            <button
              type="button"
              onClick={onApproveAll}
              disabled={isPending}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-[13px] font-semibold transition",
                "bg-foreground text-background hover:opacity-90",
                "disabled:opacity-60",
              )}
            >
              {isPending && pendingAction === "approve" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" strokeWidth={2} />
              )}
              Approve {selectedCount}
            </button>

            <button
              type="button"
              onClick={onClearSelection}
              disabled={isPending}
              aria-label="Clear selection"
              className="ml-1 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-60"
            >
              <X className="size-4" strokeWidth={2} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
