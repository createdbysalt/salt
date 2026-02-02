"use client";

import { Card, CardContent, CardHeader } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Progress } from "@/app/_components/ui/progress";
import { Badge } from "@/app/_components/ui/badge";
import {
  CheckCircle2,
  Circle,
  X,
  Minus,
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

type SetupStep = {
  id: keyof Omit<
    ReturnType<typeof useSetupProgress>["progress"],
    "dismissed"
  >;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  actionLabel: string;
};

export function SetupProgressCard() {
  const router = useRouter();
  const {
    progress,
    updateStep,
    dismiss,
    minimize,
    getCompletedCount,
    getTotalSteps,
    getProgressPercentage,
    isAllComplete,
    getNextIncompleteStep,
    isLoaded,
  } = useSetupProgress();

  // Don't render until loaded from localStorage
  if (!isLoaded) {
    return null;
  }

  // Don't show if dismissed or all complete
  if (progress.dismissed || isAllComplete) {
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
      action: () => router.push("/studio"),
      actionLabel: "Set up",
    },
    {
      id: "step3_audit",
      label: "Run first audit",
      icon: Sparkles,
      action: () => router.push("/studio/projects/new"),
      actionLabel: "Run",
    },
    {
      id: "step4_projects",
      label: "Import projects",
      icon: Upload,
      action: () => router.push("/studio/projects"),
      actionLabel: "Import",
    },
    {
      id: "step5_client",
      label: "Add first client",
      icon: Users,
      action: () => router.push("/studio/clients/new"),
      actionLabel: "Add",
    },
    {
      id: "step6_integrations",
      label: "Connect apps",
      icon: Plug,
      action: () => router.push("/studio/settings"),
      actionLabel: "Connect",
    },
  ];

  const handleContinue = () => {
    const nextStep = getNextIncompleteStep();
    if (nextStep) {
      const step = steps.find((s) => s.id === nextStep);
      if (step) {
        step.action();
      }
    }
  };

  const handleMinimize = () => {
    console.log("Minimize clicked");
    minimize();
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-base">Getting Started</h3>
              <p className="text-xs text-muted-foreground">
                {completedCount} of {totalSteps} complete
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMinimize}
              className="h-8 w-8"
              title="Minimize"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={dismiss}
              className="h-8 w-8"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="font-semibold text-xs">
              {progressPercentage}%
            </Badge>
          </div>
          <Progress value={progressPercentage} className="h-1.5" />
        </div>

        {/* Steps List - Compact */}
        <div className="space-y-2">
          {steps.map((step) => {
            const Icon = step.icon;
            const isComplete = progress[step.id];

            return (
              <button
                key={step.id}
                onClick={!isComplete ? step.action : undefined}
                className="w-full flex items-center gap-2 text-left hover:bg-muted/50 rounded-md px-2 py-1.5 transition-colors group"
                disabled={isComplete}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <Icon className={`h-3.5 w-3.5 shrink-0 ${isComplete ? "text-muted-foreground" : "text-primary"}`} />
                <span
                  className={`text-sm flex-1 min-w-0 ${
                    isComplete
                      ? "text-muted-foreground line-through"
                      : "font-medium group-hover:text-primary"
                  }`}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Continue Button */}
        <Button onClick={handleContinue} className="w-full" size="sm">
          Continue
          <ArrowRight className="h-3.5 w-3.5 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}

