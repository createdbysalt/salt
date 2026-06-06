"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@repo/utils";
import { Landing2Container } from "./Landing2Container";
import { Landing2SectionHeader } from "./Landing2SectionHeader";
import { TransformationContrastVisual } from "./Landing2TransformationVisual";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;
type TransformationPhase = "before" | "after";

type ScrollStep = {
  id: string;
  phase: TransformationPhase;
  label: string;
  time: string;
  title: string;
  text: string;
};

const scrollSteps: ScrollStep[] = [
  {
    id: "before",
    phase: "before",
    label: "Before",
    time: "Your Monday",
    title: "Systems that never spoke",
    text: "Email, Slack, CRM, calendar — all separate. You chase context across tabs, react to what's loudest, and end the day still behind.",
  },
  {
    id: "after",
    phase: "after",
    label: "After",
    time: "With Salt",
    title: "One surface. Twelve minutes.",
    text: "Salt reads every tool. Three plays need your call — context already pulled. Approve, walk into your meeting briefed, and run the rest of your day.",
  },
];

function StepCopy({ step, isActive }: { step: ScrollStep; isActive: boolean }) {
  return (
    <div
      className={cn(
        "grid w-full gap-6 transition-opacity duration-500 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[6.5rem_minmax(0,1fr)]",
        isActive ? "opacity-100" : "opacity-0",
      )}
    >
      <p className="pt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">
        {step.label}
      </p>
      <div>
        <p className="font-mono text-xs font-semibold tabular-nums text-muted-foreground">
          {step.time}
        </p>
        <h3 className="font-display mt-3 text-2xl leading-tight tracking-tight sm:text-3xl lg:text-[2rem]">
          {step.title}
        </h3>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {step.text}
        </p>
      </div>
    </div>
  );
}

function PinnedScrollExperience({
  activeIndex,
  reduce,
}: {
  activeIndex: number;
  reduce: boolean;
}) {
  const activeStep = scrollSteps[activeIndex] ?? scrollSteps[0];

  return (
    <div className="grid h-full min-h-0 grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-stretch lg:gap-10 xl:gap-14">
      <div className="relative order-2 flex min-h-[38vh] w-full items-center lg:order-1 lg:min-h-0 lg:h-full">
        {scrollSteps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "absolute inset-0 flex items-center transition-opacity duration-500",
              index === activeIndex ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
            )}
            aria-hidden={index !== activeIndex}
          >
            <StepCopy step={step} isActive={index === activeIndex} />
          </div>
        ))}
      </div>

      <div className="order-1 flex h-full min-h-0 w-full items-center justify-center [container-type:size] lg:order-2">
        <div className="aspect-square w-full max-w-full shrink-0 lg:w-[min(100cqw,100cqh)] lg:max-w-full">
          <motion.div
            key={activeStep.id}
            initial={reduce ? false : { opacity: 0.88 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: APPLE_EASE }}
            className="h-full w-full"
          >
            <TransformationContrastVisual phase={activeStep.phase} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function Landing2TransformationSection() {
  const reduce = useReducedMotion();
  const pinTrackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateActiveIndex = useCallback(() => {
    const track = pinTrackRef.current;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const trackTop = window.scrollY + rect.top;
    const trackHeight = track.offsetHeight;
    const viewport = window.innerHeight;
    const scrollable = Math.max(trackHeight - viewport, 1);
    const scrolled = window.scrollY - trackTop;

    if (scrolled <= 0) {
      setActiveIndex(0);
      return;
    }
    if (scrolled >= scrollable) {
      setActiveIndex(scrollSteps.length - 1);
      return;
    }

    const progress = scrolled / scrollable;
    setActiveIndex(Math.min(scrollSteps.length - 1, Math.floor(progress * scrollSteps.length)));
  }, []);

  useEffect(() => {
    if (reduce) return;

    updateActiveIndex();
    window.addEventListener("scroll", updateActiveIndex, { passive: true });
    window.addEventListener("resize", updateActiveIndex);
    return () => {
      window.removeEventListener("scroll", updateActiveIndex);
      window.removeEventListener("resize", updateActiveIndex);
    };
  }, [reduce, updateActiveIndex]);

  return (
    <section id="transformation" className="scroll-mt-28">
      <Landing2Container columnClassName="w-full max-w-none lg:w-[92%]">
        <div className="py-20 lg:py-28">
          {reduce ? (
            <>
              <Landing2SectionHeader
                align="center"
                eyebrow="A day in your business"
                title="Before Salt — and after."
              />
              <div className="mt-14 space-y-16">
                {scrollSteps.map((step) => (
                  <div key={step.id} className="space-y-8">
                    <StepCopy step={step} isActive />
                    <div className="mx-auto aspect-square w-full max-w-md">
                      <TransformationContrastVisual phase={step.phase} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div
              ref={pinTrackRef}
              className="relative"
              style={{ height: `${scrollSteps.length * 100}vh` }}
            >
              <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden bg-background">
                <div className="shrink-0 px-0 pt-6 sm:pt-8 lg:pt-10">
                  <Landing2SectionHeader
                    align="center"
                    eyebrow="A day in your business"
                    title="Before Salt — and after."
                  />
                </div>
                <div className="min-h-0 flex-1 px-0 pb-6 sm:pb-8 lg:pb-10">
                  <PinnedScrollExperience activeIndex={activeIndex} reduce={!!reduce} />
                </div>
              </div>
            </div>
          )}

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, ease: APPLE_EASE, delay: 0.15 }}
            className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground sm:text-base"
          >
            Move from competing on price to commanding premium rates — Salt is the operational engine
            for growth you're ready for.
          </motion.p>
        </div>
      </Landing2Container>
    </section>
  );
}
