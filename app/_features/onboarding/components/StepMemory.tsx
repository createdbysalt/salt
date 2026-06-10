import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@repo/utils";
import { MEMORY_DOMAINS } from "../data/onboarding-flow-data";
import { OnboardingStepActions, onboardingActionButtonClassName } from "./OnboardingStepActions";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;
const STAGGER_MS = 420;

export function StepMemory({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [completedIdx, setCompletedIdx] = useState(-1);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    MEMORY_DOMAINS.forEach((_, i) => {
      timers.push(setTimeout(() => setCompletedIdx(i), (i + 1) * STAGGER_MS));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  const allDone = completedIdx >= MEMORY_DOMAINS.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: APPLE_EASE }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Step 4 · Building your memory
        </div>
        <h2 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl">
          Salt is reading your world.
        </h2>
        <p className="max-w-xl text-base text-muted-foreground">
          Grouping people, work, and relationships across the tools you just connected. This becomes
          the memory Salt uses to draft plays.
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6">
        <ul className="divide-y divide-border/60">
          {MEMORY_DOMAINS.map((d, i) => {
            const done = i <= completedIdx;
            const active = i === completedIdx + 1;
            const Icon = d.icon;
            return (
              <li key={d.id} className="flex items-center gap-4 py-3">
                <div
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-xl transition-colors",
                    done ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-semibold transition-colors",
                      !done && !active && "text-muted-foreground",
                    )}
                  >
                    {d.label}
                  </p>
                  <AnimatePresence mode="wait">
                    {done ? (
                      <motion.p
                        key="done"
                        initial={{ opacity: 0, y: 2 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="tabular-nums text-[12px] text-muted-foreground"
                      >
                        +{d.count.toLocaleString()} found
                      </motion.p>
                    ) : active ? (
                      <motion.p
                        key="active"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[12px] text-muted-foreground"
                      >
                        Scanning…
                      </motion.p>
                    ) : (
                      <p className="text-[12px] text-muted-foreground/60">Waiting</p>
                    )}
                  </AnimatePresence>
                </div>
                <div className="shrink-0">
                  {done ? (
                    <motion.span
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 420, damping: 24 }}
                      className="inline-flex size-6 items-center justify-center rounded-full bg-foreground text-background"
                    >
                      <Check className="size-3.5" strokeWidth={3} />
                    </motion.span>
                  ) : active ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <span className="inline-block size-2 rounded-full bg-muted" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-[12px] text-muted-foreground">
        {allDone ? "Memory ready." : "This usually takes a few seconds."}
      </p>

      <OnboardingStepActions
        onBack={onBack}
        showSkip={false}
        primary={
          <button
            type="button"
            onClick={onNext}
            className={onboardingActionButtonClassName({ ready: allDone })}
          >
            {allDone ? "Continue" : "Skip ahead"}
          </button>
        }
      />
    </motion.div>
  );
}
