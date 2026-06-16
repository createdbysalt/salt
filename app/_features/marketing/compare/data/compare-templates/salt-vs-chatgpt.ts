import type { ComparePageTemplate } from "./types";

export const SALT_VS_CHATGPT_COMPARE_TEMPLATE: ComparePageTemplate = {
  slug: "salt-vs-chatgpt",
  compareHero: {
    headline: "Salt vs ChatGPT",
    thesis:
      "ChatGPT answers brilliantly when you ask. Salt does the work you never knew to ask for — connected to your real business, while you are out.",
    bullets: [
      "ChatGPT starts every session from zero; Salt starts from your connected tools",
      "Salt notices silent leads, scope creep, and overdue invoices for you",
      "Drafts land in your voice, ready to approve — not copy-paste homework",
      "Proactive plays across email, calendar, payments, and files",
    ],
  },
  compareFeatureTable: {
    competitorLabel: "ChatGPT",
    rows: [
      {
        label: "Knows your business",
        competitorValue: "Only what you paste in",
        saltValue: "Connected to your real tools and history",
      },
      {
        label: "Starts work",
        competitorValue: "When you ask",
        saltValue: "When the business needs it",
      },
      {
        label: "Finds problems you missed",
        competitorValue: "No",
        saltValue: "Yes, that is the core of the product",
      },
      {
        label: "Sends, files, schedules, invoices",
        competitorValue: "No — you copy and paste",
        saltValue: "Yes, in your tools, after your quick okay",
      },
      {
        label: "What you need to know",
        competitorValue: "What to ask and how to ask it",
        saltValue: "Nothing — Salt proposes the play",
      },
      {
        label: "Between sessions",
        competitorValue: "Forgets",
        saltValue: "Keeps working",
      },
    ],
  },
  compareHiddenCosts: {
    heading: "Hidden costs",
    items: [
      {
        title: "The awareness tax",
        body: "You have to notice the problem, know what to ask, paste the context, and ship the output yourself. ChatGPT is fast in the middle; you pay for everything around it.",
      },
      {
        title: "Prompting skill ceiling",
        body: "Better prompts help, but they cannot fix missing awareness. You cannot ask about the silent lead you have not noticed or the workflow you do not know exists.",
      },
      {
        title: "Copy-paste workflow",
        body: "Every send, file, schedule, and invoice still happens manually in your tools. The AI saves typing, not the operational chain.",
      },
      {
        title: "No business memory",
        body: "Unless you rebuild context each session, ChatGPT does not know your clients, your pipeline, or what happened last Tuesday.",
      },
      {
        title: "Plus subscription stacking",
        body: "Many owners run ChatGPT Plus for thinking and still need separate tools for CRM, invoicing, and follow-up — the assistant does not replace the stack.",
      },
      {
        title: "Always waiting for you",
        body: "While you are with clients, on a shoot, or on a plane, the chat window is idle. Nothing moves until you come back and ask.",
      },
    ],
  },
  compareNarrative: {
    introTitle: "Why Salt is the #1 alternative to ChatGPT for running your business",
    introSubtitle:
      "ChatGPT is extraordinary at answering. Running a solo service business is mostly about noticing, deciding, and doing — not typing.",
    featureBlocks: [
      {
        title: "The knowledge gap nobody talks about",
        accent: "violet",
        visualPlacement: "right",
        visual: { visualKind: "mock", mockKey: "morning" },
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
        accent: "sky",
        visualPlacement: "left",
        visual: { visualKind: "mock", mockKey: "plays" },
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
        accent: "blush",
        visualPlacement: "right",
        visual: { visualKind: "mock", mockKey: "connect" },
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
    closingTitle: "The bottom line",
    closingParagraphs: [
      "We use ChatGPT constantly and we are not asking you to quit it. We are asking a harder question: who is running the operations of your business while you are with clients?",
      "Salt was built so the work does not wait for you. Connect your tools, and the plays start coming to you.",
    ],
    closingCtaLabel: "Join the waitlist",
    closingCtaHref: "#waitlist",
  },
  compareUserReviews: {
    competitorName: "ChatGPT",
    g2ReviewsUrl: "https://www.g2.com/products/chatgpt/reviews",
    g2ProductUrl: "https://www.g2.com/products/chatgpt",
    highlights: [
      {
        title: "Brilliant answers, manual follow-through",
        body: "G2 reviewers consistently praise ChatGPT for writing, reasoning, and speed — and note that outputs still require human judgment, fact-checking, and manual steps to land in real workflows.",
      },
      {
        title: "No native business context",
        body: "Category summaries on G2 highlight a recurring theme: unless you supply context every session, the assistant does not know your clients, tools, or history — fine for drafting, limiting for operations.",
      },
      {
        title: "General-purpose, not proactive",
        body: "Reviewers rate ChatGPT highly as an AI assistant but distinguish it from systems that monitor inboxes, trigger workflows, or act inside business software without a prompt.",
      },
    ],
  },
  faq: {
    heading: "FAQ",
    items: [
      {
        question: "Can ChatGPT do what Salt does?",
        answer:
          "ChatGPT can produce similar text if you notice the need, supply all the context, and send the result yourself. It cannot watch your business, catch what you missed, act inside your tools, or work while you are away. That is the difference between a reactive assistant and a proactive system.",
      },
      {
        question: "Is Salt built on the same AI technology?",
        answer:
          "Salt uses leading AI models as one layer of a larger system. The product is the layers around the model: a memory of your business, connections to your tools, and an engine that decides what needs doing and prepares it for your approval.",
      },
      {
        question: "I am good at prompting. Do I still need Salt?",
        answer:
          "Prompting skill narrows the gap but does not close it. The constraint is not phrasing — it is awareness. You cannot prompt about the silent lead you have not noticed or the workflow you do not know exists. Salt's job is to see those for you.",
      },
    ],
  },
};
