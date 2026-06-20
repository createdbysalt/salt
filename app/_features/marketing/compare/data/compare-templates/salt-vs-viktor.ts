import type { ComparePageTemplate } from "./types";

export const SALT_VS_VIKTOR_COMPARE_TEMPLATE: ComparePageTemplate = {
  slug: "salt-vs-viktor",
  compareHero: {
    headline: "Salt vs Viktor",
    thesis:
      "Viktor is an AI coworker that lives in your team chat. Salt is a proactive system that watches your whole business and brings work back finished — not just when someone messages it.",
    bullets: [
      "Salt connects to email, calendar, payments, and files — not just chat",
      "Finds silent leads and scope creep before they become messages",
      "Suggests and builds plays you never thought to assign",
      "Finished drafts waiting for your approval, not chat threads to babysit",
    ],
  },
  compareFeatureTable: {
    competitorLabel: "Viktor",
    rows: [
      {
        label: "Core product",
        competitorValue: "AI coworker in Slack or Teams",
        saltValue: "Proactive operator across your business tools",
      },
      {
        label: "Where it lives",
        competitorValue: "Inside team chat",
        saltValue: "Standalone — connected to your real stack",
      },
      {
        label: "How work starts",
        competitorValue: "When someone @mentions or assigns a task",
        saltValue: "When the business needs it — nobody has to ask",
      },
      {
        label: "Finds work you did not assign",
        competitorValue: "Sometimes suggests in chat; strongest on assigned tasks",
        saltValue: "Yes, that is the core of the product",
      },
      {
        label: "Business visibility",
        competitorValue: "What you share in threads and connected tools",
        saltValue: "Email, calendar, meetings, payments, files — the whole picture",
      },
      {
        label: "Built for",
        competitorValue: "Teams already living in Slack",
        saltValue: "Solo owners who want ops invisible",
      },
    ],
  },
  compareHiddenCosts: {
    heading: "Hidden costs",
    items: [
      {
        title: "Credit-based pricing",
        body: "Viktor runs on usage credits. Heavy teams report real monthly totals well above the listed plan once daily automations, retries, and experiments add up.",
      },
      {
        title: "Slack-first dependency",
        body: "The product assumes your work arrives as chat. Revenue leaks that never become a message — silent proposals, unbilled scope, overdue invoices — stay invisible.",
      },
      {
        title: "Assignment tax",
        body: "Even a proactive coworker still orbits what someone thought to delegate. You remain the router of operational attention.",
      },
      {
        title: "Team-chat context only",
        body: "Viktor only accesses what you explicitly share in threads and mentions. Your inbox, calendar, and payment history are not the default source of truth.",
      },
      {
        title: "Platform lock-in",
        body: "As of 2026 Viktor is Slack-first with Teams still rolling out. If your business runs outside chat, the coworker is not where the work happens.",
      },
      {
        title: "Integration edge cases",
        body: "Early adopters note that complex auth and custom APIs can still fail — you spend time debugging the coworker instead of getting outcomes.",
      },
    ],
  },
  compareNarrative: {
    introTitle: "Why Salt is the #1 alternative to Viktor",
    introSubtitle:
      "Chat coworkers and proactive operators both promise to take work off your plate. They optimize for different shapes of work.",
    featureBlocks: [
      {
        title: "Your business is not a chat thread",
        accent: "violet",
        visualPlacement: "right",
        visual: { visualKind: "mock", mockKey: "connect" },
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
        accent: "sky",
        visualPlacement: "left",
        visual: { visualKind: "mock", mockKey: "plays" },
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
        accent: "blush",
        visualPlacement: "right",
        visual: { visualKind: "mock", mockKey: "morning" },
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
    closingTitle: "The bottom line",
    closingParagraphs: [
      "If your team already lives in Slack and you want an AI colleague in the channels, Viktor is a credible choice — G2's AI marketplace lists it among the leading autonomous coworkers for exactly that job.",
      "If you are a solo service business whose bottleneck is follow-through across email, calendar, and payments — not chat volume — Salt is built for a different assumption: the work should show up finished, not as another thread to manage.",
    ],
    closingCtaLabel: "Join the waitlist",
    closingCtaHref: "#waitlist",
  },
  compareUserReviews: {
    competitorName: "Viktor",
    g2ReviewsUrl: "https://ai.g2.com/marketplace/tools/viktor",
    g2ProductUrl: "https://ai.g2.com/marketplace/tools/viktor",
    highlights: [
      {
        title: "Real time savings in Slack",
        body: "G2's AI marketplace and early customer stories highlight Viktor completing multi-step tasks — reports, dashboards, code — directly from Slack with thousands of integrations. Teams praise the autonomous execution when work is already framed as a chat request.",
      },
      {
        title: "Usage credits add up",
        body: "Independent reviews on G2-adjacent sources note that credit-based pricing can climb quickly for daily use — the sticker plan is a starting point, not the ceiling, once the whole team relies on Viktor for operations.",
      },
      {
        title: "Slack-only for now",
        body: "Marketplace listings and reviewer write-ups consistently flag platform scope: Viktor is strongest inside Slack, with Microsoft Teams support still maturing. Teams outside chat-first workflows should weigh that constraint.",
      },
    ],
  },
  faq: {
    heading: "FAQ",
    items: [
      {
        question: "Is Viktor better for teams and Salt for solos?",
        answer:
          "Broadly, yes. Viktor is built as a coworker inside team chat. Salt is built for independent professionals who need proactive operations across email, calendar, payments, and files without a Slack culture or an ops team.",
      },
      {
        question: "Can Viktor watch my inbox like Salt?",
        answer:
          "Viktor connects to many tools when asked, but its home is chat. Salt treats your connected business stack as the default signal source and proposes work from what it sees there — including problems that never become a message.",
      },
      {
        question: "Do I need both?",
        answer:
          "Some growing teams may use a chat coworker for internal coordination and Salt for client-facing operations. For most solo businesses, one proactive layer that covers the whole stack is enough.",
      },
    ],
  },
};
