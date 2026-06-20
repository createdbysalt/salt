"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import type { MarketingCta } from "@/app/_lib/sanity/types";
import type { ResolvedWaitlistForm } from "@/app/_features/marketing/waitlist-form-config";
import { normalizeMoneyOnTheTableLink } from "@/app/_features/marketing/money-on-the-table-links";
import { linkOpensInNewTab } from "@/app/_features/marketing/site-settings-config";
import { WaitlistForm } from "./WaitlistForm";
import { Landing2Container } from "./Landing2Container";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

export function Landing2WaitlistPanel({
  cta,
  waitlistForm,
}: {
  cta: MarketingCta;
  waitlistForm: ResolvedWaitlistForm;
}) {
  const benefits = cta.benefits ?? [];
  const secondaryLink = cta.secondaryLink
    ? normalizeMoneyOnTheTableLink(cta.secondaryLink)
    : undefined;

  return (
    <section id="waitlist" className="scroll-mt-20 pt-20 pb-32 lg:pt-24 lg:pb-40">
      <Landing2Container>
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: APPLE_EASE }}
          className="surface-aurora relative overflow-hidden rounded-3xl px-6 py-10 sm:px-14 sm:py-16 lg:px-20"
        >
          <div className="relative z-10">
            {cta.eyebrow ? (
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-white/90" />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/90">
                  {cta.eyebrow}
                </span>
              </div>
            ) : null}
            <h2 className="font-display mt-4 text-balance text-3xl leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-5xl lg:text-6xl">
              {cta.heading}
            </h2>
            {cta.subheading ? (
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
                {cta.subheading}
              </p>
            ) : null}

            {benefits.length > 0 ? (
              <ul className="mt-8 space-y-3">
                {benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-3 text-sm text-white/90 sm:text-base"
                  >
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                      <Check className="size-3" strokeWidth={2.5} />
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
            ) : null}

            {cta.disclaimer ? (
              <p className="mt-6 text-xs text-white/70">{cta.disclaimer}</p>
            ) : null}

            <div className="mt-8 max-w-md">
              <WaitlistForm
                variant="aurora"
                source={cta.waitlistSource ?? waitlistForm.waitlistSource}
                submitLabel={waitlistForm.submitLabel}
                emailPlaceholder={waitlistForm.emailPlaceholder}
              />
            </div>

            {secondaryLink?.href && secondaryLink.text ? (
              <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/80">
                {cta.secondaryLinkLead ? (
                  <span>{cta.secondaryLinkLead} </span>
                ) : null}
                {linkOpensInNewTab(secondaryLink) ? (
                  <a
                    href={secondaryLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-white underline decoration-white/40 underline-offset-4 transition hover:text-white hover:decoration-white"
                  >
                    {secondaryLink.text}
                    <ArrowRight className="size-3.5 shrink-0" aria-hidden />
                  </a>
                ) : (
                  <Link
                    href={secondaryLink.href}
                    className="inline-flex items-center gap-1 font-medium text-white underline decoration-white/40 underline-offset-4 transition hover:text-white hover:decoration-white"
                  >
                    {secondaryLink.text}
                    <ArrowRight className="size-3.5 shrink-0" aria-hidden />
                  </Link>
                )}
              </p>
            ) : null}

            {cta.footerText ? (
              <p className="mt-8 max-w-lg text-sm leading-relaxed text-white/80">
                {cta.footerText}
              </p>
            ) : null}
          </div>
        </motion.div>
      </Landing2Container>
    </section>
  );
}
