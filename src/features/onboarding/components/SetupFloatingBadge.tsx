"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  X,
  ArrowRight,
  User,
  Building2,
  Sparkles,
  Upload,
  Users,
  Plug,
} from "lucide-react";
import { useSetupProgress } from "../hooks/useSetupProgress";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SetupStep = {
  id: keyof Omit<
    ReturnType<typeof useSetupProgress>["progress"],
    "dismissed" | "minimized"
  >;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  actionLabel: string;
};

export function SetupFloatingBadge() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const {
    progress,
    dismiss,
    getCompletedCount,
    getTotalSteps,
    getProgressPercentage,
    isLoaded,
  } = useSetupProgress();

  // Don't render until loaded
  if (!isLoaded) {
    return null;
  }

  // Check if complete
  const isComplete =
    progress.step1_account &&
    progress.step2_studio &&
    progress.step3_audit &&
    progress.step4_projects &&
    progress.step5_client &&
    progress.step6_integrations;

  // Don't show if dismissed or complete
  if (progress.dismissed || isComplete) {
    return null;
  }

  const completedCount = getCompletedCount();
  const totalSteps = getTotalSteps();
  const progressPercentage = getProgressPercentage();

  const steps: SetupStep[] = [
    {
      id: "step1_account",
      label: "Create account",
      icon: User,
      action: () => {},
      actionLabel: "View",
    },
    {
      id: "step2_studio",
      label: "Set up studio",
      icon: Building2,
      action: () => {
        router.push("/dashboard/studio");
        setIsOpen(false);
      },
      actionLabel: "Set up",
    },
    {
      id: "step3_audit",
      label: "Run first audit",
      icon: Sparkles,
      action: () => {
        router.push("/dashboard/projects/new");
        setIsOpen(false);
      },
      actionLabel: "Run",
    },
    {
      id: "step4_projects",
      label: "Import projects",
      icon: Upload,
      action: () => {
        router.push("/dashboard/projects");
        setIsOpen(false);
      },
      actionLabel: "Import",
    },
    {
      id: "step5_client",
      label: "Add first client",
      icon: Users,
      action: () => {
        router.push("/dashboard/clients/new");
        setIsOpen(false);
      },
      actionLabel: "Add",
    },
    {
      id: "step6_integrations",
      label: "Connect apps",
      icon: Plug,
      action: () => {
        router.push("/dashboard/settings");
        setIsOpen(false);
      },
      actionLabel: "Connect",
    },
  ];

  const handleContinue = () => {
    const incompleteStep = steps.find((step) => !progress[step.id]);
    if (incompleteStep) {
      incompleteStep.action();
    }
  };

  return (
    <>
      {/* Floating Badge */}
      <button
        onClick={() => setIsOpen(true)}
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
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>

      {/* Setup Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <SheetTitle>Getting Started</SheetTitle>
                  <p className="text-sm text-muted-foreground">
                    {completedCount} of {totalSteps} complete
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismiss}
                className="shrink-0"
              >
                Dismiss
              </Button>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="font-semibold">
                  {progressPercentage}%
                </Badge>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Steps List */}
            <div className="space-y-3">
              {steps.map((step) => {
                const Icon = step.icon;
                const isComplete = progress[step.id];

                return (
                  <button
                    key={step.id}
                    onClick={!isComplete ? step.action : undefined}
                    className="w-full flex items-center gap-3 text-left hover:bg-muted/50 rounded-lg px-3 py-3 transition-colors group"
                    disabled={isComplete}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isComplete ? "text-muted-foreground" : "text-primary"
                      }`}
                    />
                    <span
                      className={`text-sm flex-1 min-w-0 ${
                        isComplete
                          ? "text-muted-foreground line-through"
                          : "font-medium group-hover:text-primary"
                      }`}
                    >
                      {step.label}
                    </span>
                    {!isComplete && (
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Continue Button */}
            <Button onClick={handleContinue} className="w-full" size="lg">
              Continue Setup
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

