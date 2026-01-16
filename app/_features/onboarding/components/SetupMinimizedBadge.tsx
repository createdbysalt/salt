"use client";

import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { Sparkles, ChevronUp } from "lucide-react";
import { useSetupProgress } from "../hooks/useSetupProgress";

export function SetupMinimizedBadge() {
  const {
    progress,
    expand,
    getCompletedCount,
    getTotalSteps,
    getProgressPercentage,
    isLoaded,
  } = useSetupProgress();

  // Don't render until loaded
  if (!isLoaded) {
    return null;
  }

  // Only show if minimized and not dismissed or complete
  if (!progress.minimized || progress.dismissed) {
    return null;
  }

  const completedCount = getCompletedCount();
  const totalSteps = getTotalSteps();
  const progressPercentage = getProgressPercentage();

  // Check if complete
  const isComplete =
    progress.step1_account &&
    progress.step2_studio &&
    progress.step3_audit &&
    progress.step4_projects &&
    progress.step5_client &&
    progress.step6_integrations;

  if (isComplete) {
    return null;
  }

  return (
    <button
      onClick={expand}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full bg-gradient-to-br from-primary to-primary/80 px-4 py-3 text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 group"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-medium">
          Setup {completedCount}/{totalSteps}
        </span>
        <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
          {progressPercentage}%
        </Badge>
      </div>
      <ChevronUp className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
    </button>
  );
}




