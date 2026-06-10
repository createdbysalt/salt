import { motion } from "framer-motion";
import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@repo/utils";
import { CONNECTABLE_APPS } from "../data/onboarding-flow-data";
import { AppBrandIcon } from "./AppBrandIcon";
import { OnboardingStepActions, onboardingActionButtonClassName } from "./OnboardingStepActions";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

export function StepConnect({
  onNext,
  onBack,
  initial,
}: {
  onNext: (connected: string[]) => void;
  onBack: () => void;
  initial: string[];
}) {
  const [connected, setConnected] = useState<Set<string>>(new Set(initial));

  const toggle = (id: string) => {
    setConnected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: APPLE_EASE }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Step 3 · Connect your tools
        </div>
        <h2 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl">
          Where does your work happen?
        </h2>
        <p className="max-w-xl text-base text-muted-foreground">
          Salt will quietly read context from these to build memory and surface captures. Connect at
          least one for best results — you can always add more later.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CONNECTABLE_APPS.map((app) => {
          const isOn = connected.has(app.id);
          return (
            <button
              key={app.id}
              type="button"
              onClick={() => toggle(app.id)}
              className={cn(
                "group flex items-center gap-4 rounded-2xl border p-4 text-left transition-all",
                isOn
                  ? "border-foreground/30 bg-foreground/5 shadow-[var(--shadow-card)]"
                  : "hover-lift border-border/60 bg-card hover:border-foreground/30",
              )}
            >
              <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-border/60 bg-background">
                <AppBrandIcon brand={app.brand} className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">{app.name}</p>
                <p className="truncate text-[12px] leading-snug text-muted-foreground">{app.blurb}</p>
              </div>
              <span
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-all",
                  isOn
                    ? "bg-foreground text-background"
                    : "bg-muted text-foreground group-hover:bg-foreground group-hover:text-background",
                )}
              >
                {isOn ? (
                  <>
                    <Check className="size-3.5" strokeWidth={2.5} /> Connected
                  </>
                ) : (
                  "Connect"
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p className="tabular-nums text-[12px] text-muted-foreground">
        {connected.size} of {CONNECTABLE_APPS.length} connected
      </p>

      <OnboardingStepActions
        onBack={onBack}
        showSkip={false}
        primary={
          <button
            type="button"
            onClick={() => onNext(Array.from(connected))}
            className={onboardingActionButtonClassName()}
          >
            {connected.size === 0 ? "Continue without connecting" : "Continue"}
          </button>
        }
      />
    </motion.div>
  );
}
