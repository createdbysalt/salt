import type { CompareNarrativeConfig } from "../types";

export const saltVsChatgptNarrative: CompareNarrativeConfig = {
  intro: {
    title: "Why Salt is the #1 alternative to ChatGPT for running your business",
    subtitle:
      "ChatGPT is extraordinary at answering. Running a solo service business is mostly about noticing, deciding, and doing — not typing.",
  },
  featureBlocks: [
    {
      title: "The knowledge gap nobody talks about",
      visual: { kind: "mock", key: "morning" },
      accent: "violet",
      visualPlacement: "right",
      points: [
        {
          lead: "You do the chain",
          body: "Notice the problem, know what to ask, feed context, take the output, paste it into Gmail, send, log it, remember to check back. ChatGPT shines for thirty seconds in the middle.",
        },
        {
          lead: "Infinite prompts do not close the gap",
          body: "Most owners do not know which workflows would change their business or what to automate. A blank chat box does not teach you that.",
        },
        {
          lead: "Reactive by design",
          body: "ChatGPT gives you exactly what you already know how to request — and nothing else.",
        },
      ],
    },
    {
      title: "What Salt does instead",
      visual: { kind: "mock", key: "plays" },
      accent: "sky",
      visualPlacement: "left",
      points: [
        {
          lead: "Notices",
          body: "The proposal that went silent, the scope that crept, the invoice that is ready, the client going quiet — across connected tools, not pasted threads.",
        },
        {
          lead: "Decides and does",
          body: "Follow-ups in your voice, change orders with your pricing, kickoff briefs, invoices — prepared inside your stack.",
        },
        {
          lead: "Brings it back finished",
          body: "You glance, you approve, it goes. About 90 seconds of your day.",
        },
      ],
    },
    {
      title: "Keep ChatGPT — that is not the question",
      visual: { kind: "mock", key: "connect" },
      accent: "blush",
      visualPlacement: "right",
      points: [
        {
          lead: "Different jobs",
          body: "Plenty of Salt users will keep ChatGPT for thinking, drafting, and exploring ideas. The question is narrower: who runs operations while you are out?",
        },
        {
          lead: "Models vs system",
          body: "Salt uses leading AI as one layer. The product is memory of your business, tool connections, and an engine that decides what needs doing.",
        },
        {
          lead: "Waiting vs working",
          body: "A chat window cannot run your business no matter how smart it gets — because it waits for you to come back and ask.",
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
            We use ChatGPT constantly and we are not asking you to quit it. We are asking a
            harder question: who is running the operations of your business while you are with
            clients?
          </>
        ),
      },
      {
        type: "paragraph",
        content: (
          <>
            Salt was built so the work does not wait for you. Connect your tools, and the plays
            start coming to you.
          </>
        ),
      },
    ],
    cta: { label: "Join the waitlist", href: "#waitlist" },
  },
};
