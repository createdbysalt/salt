"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Eye, Sparkles, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Landing2Container } from "./Landing2Container";
import { Landing2SectionHeader } from "./Landing2SectionHeader";
import {
  ActQueueVisual,
  GrowAutonomyVisual,
  LearnOrbitVisual,
} from "./Landing2VisualMocks";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

const steps = [
  {
    step: "01",
    label: "LEARN",
    icon: <Eye className="size-4" strokeWidth={2} />,
    title: "Salt connects and reads. Zero manual setup.",
    body: "Salt connects to the tools you already use — email, calendar, CRM, project management, notes. It reads your data in context, connecting the dots between people, projects, and promises. No training. No tagging. No workflows to build.",
    visual: <LearnOrbitVisual />,
  },
  {
    step: "02",
    label: "ACT",
    icon: <Sparkles className="size-4" strokeWidth={2} />,
    title: "Salt prepares while you work. You approve.",
    body: "Every morning, Salt surfaces a complete picture of what needs your attention: who's waiting on you, what's drifting, what's changed overnight. It drafts replies, prepares briefings, and queues actions. You review, adjust if you want, and approve. Creation is Salt's job. Decision is yours.",
    visual: <ActQueueVisual />,
  },
  {
    step: "03",
    label: "GROW",
    icon: <TrendingUp className="size-4" strokeWidth={2} />,
    title: "As proven, grant more autonomy.",
    body: "Over time, Salt learns your patterns. What you approve, what you redirect, what you ignore. Grant it permission to act on routine decisions autonomously. The more you use it, the more it handles — and the more of your week comes back.",
    visual: <GrowAutonomyVisual />,
  },
];

export function Landing2HowSection() {
  const reduce = useReducedMotion() ?? false;

  return (
    <section id="how" className="scroll-mt-28 py-20 lg:py-28">
      <Landing2Container>
        <Landing2SectionHeader
          align="center"
          eyebrow="How it works"
          title="LEARN → ACT → GROW"
          description="The first two phases happen before you open the app."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-3 lg:gap-6">
          {steps.map((s, i) => (
            <StepCard key={s.label} index={i} reduce={reduce} {...s} />
          ))}
        </div>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45, ease: APPLE_EASE, delay: 0.2 }}
          className="mx-auto mt-12 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground sm:text-base"
        >
          Salt is proactive AI for your business — purpose-built to read connected accounts and
          queue work for your approval.
        </motion.p>
      </Landing2Container>
    </section>
  );
}

function StepCard({
  index,
  step,
  label,
  icon,
  title,
  body,
  visual,
  reduce,
}: {
  index: number;
  step: string;
  label: string;
  icon: ReactNode;
  title: string;
  body: string;
  visual: ReactNode;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: APPLE_EASE, delay: index * 0.1 }}
      whileHover={reduce ? undefined : { y: -4 }}
      className="group overflow-hidden rounded-2xl border border-foreground/10 bg-card shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-lift)]"
    >
      <div className="p-3 pb-0">{visual}</div>
      <div className="p-7 pt-5">
        <div className="flex items-center gap-3">
          <div className="inline-flex size-9 items-center justify-center rounded-full bg-foreground text-background">
            {icon}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground tabular-nums">
            {step} · {label}
          </div>
        </div>
        <h3 className="font-display mt-5 text-2xl leading-tight">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </motion.div>
  );
}
