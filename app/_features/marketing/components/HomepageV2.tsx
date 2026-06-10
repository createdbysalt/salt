"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  Check,
  CircleDot,
  FileText,
  Inbox,
  Lightbulb,
  MessageSquare,
  Network,
  PenLine,
  Play,
  Search,
  Shield,
} from "lucide-react";
import { cn } from "@repo/utils";
import { FadeUpBlur } from "@/app/_components/effects/fade-up-blur";
import { useAnimationTier } from "@/app/_lib/animations/hooks";

const SURFACES = [
  {
    name: "HQ",
    description: "The current state of the practice, what changed, and what needs attention.",
  },
  {
    name: "Plays",
    description: "Prepared work with context, evidence, and a clear approval step.",
  },
  {
    name: "Capture",
    description: "Notes, calls, and loose context routed to the right place.",
  },
  {
    name: "Ask Salt",
    description: "A command line for business context, drafts, and follow-through.",
  },
  {
    name: "Connections",
    description: "People, organizations, work, files, and notes as one relationship graph.",
  },
  {
    name: "Spaces",
    description: "Shared workspaces with the right view for owners, clients, and collaborators.",
  },
] as const;

const SIGNALS = [
  { icon: MessageSquare, label: "Call note", text: "Client mentioned a June launch window." },
  { icon: Calendar, label: "Calendar", text: "Discovery follow-up is due tomorrow." },
  { icon: Inbox, label: "Email thread", text: "Scope review thread has been quiet for 9 days." },
] as const;

export function HeroSection() {
  const tier = useAnimationTier();
  const shouldAnimate = tier !== "none";

  return (
    <section className="relative overflow-hidden border-b border-[rgba(39,37,30,0.08)] pt-28 sm:pt-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(78,88,252,0.10),transparent_38%)]" />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:pb-24">
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
        >
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[rgba(39,37,30,0.55)]">
              Early access is opening soon
            </p>

          <h1 className="mt-5 max-w-2xl text-[clamp(2.6rem,6vw,4.5rem)] font-medium leading-[1.02] tracking-[-0.04em] text-[#27251e]">
            Salt. The proactive AI for your business.
          </h1>

          <p className="mt-6 max-w-xl text-[17px] leading-8 text-[rgba(39,37,30,0.68)]">
            Salt reads what changed across your work—and handles what you would do
            next, plus the moves you never knew to make.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="#waitlist"
              className="group inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#27251e] px-5 text-sm font-medium text-white transition-colors hover:bg-[#38352b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4e58fc]"
            >
              Join the waitlist
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <span className="text-sm text-[rgba(39,37,30,0.55)]">
              For independent professionals with 5–25 client relationships.
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 16, scale: 0.99 } : false}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.12, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        >
          <ProductDemo />
        </motion.div>
      </div>
    </section>
  );
}

export function MomentCardsSection() {
  const cards = [
    {
      title: "The lead went quiet",
      body: "A prospect stopped replying. Salt noticed the gap, pulled the thread history, and prepared a re-engagement play for your review.",
    },
    {
      title: "The call surfaced a need",
      body: "You mentioned a June launch on a call. Salt captured it, linked it to the account, and drafted the follow-up before you opened your inbox.",
    },
    {
      title: "Monday already has a briefing",
      body: "HQ opens with what changed, what is at risk, and what Salt already moved on—not a blank dashboard waiting for you to hunt.",
    },
  ];

  return (
    <section className="border-b border-[rgba(39,37,30,0.08)] py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <FadeUpBlur>
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[rgba(39,37,30,0.5)]">
              What proactivity feels like
            </p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.08] tracking-[-0.03em]">
              Salt acts before you ask.
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-[rgba(39,37,30,0.62)]">
              Three beats from a normal week — not a feature tour.
            </p>
          </div>
        </FadeUpBlur>

        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {cards.map((card, index) => (
            <FadeUpBlur key={card.title} delay={index * 0.08}>
              <motion.article
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="h-full border border-[rgba(39,37,30,0.08)] bg-white/60 p-5"
              >
                <h3 className="text-base font-medium tracking-[-0.01em]">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[rgba(39,37,30,0.62)]">
                  {card.body}
                </p>
              </motion.article>
            </FadeUpBlur>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProblemSection() {
  const cards = [
    {
      title: "The business lives in fragments",
      body: "A call transcript here. An email thread there. A note you meant to clean up later.",
    },
    {
      title: "Follow-through depends on memory",
      body: "Leads go quiet, renewals sneak up, and important context disappears when the week gets full.",
    },
    {
      title: "AI still waits for a prompt",
      body: "Most tools can answer a question. They do not start from the state of your business.",
    },
  ];

  return (
    <section className="border-b border-[rgba(39,37,30,0.08)] py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <FadeUpBlur>
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[rgba(39,37,30,0.5)]">
              Why now
            </p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.08] tracking-[-0.03em]">
              You are always reacting to the business you are trying to grow.
            </h2>
          </div>
        </FadeUpBlur>

        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {cards.map((card, index) => (
            <FadeUpBlur key={card.title} delay={index * 0.08}>
              <motion.article
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="h-full border border-[rgba(39,37,30,0.08)] bg-white/60 p-5"
              >
                <div className="mb-8 flex size-8 items-center justify-center rounded-md bg-[rgba(39,37,30,0.05)]">
                  <CircleDot className="size-4 text-[rgba(39,37,30,0.6)]" />
                </div>
                <h3 className="text-base font-medium tracking-[-0.01em]">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[rgba(39,37,30,0.62)]">
                  {card.body}
                </p>
              </motion.article>
            </FadeUpBlur>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RevenueDiscoverySection() {
  const bullets = [
    "The plays are already built—not a spreadsheet for you to interpret.",
    "Catches follow-ups you keep postponing and revenue you did not know was there.",
    "Standing rules so the same leak does not repeat this year.",
  ];

  return (
    <section className="border-b border-[rgba(39,37,30,0.08)] py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_1fr] lg:items-center">
        <FadeUpBlur>
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[rgba(39,37,30,0.5)]">
              Money you already earned
            </p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.08] tracking-[-0.03em]">
              Salt found the leak. Then it went to work.
            </h2>
            <p className="mt-5 text-[15px] leading-7 text-[rgba(39,37,30,0.65)]">
              Connect Stripe, calendar, and email. Salt reads how last year
              actually ran—late follow-ups, quiet leads, renewals that almost
              slipped—and builds the plays to get that money back and keep it
              from walking out again.
            </p>
          </div>
        </FadeUpBlur>

        <FadeUpBlur delay={0.12}>
          <div className="space-y-4">
            <div className="border border-[rgba(39,37,30,0.08)] bg-[#fafaf8] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[rgba(39,37,30,0.42)]">
                What Salt surfaced last year
              </p>
              <p className="mt-3 text-sm leading-6 text-[rgba(39,37,30,0.72)]">
                About{" "}
                <span className="font-medium text-[#27251e]">$12K–$22K</span>{" "}
                walked out on late follow-ups and cold leads. Salt mapped three
                re-engagement plays, a renewal-save sequence, and a standing
                rule so it does not happen again this year.
              </p>
            </div>
            <ul className="space-y-2">
              {bullets.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm leading-6 text-[rgba(39,37,30,0.68)]"
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-[rgba(39,37,30,0.48)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="#waitlist"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#27251e] px-4 text-sm font-medium text-white transition-colors hover:bg-[#38352b]"
            >
              Join the waitlist
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </FadeUpBlur>
      </div>
    </section>
  );
}

export function ProductLoopSection() {
  return (
    <section id="features" className="border-b border-[rgba(39,37,30,0.08)] py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <FadeUpBlur>
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[rgba(39,37,30,0.5)]">
              Learn {"->"} Act {"->"} Grow
            </p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.08] tracking-[-0.03em]">
              It learns your business. Then it works.
            </h2>
            <p className="mt-5 text-[15px] leading-7 text-[rgba(39,37,30,0.65)]">
              Salt acts on the work you already do—and on opportunities you never
              knew were sitting there. You stay in control; Salt does the
              moving.
            </p>
          </div>
        </FadeUpBlur>

        <FadeUpBlur delay={0.15}>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              [
                "Learn",
                "Your whole business, connected",
                "Email, calendar, payments, and notes become one picture of what changed, what slipped, and what is worth going after.",
              ],
              [
                "Act",
                "Work done before you ask",
                "Follow-ups you meant to send, renewals to save, plays you did not know to run—already drafted and ready to go.",
              ],
              [
                "Grow",
                "Recover what slipped. Keep what is yours.",
                "Quiet leads re-engaged, revenue protected, patterns saved. Run it, edit it, automate it, or save it for next time.",
              ],
            ].map(([label, title, body]) => (
              <div key={label} className="border border-[rgba(39,37,30,0.08)] bg-[#fafaf8] p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[rgba(39,37,30,0.45)]">
                  {label}
                </p>
                <h3 className="mt-5 text-base font-medium">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[rgba(39,37,30,0.6)]">{body}</p>
              </div>
            ))}
          </div>
        </FadeUpBlur>
      </div>
    </section>
  );
}

export function SurfacesSection() {
  return (
    <section className="border-b border-[rgba(39,37,30,0.08)] py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <FadeUpBlur>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[rgba(39,37,30,0.5)]">
                Product surfaces
              </p>
              <h2 className="mt-4 text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.08] tracking-[-0.03em]">
                One operating layer, not another place to manage.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[rgba(39,37,30,0.62)]">
              The surfaces stay familiar. The difference is that context and next steps
              are prepared before you ask.
            </p>
          </div>
        </FadeUpBlur>

        <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {SURFACES.map((surface, index) => (
            <FadeUpBlur key={surface.name} delay={index * 0.04}>
              <div className="min-h-36 border border-[rgba(39,37,30,0.08)] bg-white/55 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium">{surface.name}</h3>
                  <span className="font-mono text-[11px] text-[rgba(39,37,30,0.42)]">
                    0{index + 1}
                  </span>
                </div>
                <p className="mt-8 text-sm leading-6 text-[rgba(39,37,30,0.62)]">
                  {surface.description}
                </p>
              </div>
            </FadeUpBlur>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TrustSection() {
  return (
    <section className="border-b border-[rgba(39,37,30,0.08)] py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_1fr] lg:items-center">
        <FadeUpBlur>
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[rgba(39,37,30,0.5)]">
              Trust model
            </p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.08] tracking-[-0.03em]">
              Salt acts. You stay in control.
            </h2>
            <p className="mt-5 text-[15px] leading-7 text-[rgba(39,37,30,0.65)]">
              Salt is built by operators who ran client-shaped businesses on
              duct-taped tools. We are pre-revenue on the product and opening
              early access in cohorts—no fake logos, no borrowed social proof.
              What you see is what we are building.
            </p>
          </div>
        </FadeUpBlur>
        <FadeUpBlur delay={0.12}>
          <div className="space-y-3">
            {[
              "Acts on follow-ups you keep postponing—and moves you did not see coming.",
              "Some plays run automatically once you trust the pattern.",
              "Explains why it moved before you opened your inbox.",
              "Nothing high-stakes sends without you.",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 border border-[rgba(39,37,30,0.08)] bg-[#fafaf8] p-4 text-sm text-[rgba(39,37,30,0.68)]"
              >
                <Shield className="mt-0.5 size-4 shrink-0 text-[rgba(39,37,30,0.48)]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </FadeUpBlur>
      </div>
    </section>
  );
}

function ProductDemo() {
  const tier = useAnimationTier();
  const shouldAnimate = tier !== "none";

  return (
    <div className="relative">
      <div className="relative overflow-hidden border border-[rgba(39,37,30,0.10)] bg-[#fafaf8]">
        <div className="flex h-10 items-center justify-between border-b border-[rgba(39,37,30,0.08)] bg-[#f0eeea] px-3">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-[#27251e] text-[10px] font-semibold text-white">
              S
            </span>
            <span className="text-sm font-medium">Chen Studio</span>
          </div>
          <div className="hidden items-center gap-2 text-[11px] text-[rgba(39,37,30,0.48)] sm:flex">
            <Search className="size-3.5" />
            <span className="font-mono">Ask Salt</span>
          </div>
        </div>

        <div className="grid min-h-[520px] md:grid-cols-[180px_1fr]">
          <aside className="hidden border-r border-[rgba(39,37,30,0.08)] bg-[#f0eeea] p-3 md:block">
            <nav className="space-y-1">
              {[
                ["HQ", Lightbulb],
                ["Plays", Play],
                ["Capture", PenLine],
                ["Connections", Network],
                ["Spaces", MessageSquare],
              ].map(([label, Icon]) => (
                <div
                  key={label as string}
                  className={cn(
                    "flex h-8 items-center gap-2 px-2 text-[13px]",
                    label === "HQ"
                      ? "bg-[#27251e] text-white"
                      : "text-[rgba(39,37,30,0.64)]"
                  )}
                >
                  <Icon className="size-3.5" />
                  {label as string}
                </div>
              ))}
            </nav>
          </aside>

          <div className="p-4 sm:p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[rgba(39,37,30,0.45)]">
                  Monday briefing
                </p>
                <h3 className="mt-2 text-xl font-medium tracking-[-0.02em]">
                  3 things worth your attention
                </h3>
              </div>
              <span className="rounded-full bg-[#4e58fc]/10 px-2.5 py-1 font-mono text-[11px] text-[#27251e]">
                Live context
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-2">
                {SIGNALS.map((signal, index) => {
                  const Icon = signal.icon;
                  return (
                    <motion.div
                      key={signal.label}
                      initial={shouldAnimate ? { opacity: 0, y: 10 } : undefined}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.22, duration: 0.45 }}
                      className="border border-[rgba(39,37,30,0.08)] bg-white/70 p-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[rgba(39,37,30,0.05)]">
                          <Icon className="size-4 text-[rgba(39,37,30,0.55)]" />
                        </span>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[rgba(39,37,30,0.42)]">
                            {signal.label}
                          </p>
                          <p className="mt-1 text-sm leading-5 text-[rgba(39,37,30,0.72)]">
                            {signal.text}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <motion.div
                initial={shouldAnimate ? { opacity: 0, scale: 0.98 } : undefined}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.1, duration: 0.5 }}
                className="border border-[rgba(39,37,30,0.10)] bg-[#faf9f7] p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[rgba(39,37,30,0.42)]">
                      Ready for your call
                    </p>
                    <h4 className="mt-1 text-base font-medium">Re-engage Wren & Partners</h4>
                  </div>
                  <span className="flex size-7 items-center justify-center rounded-full bg-[#4e58fc]/10">
                    <FileText className="size-3.5 text-[#27251e]" />
                  </span>
                </div>

                <div className="space-y-3">
                  <DemoRow label="Why" value="No response in 9 days after scope review." />
                  <DemoRow label="Draft" value="Short check-in with revised launch window and next step." />
                  <DemoRow label="Evidence" value="Call note + email thread + June date mentioned." />
                </div>

                <div className="mt-5 border border-[rgba(39,37,30,0.08)] bg-white/70 p-3 text-sm leading-6 text-[rgba(39,37,30,0.7)]">
                  “You mentioned June as the ideal launch window. I mapped the next
                  three decisions and can hold time this week to walk through them.”
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <motion.button
                    type="button"
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#27251e] px-3 text-sm font-medium text-white"
                  >
                    <Play className="size-3.5" />
                    Run play
                  </motion.button>
                  <button
                    type="button"
                    className="h-9 rounded-lg border border-[rgba(39,37,30,0.10)] px-3 text-sm text-[rgba(39,37,30,0.68)]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="h-9 rounded-lg px-3 text-sm text-[rgba(39,37,30,0.5)]"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    className="h-9 rounded-lg px-2 text-sm text-[rgba(39,37,30,0.45)] underline-offset-2 hover:underline"
                  >
                    Save pattern
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[72px_1fr] gap-3 text-sm">
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[rgba(39,37,30,0.42)]">
        {label}
      </span>
      <span className="text-[rgba(39,37,30,0.68)]">{value}</span>
    </div>
  );
}
