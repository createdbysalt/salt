"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { FadeUpBlur } from "@/app/_components/effects/fade-up-blur";
import { useAnimationTier } from "@/app/_lib/animations/hooks";
import { captureLeadAction } from "@/app/_features/marketing/actions";
import { trackWaitlistFunnel } from "@/app/_features/marketing/waitlist-funnel";

export const WAITLIST_ROLE_OPTIONS = [
  { value: "creative", label: "Creative studio (design, photo, video, copy)" },
  { value: "coaching", label: "Coaching or consulting practice" },
  {
    value: "advisory",
    label: "Real estate, financial, or professional advisory",
  },
  { value: "wellness", label: "Therapy or wellness practice" },
  { value: "events", label: "Wedding or events solo operator" },
  { value: "other", label: "Other solo service work" },
] as const;

/**
 * Final waitlist CTA section wired to captureLeadAction.
 */
export function WaitlistSection() {
  const tier = useAnimationTier();
  const inputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [roleSegment, setRoleSegment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || isSubmitted) return;

    setIsLoading(true);
    trackWaitlistFunnel("waitlist_submit", {
      roleSegment: roleSegment || undefined,
    });

    try {
      const result = await captureLeadAction({
        email,
        roleSegment: roleSegment || undefined,
      });
      if (result.success) {
        trackWaitlistFunnel("waitlist_success", {
          roleSegment: roleSegment || undefined,
        });
        toast.success(
          result.alreadyJoined
            ? "You're already on the waitlist."
            : "You're on the Salt waitlist."
        );
        inputRef.current?.blur();
        setEmail("");
        setRoleSegment("");
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
    <section id="waitlist" className="relative py-20 md:py-24">
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <FadeUpBlur>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[rgba(39,37,30,0.5)]">
            Waitlist
          </p>
          <h2 className="mt-4 text-[clamp(2rem,5vw,3.5rem)] font-medium leading-[1.04] tracking-[-0.04em] text-[#27251e]">
            Get early access when the next cohort opens.
          </h2>
        </FadeUpBlur>

        <FadeUpBlur delay={0.2}>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-7 text-[rgba(39,37,30,0.64)]">
            Join the list for proactive AI that prepares the next step before
            client work slips.
          </p>
        </FadeUpBlur>

        <FadeUpBlur delay={0.4} className="mt-10">
          {isSubmitted ? (
            <motion.div
              initial={tier !== "none" ? { opacity: 0, scale: 0.95 } : undefined}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 rounded-lg border border-[rgba(39,37,30,0.10)] bg-white/70 px-6 py-3.5 text-[14px] font-medium text-[rgba(39,37,30,0.68)]"
            >
              <CheckIcon />
              You&apos;re on the list. We&apos;ll send early access details.
            </motion.div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mx-auto flex max-w-lg flex-col gap-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <label htmlFor="waitlist-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    ref={inputRef}
                    id="waitlist-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 w-full rounded-lg border border-[rgba(39,37,30,0.12)] bg-white/70 px-4 text-[14px] text-[#27251e] placeholder-[rgba(39,37,30,0.38)] outline-none transition-colors focus:border-[#4e58fc]/50 focus:bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#27251e] px-6 text-[14px] font-medium text-white transition-colors hover:bg-[#38352b] disabled:opacity-50"
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
              </div>

              <div className="text-left">
                <label
                  htmlFor="waitlist-role"
                  className="text-[13px] text-[rgba(39,37,30,0.55)]"
                >
                  Who are you building for?{" "}
                  <span className="text-[rgba(39,37,30,0.4)]">(optional)</span>
                </label>
                <select
                  id="waitlist-role"
                  value={roleSegment}
                  onChange={(e) => setRoleSegment(e.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-[rgba(39,37,30,0.12)] bg-white/70 px-3 text-[14px] text-[#27251e] outline-none transition-colors focus:border-[#4e58fc]/50 focus:bg-white"
                >
                  <option value="">Select a segment</option>
                  {WAITLIST_ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </form>
          )}
        </FadeUpBlur>

        <FadeUpBlur delay={0.6} className="mt-8">
          <p className="text-[13px] leading-relaxed text-[rgba(39,37,30,0.5)]">
            Approval-first. No surprise sends. No false urgency.
          </p>
          <p className="mx-auto mt-3 max-w-md text-[12px] leading-relaxed text-[rgba(39,37,30,0.42)]">
            Founding members who join from the waitlist get priority access and
            annual pricing when billing opens — details with your invite.
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
        stroke="rgba(39,37,30,0.68)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
