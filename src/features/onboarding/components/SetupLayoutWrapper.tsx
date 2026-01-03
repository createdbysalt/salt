"use client";

import { SetupProgressCard } from "./SetupProgressCard";
import { SetupMinimizedBadge } from "./SetupMinimizedBadge";
import { useSetupProgress } from "../hooks/useSetupProgress";

type SetupLayoutWrapperProps = {
  statsCards: React.ReactNode;
};

export function SetupLayoutWrapper({ statsCards }: SetupLayoutWrapperProps) {
  const { isAllComplete, progress, isLoaded } = useSetupProgress();

  console.log("SetupLayoutWrapper render:", {
    isLoaded,
    isAllComplete,
    dismissed: progress.dismissed,
    minimized: progress.minimized,
  });

  // Don't render until loaded
  if (!isLoaded) {
    return <div className="grid gap-4 md:grid-cols-4">{statsCards}</div>;
  }

  const showSetupCard = !progress.dismissed && !isAllComplete && !progress.minimized;

  console.log("showSetupCard:", showSetupCard);

  if (showSetupCard) {
    // 2-column layout: Setup card on left, 2x2 stats grid on right
    return (
      <>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Setup Card - Left Column */}
          <SetupProgressCard />
          
          {/* Stats Cards - Right Column in 2x2 Grid */}
          <div className="grid gap-4 grid-cols-2">
            {statsCards}
          </div>
        </div>
        {/* Minimized badge (hidden when card is visible) */}
        <SetupMinimizedBadge />
      </>
    );
  }

  // Single row when setup is complete, dismissed, or minimized
  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        {statsCards}
      </div>
      {/* Show floating badge when minimized */}
      <SetupMinimizedBadge />
    </>
  );
}

