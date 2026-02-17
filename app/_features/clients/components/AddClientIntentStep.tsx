"use client";

import { Target, Sparkles, ArrowRight, Brain, Users } from "lucide-react";
import { cn } from "@repo/utils";
import type { ClientIntent } from "./AddClientSheet";

// ============================================================================
// Types
// ============================================================================

interface AddClientIntentStepProps {
  onSelect: (intent: ClientIntent) => void;
}

interface IntentOption {
  intent: ClientIntent;
  icon: React.ReactNode;
  title: string;
  description: string;
  benefits: string[];
  ecosystemHint: "intelligence" | "bridge";
}

// ============================================================================
// Intent Options
// ============================================================================

const intentOptions: IntentOption[] = [
  {
    intent: "prospect",
    icon: <Target className="h-5 w-5" />,
    title: "Prospect",
    description: "Someone you're pitching or nurturing",
    benefits: [
      "Track their journey through your pipeline",
      "Intelligence builds insights as you engage",
    ],
    ecosystemHint: "intelligence",
  },
  {
    intent: "client",
    icon: <Sparkles className="h-5 w-5" />,
    title: "Client",
    description: "Already closed—ready to start working",
    benefits: [
      "Invite to Bridge (client portal)",
      "Create projects & send invoices",
    ],
    ecosystemHint: "bridge",
  },
];

// ============================================================================
// Component
// ============================================================================

export function AddClientIntentStep({ onSelect }: AddClientIntentStepProps) {
  return (
    <div className="p-6 space-y-6">
      {/* Question */}
      <div className="text-center space-y-1">
        <h3 className="text-base font-medium text-foreground">
          What&apos;s your relationship with this client?
        </h3>
        <p className="text-sm text-muted-foreground">
          This helps us tailor the experience
        </p>
      </div>

      {/* Intent Cards */}
      <div className="grid grid-cols-2 gap-4">
        {intentOptions.map((option) => (
          <IntentCard
            key={option.intent}
            option={option}
            onSelect={() => onSelect(option.intent)}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-3 text-muted-foreground">
            or
          </span>
        </div>
      </div>

      {/* Quick Add Option */}
      <button
        onClick={() => onSelect("quick")}
        className={cn(
          "w-full group flex items-center justify-between",
          "px-4 py-3 rounded-[10px]",
          "bg-muted/50 border border-transparent",
          "hover:bg-muted hover:border-border",
          "transition-all duration-160",
          "text-left"
        )}
      >
        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
          Just add the basics (skip this)
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
      </button>
    </div>
  );
}

// ============================================================================
// Intent Card Component
// ============================================================================

interface IntentCardProps {
  option: IntentOption;
  onSelect: () => void;
}

function IntentCard({ option, onSelect }: IntentCardProps) {
  const EcosystemIcon = option.ecosystemHint === "intelligence" ? Brain : Users;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col text-left",
        "p-4 rounded-[16px]",
        "bg-card border border-border",
        "hover:border-primary/50 hover:bg-accent/50",
        "transition-all duration-160",
        "active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex items-center justify-center",
          "h-10 w-10 rounded-[10px] mb-3",
          "bg-primary/10 text-primary",
          "group-hover:bg-primary group-hover:text-primary-foreground",
          "transition-colors duration-160"
        )}
      >
        {option.icon}
      </div>

      {/* Content */}
      <div className="space-y-1 mb-4">
        <h4 className="text-sm font-medium text-foreground">
          {option.title}
        </h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {option.description}
        </p>
      </div>

      {/* Benefits */}
      <div className="space-y-1.5 mt-auto">
        {option.benefits.map((benefit, index) => (
          <div
            key={index}
            className="flex items-start gap-2 text-xs text-muted-foreground"
          >
            <span className="text-primary mt-0.5">→</span>
            <span>{benefit}</span>
          </div>
        ))}
      </div>

      {/* Ecosystem Badge */}
      <div
        className={cn(
          "absolute top-3 right-3",
          "flex items-center gap-1.5 px-2 py-1 rounded-full",
          "bg-muted/80 text-muted-foreground",
          "text-[10px] font-medium uppercase tracking-wider"
        )}
      >
        <EcosystemIcon className="h-3 w-3" />
        <span>
          {option.ecosystemHint === "intelligence" ? "Strategy" : "Serve"}
        </span>
      </div>
    </button>
  );
}
