"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { FadeUpBlur } from "@/app/_components/effects/fade-up-blur";
import { GlowBorder } from "@/app/_components/effects/glow-border";
import { useAnimationTier } from "@/app/_lib/animations/hooks";
import { captureLeadAction } from "@/app/_features/marketing/actions";

/**
 * Final waitlist CTA section.
 * Inline email capture with glow border animation.
 * Wired to existing captureLeadAction server action.
 */
export function WaitlistSection() {
  const tier = useAnimationTier();
  const inputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || isSubmitted) return;

    setIsLoading(true);
    try {
      const result = await captureLeadAction({ email });
      if (result.success) {
        toast.success("Thanks for joining the waitlist!");
        inputRef.current?.blur();
        setEmail("");
        setIsSubmitted(true);
      } else {
        toast.error(
          "error" in result ? result.error : "Something went wrong"
        );
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="waitlist" className="relative py-28 md:py-36">
      {/* Subtle top divider */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(255,255,255,0.06) 50%, transparent)",
        }}
        aria-hidden="true"
      />

      {/* Radial glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
        style={{
          width: "min(700px, 80vw)",
          height: "min(400px, 50vw)",
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.02) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
        <FadeUpBlur>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-[#F7F8F8]">
            Your studio, ready to run.
          </h2>
        </FadeUpBlur>

        <FadeUpBlur delay={0.2}>
          <p className="mt-5 text-[16px] leading-relaxed text-[rgb(138,143,152)]">
            Built for studios that value craft over chaos.
          </p>
        </FadeUpBlur>

        {/* Email capture form */}
        <FadeUpBlur delay={0.4} className="mt-10">
          {isSubmitted ? (
            <motion.div
              initial={tier !== "none" ? { opacity: 0, scale: 0.95 } : undefined}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-6 py-3.5 text-[14px] font-medium text-[rgb(138,143,152)]"
            >
              <CheckIcon />
              You&apos;re on the list. We&apos;ll be in touch.
            </motion.div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <div className="flex-1">
                <input
                  ref={inputRef}
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@studio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full rounded-full border border-white/[0.08] bg-white/[0.03] px-5 text-[14px] text-[#F7F8F8] placeholder-[rgb(80,85,94)] outline-none transition-colors focus:border-white/[0.15] focus:bg-white/[0.05]"
                />
              </div>
              <GlowBorder duration={4} rounded="rounded-full">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[rgb(8,9,10)] px-6 text-[14px] font-medium text-[#F7F8F8] transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                      Joining...
                    </>
                  ) : (
                    <>
                      Join the waitlist
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </GlowBorder>
            </form>
          )}
        </FadeUpBlur>

        {/* Origin proof */}
        <FadeUpBlur delay={0.6} className="mt-12">
          <p className="text-[13px] leading-relaxed text-[rgb(100,105,114)]">
            SALT started as an internal tool at SALT Studio. Every feature
            solves a real problem we hit running client work.
          </p>
        </FadeUpBlur>
      </div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.5 8.5L6.5 11.5L12.5 5.5"
        stroke="rgb(138,143,152)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
