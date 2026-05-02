"use client";

import { Sun, Moon } from "lucide-react";

interface GreetingHeaderProps {
  firstName: string;
}

function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function getGreeting(timeOfDay: "morning" | "afternoon" | "evening"): string {
  switch (timeOfDay) {
    case "morning":
      return "Good morning";
    case "afternoon":
      return "Good afternoon";
    case "evening":
      return "Good evening";
  }
}

function getIcon(timeOfDay: "morning" | "afternoon" | "evening") {
  switch (timeOfDay) {
    case "morning":
      return <Sun className="size-6 text-amber-500" />;
    case "afternoon":
      return <Sun className="size-6 text-orange-500" />;
    case "evening":
      return <Moon className="size-6 text-indigo-400" />;
  }
}

export function GreetingHeader({ firstName }: GreetingHeaderProps) {
  const timeOfDay = getTimeOfDay();
  const greeting = getGreeting(timeOfDay);
  const icon = getIcon(timeOfDay);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {icon}
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}, {firstName}
        </h1>
      </div>
      <p className="text-muted-foreground">
        Here&apos;s your overview across all projects.
      </p>
    </div>
  );
}
