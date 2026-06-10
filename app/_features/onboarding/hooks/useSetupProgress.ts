"use client";

import { useState, useEffect } from "react";

export type SetupStep = {
  id: string;
  label: string;
  completed: boolean;
  action?: () => void;
  actionLabel?: string;
};

export type SetupProgressData = {
  step1_account: boolean; // Auto-checked on signup
  step2_studio: boolean; // Set up workspace profile
  step3_audit: boolean; // Run first AI audit
  step4_projects: boolean; // Import existing projects
  step5_client: boolean; // Add first client
  step6_integrations: boolean; // Connect integrations
  dismissed: boolean;
  minimized: boolean; // New: minimized state
};

const STORAGE_KEY = "salt-setup-progress";
const STORAGE_EVENT = "salt-setup-progress-change";

const defaultProgress: SetupProgressData = {
  step1_account: true, // Always true after signup
  step2_studio: false,
  step3_audit: false,
  step4_projects: false,
  step5_client: false,
  step6_integrations: false,
  dismissed: false,
  minimized: false,
};

// Helper to broadcast changes to all hook instances
function broadcastChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT));
  }
}

export function useSetupProgress() {
  const [progress, setProgress] = useState<SetupProgressData>(defaultProgress);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as SetupProgressData;
          setProgress(parsed);
        } catch (e) {
          console.error("Failed to parse setup progress:", e);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  // Listen for changes from other hook instances
  useEffect(() => {
    const handleStorageChange = () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as SetupProgressData;
            setProgress(parsed);
          } catch (e) {
            console.error("Failed to parse setup progress:", e);
          }
        }
      }
    };

    window.addEventListener(STORAGE_EVENT, handleStorageChange);
    return () => {
      window.removeEventListener(STORAGE_EVENT, handleStorageChange);
    };
  }, []);

  // Save to localStorage whenever progress changes
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }
  }, [progress, isLoaded]);

  const updateStep = (stepKey: keyof Omit<SetupProgressData, "dismissed">, completed: boolean) => {
    setProgress((prev) => {
      const newProgress = { ...prev, [stepKey]: completed };
      
      // Check if all steps are complete (excluding dismissed)
      const allComplete =
        newProgress.step1_account &&
        newProgress.step2_studio &&
        newProgress.step3_audit &&
        newProgress.step4_projects &&
        newProgress.step5_client &&
        newProgress.step6_integrations;

      // Show celebration if we just completed everything
      if (allComplete && !prev.dismissed && !isAllComplete(prev)) {
        setShowCelebration(true);
      }

      return newProgress;
    });
  };

  const dismiss = () => {
    setProgress((prev) => ({ ...prev, dismissed: true }));
    broadcastChange(); // Notify other components
  };

  const minimize = () => {
    setProgress((prev) => {
      const newProgress = { ...prev, minimized: true };
      // Save to localStorage immediately BEFORE broadcasting
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
      }
      return newProgress;
    });
    broadcastChange(); // Notify other components AFTER saving
  };

  const expand = () => {
    setProgress((prev) => ({ ...prev, minimized: false }));
    broadcastChange(); // Notify other components
  };

  const resume = () => {
    setProgress((prev) => ({ ...prev, dismissed: false }));
    broadcastChange(); // Notify other components
  };

  const reset = () => {
    setProgress(defaultProgress);
    broadcastChange(); // Notify other components
  };

  const getCompletedCount = () => {
    return Object.entries(progress).filter(
      ([key, value]) => key !== "dismissed" && key !== "minimized" && value === true
    ).length;
  };

  const getTotalSteps = () => {
    return Object.keys(progress).filter((key) => key !== "dismissed" && key !== "minimized").length;
  };

  const getProgressPercentage = () => {
    return Math.round((getCompletedCount() / getTotalSteps()) * 100);
  };

  const isAllComplete = (p: SetupProgressData = progress) => {
    return (
      p.step1_account &&
      p.step2_studio &&
      p.step3_audit &&
      p.step4_projects &&
      p.step5_client &&
      p.step6_integrations
    );
  };

  const getNextIncompleteStep = (): string | null => {
    const steps = [
      "step1_account",
      "step2_studio",
      "step3_audit",
      "step4_projects",
      "step5_client",
      "step6_integrations",
    ] as const;

    for (const step of steps) {
      if (!progress[step]) {
        return step;
      }
    }
    return null;
  };

  return {
    progress,
    updateStep,
    dismiss,
    minimize,
    expand,
    resume,
    reset,
    getCompletedCount,
    getTotalSteps,
    getProgressPercentage,
    isAllComplete: isAllComplete(),
    getNextIncompleteStep,
    showCelebration,
    setShowCelebration,
    isLoaded,
  };
}

function isAllComplete(progress: SetupProgressData): boolean {
  return (
    progress.step1_account &&
    progress.step2_studio &&
    progress.step3_audit &&
    progress.step4_projects &&
    progress.step5_client &&
    progress.step6_integrations
  );
}

