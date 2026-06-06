"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Landing2Container } from "./Landing2Container";
import { Landing2SectionHeader } from "./Landing2SectionHeader";
import { ProofStatsVisual } from "./Landing2VisualMocks";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

export function Landing2ProofSection() {
  const reduce = useReducedMotion();

  return (
    <section id="proof" className="scroll-mt-28 py-20 lg:py-28">
      <Landing2Container>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: APPLE_EASE }}
          className="grid gap-10 rounded-3xl border border-foreground/10 bg-card p-8 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:p-12"
        >
          <div>
            <Landing2SectionHeader
              eyebrow="Proof"
              title="From 1 client a month to 5. Same hours."
            />
            <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              <p>
                Salt's founder built it because she lived the ops bottleneck herself — chasing
                context, drafting follow-ups, reconciling notes across four tools. One client a
                month was the ceiling. Not because the work wasn't there. Because there weren't
                enough hours to close it.
              </p>
              <p>
                With Salt, morning review went from 90 minutes to 15. Follow-ups that used to take
                an hour now take a decision. Salt surfaces who's ready to move forward and prepares
                the next step — the founder just says yes.
              </p>
              <p className="text-sm font-medium text-foreground">
                Built by a studio, for independent professionals.
              </p>
            </div>
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: APPLE_EASE, delay: 0.1 }}
          >
            <ProofStatsVisual />
          </motion.div>
        </motion.div>
      </Landing2Container>
    </section>
  );
}
