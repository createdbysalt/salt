import { motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@repo/utils";
import { ROLE_CHIPS, type Role } from "../data/onboarding-flow-data";
import { OnboardingStepActions, onboardingActionButtonClassName } from "./OnboardingStepActions";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

export function StepAbout({
  onNext,
  onBack,
}: {
  onNext: (data: { name: string; role: Role | null }) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: APPLE_EASE }}
      className="space-y-10"
    >
      <div className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Step 2 · About you
        </div>
        <h2 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl">
          What should Salt call you?
        </h2>
      </div>

      <div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onNext({ name: name.trim(), role });
          }}
          placeholder="Your name"
          className="w-full border-0 border-b border-border bg-transparent pb-3 font-display text-4xl tracking-tight outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground sm:text-5xl"
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">And what best describes how you work?</p>
        <div className="flex flex-wrap gap-2">
          {ROLE_CHIPS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                "h-9 rounded-full border px-4 text-sm font-medium transition-all",
                role === r
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-foreground hover:border-foreground/40",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <OnboardingStepActions
        onBack={onBack}
        showSkip={false}
        hint="or press Enter"
        primary={
          <button
            type="button"
            onClick={() => onNext({ name: name.trim() || "there", role })}
            disabled={!name.trim()}
            className={onboardingActionButtonClassName({ ready: Boolean(name.trim()) })}
          >
            Continue
          </button>
        }
      />
    </motion.div>
  );
}
