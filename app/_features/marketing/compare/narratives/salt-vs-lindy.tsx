import type { CompareNarrativeConfig } from "../types";

export const saltVsLindyNarrative: CompareNarrativeConfig = {
  intro: {
    title: "Why Salt is the #1 alternative to Lindy",
    subtitle:
      "Independent professionals are comparing agent builders to proactive operators. Here are a few reasons why Salt fits a different job.",
  },
  featureBlocks: [
    {
      title: "Operational work without building agents",
      visual: {
        kind: "screenshot",
        src: "/compare/lindy/platform-builder.png",
        alt: "Lindy workflow builder for designing AI agents",
        caption: "Screenshot from Lindy's verified G2 product profile.",
      },
      accent: "violet",
      visualPlacement: "right",
      points: [
        {
          lead: "No workflow design required",
          body: "Lindy asks you to pick triggers, connect tools, and design flows. Salt reads your connected accounts, suggests plays you would never think to set up, and builds them — or builds ones you suggest in plain language.",
        },
        {
          lead: "The blank canvas problem",
          body: "You cannot automate a workflow you do not know you need. Salt surfaces scope creep, cold leads, and overdue invoices before you have to remember to check.",
        },
        {
          lead: "One product, two jobs",
          body: "Lindy is a workshop for people who love systems. Salt is for owners who need outcomes — not another canvas to design, babysit, and debug.",
        },
      ],
    },
    {
      title: "Usage credits add friction",
      visual: { kind: "mock", key: "connect" },
      accent: "sky",
      visualPlacement: "left",
      points: [
        {
          lead: "Credits drain while you debug",
          body: "Lindy runs on credits. Failed runs, retries, and experiments eat your balance without delivering finished work.",
        },
        {
          lead: "The real bill is hard to forecast",
          body: "Reviewers cite unpredictable monthly totals as a top frustration — the sticker price is a floor, not the plan.",
        },
        {
          lead: "You start rationing the tool",
          body: "When every test run has a cost, owners hesitate to debug flows, try new automations, or leave agents on — the platform becomes something you manage instead of something that works for you.",
        },
      ],
    },
    {
      title: "The work shows up finished",
      visual: { kind: "mock", key: "morning" },
      accent: "blush",
      visualPlacement: "right",
      points: [
        {
          lead: "Connect once, plays follow",
          body: "Salt links email, calendar, meetings, payments, and files — then suggests and builds plays from what it sees. Have your own idea? Suggest it; Salt builds and keeps that working too.",
        },
        {
          lead: "Review in about 90 seconds",
          body: "Routine plays you trust run on their own. Everything high-stakes waits for your approval before it goes out.",
        },
        {
          lead: "You never see a canvas",
          body: "With Lindy, the product is the ability to automate. With Salt, the product is the work, done.",
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
            If your idea of a great Saturday is designing automation flows, Lindy will make
            you happy, sincerely. But if you are a photographer, coach, consultant, or agent
            whose bottleneck is operations and follow-through, the workshop is not the gift
            it looks like.
          </>
        ),
      },
      {
        type: "paragraph",
        content: (
          <>
            Salt was built on a different bet: you should not have to become an automation
            engineer to get the benefits of one. Connect your tools, and the plays start
            coming to you.
          </>
        ),
      },
    ],
    cta: {
      label: "Join the waitlist",
      href: "#waitlist",
    },
  },
};
