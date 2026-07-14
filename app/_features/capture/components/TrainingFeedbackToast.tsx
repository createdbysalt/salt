"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ThumbsUp, ThumbsDown, Undo2 } from "lucide-react";
import { cn } from "@repo/utils";
import { Button } from "@repo/ui";
import type { FeedbackType } from "../services/training-feedback";

interface TrainingFeedbackToastProps {
  feedbackType: FeedbackType | null;
  onUndo?: () => void;
  onDismiss?: () => void;
  autoDismissMs?: number;
}

const FEEDBACK_MESSAGES: Record<FeedbackType, string> = {
  more_like_this: "Got it, Salt will surface more like this",
  less_like_this: "Got it, Salt will show fewer like this",
  mark_important: "Marked as important",
  mark_not_important: "Unmarked as important",
  correct_category: "Category updated",
  correct_priority: "Priority updated",
};

const FEEDBACK_ICONS: Record<FeedbackType, typeof Check> = {
  more_like_this: ThumbsUp,
  less_like_this: ThumbsDown,
  mark_important: Check,
  mark_not_important: Check,
  correct_category: Check,
  correct_priority: Check,
};

export function TrainingFeedbackToast({
  feedbackType,
  onUndo,
  onDismiss,
  autoDismissMs = 4000,
}: TrainingFeedbackToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (feedbackType) {
      setIsVisible(true);

      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, autoDismissMs);

      return () => clearTimeout(timer);
    }
  }, [feedbackType, autoDismissMs, onDismiss]);

  if (!feedbackType) return null;

  const message = FEEDBACK_MESSAGES[feedbackType];
  const Icon = FEEDBACK_ICONS[feedbackType];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
          className={cn(
            "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
            "flex items-center gap-3 px-4 py-3",
            "bg-card border border-border rounded-full shadow-lift",
            "text-sm font-medium"
          )}
        >
          <div className="flex items-center gap-2 text-foreground">
            <Icon className="h-4 w-4 text-emerald-500" />
            <span>{message}</span>
          </div>

          {onUndo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsVisible(false);
                onUndo();
              }}
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              <Undo2 className="h-3.5 w-3.5 mr-1" />
              Undo
            </Button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface FeedbackButtonsProps {
  onMoreLikeThis: () => void;
  onLessLikeThis: () => void;
  disabled?: boolean;
  className?: string;
}

export function FeedbackButtons({
  onMoreLikeThis,
  onLessLikeThis,
  disabled = false,
  className,
}: FeedbackButtonsProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={onMoreLikeThis}
        disabled={disabled}
        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ThumbsUp className="h-3 w-3 mr-1" />
        More
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onLessLikeThis}
        disabled={disabled}
        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ThumbsDown className="h-3 w-3 mr-1" />
        Less
      </Button>
    </div>
  );
}
