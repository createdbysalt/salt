import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { OnboardingStepActions, onboardingActionButtonClassName } from "./OnboardingStepActions";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

export function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: APPLE_EASE }}
      className="space-y-8"
    >
      <div className="space-y-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <Sparkles className="size-3.5" />
          Welcome
        </div>

        <h1 className="font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
          Meet Salt.
          <br />
          <span className="text-muted-foreground">Your proactive operator.</span>
        </h1>

        <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Salt watches your tools, builds memory of your people and work, and drafts the next plays so
          you just approve.
        </p>

        <p className="text-[11px] text-muted-foreground">Takes less than a minute</p>
      </div>

      <OnboardingStepActions
        layout="centered"
        primary={
          <button
            type="button"
            onClick={onNext}
            className={onboardingActionButtonClassName()}
          >
            Let&apos;s set you up
          </button>
        }
      />
    </motion.div>
  );
}
