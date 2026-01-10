"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle, ArrowRight, Sparkles, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  completed: boolean;
}

const STORAGE_KEY = "bridge_onboarding_dismissed";
const STEPS_KEY = "bridge_onboarding_steps";

export function BridgeOnboarding() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: "view_project",
      title: "Explore Your Projects",
      description: "Check out the project we're working on together",
      action: {
        label: "View Projects",
        href: "#projects",
      },
      completed: false,
    },
    {
      id: "submit_request",
      title: "Submit Your First Request",
      description: "Need something? Let us know what you need",
      action: {
        label: "New Request",
        href: "/bridge/requests",
      },
      completed: false,
    },
    {
      id: "browse_files",
      title: "Browse Files",
      description: "Access all your project files and deliverables",
      action: {
        label: "View Files",
        href: "/bridge/files",
      },
      completed: false,
    },
  ]);

  // Load state from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    const savedSteps = localStorage.getItem(STEPS_KEY);
    
    if (dismissed === "true") {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }

    if (savedSteps) {
      try {
        setSteps(JSON.parse(savedSteps));
      } catch (e) {
        console.error("Failed to parse onboarding steps", e);
      }
    }
  }, []);

  // Save steps to localStorage whenever they change
  useEffect(() => {
    if (isVisible) {
      localStorage.setItem(STEPS_KEY, JSON.stringify(steps));
    }
  }, [steps, isVisible]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const handleStepComplete = (stepId: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, completed: true } : step
      )
    );
  };

  const completedCount = steps.filter((s) => s.completed).length;
  const totalSteps = steps.length;
  const progress = (completedCount / totalSteps) * 100;
  const allCompleted = completedCount === totalSteps;

  if (!isVisible) return null;

  return (
    <>
      {/* Floating Badge - Matches Dashboard Style */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full border border-border bg-muted/60 px-4 py-3 text-foreground shadow-lg transition-all hover:shadow-xl hover:bg-muted/70 hover:scale-105 supports-[backdrop-filter]:backdrop-blur-md dark:bg-foreground/10 dark:hover:bg-foreground/15 group"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-foreground" />
            <span className="text-sm font-medium">
              Getting Started {completedCount}/{totalSteps}
            </span>
            <Badge
              variant="secondary"
              className="border border-border/60 bg-background/50 text-foreground/80 text-xs dark:bg-background/20"
            >
              {Math.round(progress)}%
            </Badge>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </button>
      )}

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm">
          <Card className="shadow-2xl border-2">
            <div className="bg-primary text-primary-foreground p-4 rounded-t-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <h3 className="font-bold text-lg">Welcome to The Bridge! 👋</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="text-primary-foreground/80 hover:text-primary-foreground transition-colors p-1 rounded hover:bg-primary-foreground/10"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="text-primary-foreground/80 hover:text-primary-foreground transition-colors p-1 rounded hover:bg-primary-foreground/10"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-primary-foreground/90">
                {allCompleted
                  ? "You're all set! We're here if you need anything."
                  : "Let's get you started with a quick tour"}
              </p>
              <div className="mt-3">
                <Progress value={progress} className="h-2 bg-primary-foreground/20" />
                <p className="text-xs text-primary-foreground/80 mt-1">
                  {completedCount} of {totalSteps} completed
                </p>
              </div>
            </div>
            <CardContent className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {allCompleted ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-primary mx-auto mb-2" />
                  <p className="font-medium text-sm">All done!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You can dismiss this anytime
                  </p>
                </div>
              ) : (
                steps.map((step) => (
                  <div
                    key={step.id}
                    className={`p-3 rounded-lg border transition-all ${
                      step.completed
                        ? "bg-muted/50 border-primary/20"
                        : "bg-background border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {step.completed ? (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm leading-tight mb-1">
                          {step.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {step.description}
                        </p>
                        {!step.completed && step.action && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            asChild
                            onClick={() => handleStepComplete(step.id)}
                          >
                            <Link href={step.action.href}>
                              {step.action.label}
                              <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
