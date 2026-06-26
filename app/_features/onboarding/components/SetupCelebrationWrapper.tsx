"use client";

import { useSetupProgress } from "../hooks/useSetupProgress";
import { SetupCelebrationModal } from "./SetupCelebrationModal";

export function SetupCelebrationWrapper() {
  const { showCelebration, setShowCelebration } = useSetupProgress();

  return (
    <SetupCelebrationModal
      open={showCelebration}
      onOpenChange={setShowCelebration}
    />
  );
}

