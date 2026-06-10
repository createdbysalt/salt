import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@repo/utils";
import { OnboardingStepActions, onboardingActionButtonClassName } from "./OnboardingStepActions";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

const LINES = [
  "Spotting unanswered follow-ups…",
  "Flagging scope drift on active work…",
  "Surfacing billing and renewal moments…",
  "Drafting your first plays…",
];

export function StepDrafting() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    LINES.forEach((_, i) => {
      timers.push(setTimeout(() => setStep(i + 1), (i + 1) * 700));
    });
    timers.push(setTimeout(() => setDone(true), (LINES.length + 1) * 700));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: APPLE_EASE }}
      className="space-y-10 text-center"
    >
      <div className="space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Step 5 · Almost ready
        </div>
        <h2 className="font-display text-4xl leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
          {done ? "Your plays are drafted." : "Salt is drafting your first plays."}
        </h2>
        <p className="mx-auto max-w-xl text-base text-muted-foreground">
          {done
            ? "Head to HQ to review and approve. Salt will keep watching and drafting in the background."
            : "Using your memory to suggest the next moves. You always approve before anything goes out."}
        </p>
      </div>

      <div className="mx-auto max-w-md space-y-2.5 rounded-2xl border border-border/60 bg-card p-4 text-left">
        {LINES.map((line, i) => {
          const isDone = i < step;
          const isActive = i === step && !done;
          if (!isDone && !isActive) return null;
          return (
            <motion.div
              key={line}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 text-sm"
            >
              {isDone ? (
                <Check className="size-4 text-foreground" strokeWidth={2.5} />
              ) : (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              )}
              <span className={isDone ? "text-foreground" : "text-muted-foreground"}>{line}</span>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: APPLE_EASE }}
          >
            <OnboardingStepActions
              showSkip={false}
              hint="You can come back and rerun this anytime."
              primary={
                <Link
                  href="/hq"
                  className={cn(onboardingActionButtonClassName(), "inline-flex items-center gap-2")}
                >
                  Go to HQ
                  <ArrowRight className="size-4" />
                </Link>
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
