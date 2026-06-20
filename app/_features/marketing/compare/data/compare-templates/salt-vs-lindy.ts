import type { ComparePageTemplate } from "./types";

export const SALT_VS_LINDY_COMPARE_TEMPLATE: ComparePageTemplate = {
  slug: "salt-vs-lindy",
  compareHero: {
    headline: "Salt vs Lindy",
    thesis:
      "Lindy is a workshop for building AI agents. Salt shows up already knowing what to build, for people who want the work done instead of another canvas.",
    bullets: [
      "Salt suggests and builds plays from your business — or builds ones you suggest.",
      "Connect your tools once. No per-agent setup.",
      "Plays surface work you never thought to automate",
      "Finished work with context, ready for your approval",
    ],
  },
  compareFeatureTable: {
    competitorLabel: "Lindy",
    rows: [
      {
        label: "Core product",
        competitorValue: "Build and run AI agents",
        saltValue: "Finished work, waiting for your okay",
      },
      {
        label: "Starting point",
        competitorValue: "Blank canvas — pick triggers, connect tools, design flows",
        saltValue: "Salt suggests and builds plays from your business",
      },
      {
        label: "How plays get built",
        competitorValue: "You design and debug every workflow in the builder",
        saltValue: "Salt suggests and builds automatically — or builds what you suggest",
      },
      {
        label: "Finds work you did not assign",
        competitorValue: "No, agents run what you built",
        saltValue: "Yes, that is the core of the product",
      },
      {
        label: "What you review each day",
        competitorValue: "Agent builder and run logs",
        saltValue: "Drafts, context, and evidence — not a canvas",
      },
      {
        label: "Built for",
        competitorValue: "People who enjoy designing systems",
        saltValue: "Owners who want ops invisible",
      },
    ],
  },
  compareHiddenCosts: {
    heading: "Hidden Costs",
    items: [
      {
        title: "Credit overages",
        body: "Plans include a fixed monthly credit pool. Heavy usage, retries, and debugging can burn through credits before the month ends — then agents pause until the next cycle or you buy more.",
      },
      {
        title: "Premium actions",
        body: "Many useful workflows rely on premium actions. Reviewers say the free tier is too limited to evaluate what you would actually run day to day.",
      },
      {
        title: "Failed runs still cost",
        body: "When an agent errors, loops, or misfires, those runs still consume credits even when no useful work gets done.",
      },
      {
        title: "Per-agent setup",
        body: "Each new workflow means picking triggers, connecting tools, and tuning prompts. That builder time does not show up on the invoice, but it is real labor.",
      },
      {
        title: "Unpredictable monthly total",
        body: "The listed plan price is a floor. G2 reviewers frequently cite credits as the reason the real monthly cost is hard to forecast.",
      },
      {
        title: "Experimentation tax",
        body: "Because every test run spends credits, teams often hesitate to iterate — the opposite of what you want from a tool meant to save time.",
      },
    ],
  },
  compareNarrative: {
    introTitle: "Why Salt is the #1 alternative to Lindy",
    introSubtitle:
      "Independent professionals are comparing agent builders to proactive operators. Here are a few reasons why Salt fits a different job.",
    featureBlocks: [
      {
        title: "Operational work without building agents",
        accent: "violet",
        visualPlacement: "right",
        visual: {
          visualKind: "screenshot",
          screenshotSrc: "/compare/lindy/platform-builder.png",
          screenshotAlt: "Lindy workflow builder for designing AI agents",
          screenshotCaption: "Screenshot from Lindy's verified G2 product profile.",
        },
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
        accent: "sky",
        visualPlacement: "left",
        visual: { visualKind: "mock", mockKey: "connect" },
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
        accent: "blush",
        visualPlacement: "right",
        visual: { visualKind: "mock", mockKey: "morning" },
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
    closingTitle: "The bottom line",
    closingParagraphs: [
      "If your idea of a great Saturday is designing automation flows, Lindy will make you happy, sincerely. But if you are a photographer, coach, consultant, or agent whose bottleneck is operations and follow-through, the workshop is not the gift it looks like.",
      "Salt was built on a different bet: you should not have to become an automation engineer to get the benefits of one. Connect your tools, and the plays start coming to you.",
    ],
    closingCtaLabel: "Join the waitlist",
    closingCtaHref: "#waitlist",
  },
  compareUserReviews: {
    competitorName: "Lindy",
    g2ReviewsUrl: "https://www.g2.com/products/lindy-lindy/reviews",
    g2ProductUrl: "https://www.g2.com/products/lindy-lindy",
    platformScreenshotsCaption:
      "Screenshots from Lindy's verified G2 product profile (Lindy Media).",
    platformScreenshots: [
      {
        src: "/compare/lindy/platform-home.png",
        alt: "Lindy app home showing a grid of AI agent templates by role",
      },
      {
        src: "/compare/lindy/platform-builder.png",
        alt: "Lindy interface for building a custom AI agent workflow",
      },
    ],
    highlights: [
      {
        title: "Unpredictable credit costs",
        body: "G2 reviewers often cite credit-based pricing as a top complaint. Complex tasks, retries, and errors can burn through credits quickly, which makes the real monthly cost hard to forecast.",
      },
      {
        title: "Complex setup and debugging",
        body: "Reviewers say simple agents are easy to start, but multi-step workflows take time to design, test, and stabilize. When something breaks, debugging can feel like guesswork.",
      },
      {
        title: "You still have to build it",
        body: "Users praise Lindy for what it can automate, but many note the platform assumes you will design every workflow, connect every tool, and tune prompts yourself.",
      },
    ],
  },
  faq: {
    heading: "FAQ",
    items: [
      {
        question: "Is Salt more powerful than Lindy?",
        answer:
          "They optimize for different things. Lindy maximizes what a motivated builder can construct. Salt maximizes what gets done with no builder at all. For an independent professional without ops staff, the second number is usually the one that matters.",
      },
      {
        question: "Can Salt do custom workflows like Lindy?",
        answer:
          "Yes — without the builder. Salt suggests and builds plays from your connected business automatically, and you can suggest your own in plain language and Salt builds those too. Playbooks cover repeatables Salt keeps running. Lindy hands you a canvas to design and debug; Salt implements either way.",
      },
    ],
  },
};
