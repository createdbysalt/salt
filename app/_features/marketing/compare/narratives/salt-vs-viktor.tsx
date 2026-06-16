import type { CompareNarrativeConfig } from "../types";

export const saltVsViktorNarrative: CompareNarrativeConfig = {
  intro: {
    title: "Why Salt is the #1 alternative to Viktor",
    subtitle:
      "Chat coworkers and proactive operators both promise to take work off your plate. They optimize for different shapes of work.",
  },
  featureBlocks: [
    {
      title: "Your business is not a chat thread",
      visual: { kind: "mock", key: "connect" },
      accent: "violet",
      visualPlacement: "right",
      points: [
        {
          lead: "Chat is where you talk about work",
          body: "Viktor lives in Slack or Teams — comfortable if your team already coordinates there. Most solo businesses run on email, calendar, payments, and client relationships that never hit a channel.",
        },
        {
          lead: "Silent problems stay silent",
          body: "The proposal that went quiet, the scope that crept, the invoice you forgot to send — none of that arrives as a message to react to. Salt watches the tools where those problems actually live.",
        },
        {
          lead: "Standalone, not embedded",
          body: "Salt is its own system connected to your stack. You do not need a team chat culture for it to work.",
        },
      ],
    },
    {
      title: "Proactive vs assigned",
      visual: { kind: "mock", key: "plays" },
      accent: "sky",
      visualPlacement: "left",
      points: [
        {
          lead: "Viktor waits for the thread",
          body: "You @mention Viktor, drop a task, or accept a suggestion in chat. Strong for teams that already delegate in Slack.",
        },
        {
          lead: "Salt waits for the business signal",
          body: "Salt reads connected accounts and proposes plays — including ones you would never have thought to assign — then builds them.",
        },
        {
          lead: "You review outcomes, not conversations",
          body: "With Salt, the product is finished work with context. With a chat coworker, the product is often another thread to follow.",
        },
      ],
    },
    {
      title: "Built for owners, not channels",
      visual: { kind: "mock", key: "morning" },
      accent: "blush",
      visualPlacement: "right",
      points: [
        {
          lead: "No team required",
          body: "Viktor is designed for teams in shared chat. Salt is built for the independent professional who is the whole ops department.",
        },
        {
          lead: "About 90 seconds a day",
          body: "Routine plays run on rails you trust. Everything outward-facing waits for your quick approval.",
        },
        {
          lead: "The whole business, not the loudest ping",
          body: "Chat optimizes for what gets mentioned. Salt optimizes for what actually costs you money.",
        },
      ],
    },
  ],
  closing: {
    title: "The bottom line",
    blocks: [
      {
        type: "paragraph",
        content: (
          <>
            If your team already lives in Slack and you want an AI colleague in the channels,
            Viktor is a credible choice — G2&apos;s AI marketplace lists it among the leading
            autonomous coworkers for exactly that job.
          </>
        ),
      },
      {
        type: "paragraph",
        content: (
          <>
            If you are a solo service business whose bottleneck is follow-through across email,
            calendar, and payments — not chat volume — Salt is built for a different assumption:
            the work should show up finished, not as another thread to manage.
          </>
        ),
      },
    ],
    cta: { label: "Join the waitlist", href: "#waitlist" },
  },
};
