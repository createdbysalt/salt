"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { WaitlistForm } from "./WaitlistForm";
import { Landing2Container } from "./Landing2Container";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

const benefits = [
  "Founder access — direct input into product direction",
  "Launch pricing locked for as long as you're a customer",
];

export function Landing2WaitlistSection() {
  return (
    <section id="waitlist" className="scroll-mt-20 py-20 lg:py-24">
      <Landing2Container>
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: APPLE_EASE }}
          className="surface-aurora relative overflow-hidden rounded-3xl px-6 py-12 sm:px-14 sm:py-20 lg:px-20"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-white/90" />
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/90">
                Early access
              </span>
            </div>
            <h2 className="font-display mt-4 text-balance text-3xl leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-5xl lg:text-6xl">
              Join the waitlist. Get in early.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
              First 200 customers lock in launch pricing — 2 months free on annual.
            </p>

            <ul className="mt-8 space-y-3">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-sm text-white/90 sm:text-base">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                    <Check className="size-3" strokeWidth={2.5} />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>

            <p className="mt-6 text-xs text-white/70">
              No countdown timers. No fake scarcity.
            </p>

            <div className="mt-8 max-w-md">
              <WaitlistForm variant="aurora" source="landing2-close" />
            </div>

            <p className="mt-8 max-w-lg text-sm leading-relaxed text-white/80">
              Salt doesn't replace you. It amplifies you. The week you get back is yours.
            </p>
          </div>
        </motion.div>
      </Landing2Container>
    </section>
  );
}
