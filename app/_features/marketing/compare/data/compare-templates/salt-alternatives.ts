import type { ComparePageTemplate } from "./types";

export const SALT_ALTERNATIVES_COMPARE_TEMPLATE: ComparePageTemplate = {
  slug: "salt-alternatives",
  compareHero: {
    headline: "Salt alternatives: an honest guide",
    thesis:
      "Every alternative below does something well. This map tells you what each one is for — and where Salt fits if you want the work done while you are out.",
    bullets: [
      "Agent builders if you enjoy designing automations",
      "CRMs if you want an organized place to do admin manually",
      "ChatGPT if you want answers on demand",
      "Salt if you want proactive work across your whole business",
    ],
  },
  alternativesGrid: {
    heading: "Your real alternatives",
    intro:
      "Salt connects to the tools your business already runs on, figures out what needs to happen next, does the work, and brings it back finished while you are out. You glance at the result before it goes anywhere. Here is how that compares to the usual options.",
    entries: [
      {
        title: "AI agent builders (Lindy, Zapier AI, Make)",
        strengths:
          "Enormous flexibility. If you can imagine an automation, you can probably build it. Deep integration catalogs and mature platforms.",
        gap: "You are the architect. These tools wait for you to know which workflow to build, design it, test it, and maintain it when it breaks. Most independents do not know which automations would move the needle — that knowledge gap, not the tooling, is why projects stall.",
        cta: { label: "Full comparison: Salt vs Lindy", href: "/compare/salt-vs-lindy" },
      },
      {
        title: "Chat-based AI coworkers (Viktor and similar)",
        strengths:
          'A clear "AI that does work" promise and a comfortable home inside the chat tools teams already use.',
        gap: "Built around chat — strongest when work arrives as a message. Silent leads, unbilled scope, and missed deadlines often never show up as a ping. Salt watches email, calendar, payments, and files and starts work nobody assigned.",
        cta: { label: "Full comparison: Salt vs Viktor", href: "/compare/salt-vs-viktor" },
      },
      {
        title: "Client management platforms (HoneyBook, Dubsado, 17hats)",
        strengths:
          "Solid pipelines, proposals, contracts, and invoicing in one place. Mature products with big communities.",
        gap: "Filing cabinets with workflows — well-organized places where you still do the work. The follow-up still gets written by you. Scope creep still gets caught by you, or it does not.",
      },
      {
        title: "ChatGPT and general AI assistants",
        strengths: "Almost anything you ask, brilliantly.",
        gap: "Reactive AI gives you exactly what you already know how to request. It does not know your clients, see your inbox, or act in your tools. You notice, decide, ask, and paste the result where it belongs.",
        cta: { label: "Full comparison: Salt vs ChatGPT", href: "/compare/salt-vs-chatgpt" },
      },
      {
        title: "Hiring a virtual assistant",
        strengths: "Human judgment, phone calls, and tasks that need hands. A great VA is genuinely great.",
        gap: "$800 to $1,500 a month for part-time help, plus hiring, training, managing, and context that walks out the door if they leave. You become a manager — the job you were trying to escape.",
        cta: {
          label: "Full comparison: Salt vs hiring a VA",
          href: "/compare/salt-vs-hiring-a-va",
        },
      },
    ],
  },
  compareNarrative: {
    introTitle: "The honest bottom line",
    introSubtitle:
      "Every alternative shares one assumption: you are the engine. Salt is built on the opposite assumption.",
    featureBlocks: [],
    closingTitle: "If you want the work done while you are out",
    closingParagraphs: [
      "Every alternative above shares one assumption: you are the engine. You design the automation, send the chat message, work the CRM, write the prompt, or manage the assistant. The tools differ; the assumption does not.",
      "Salt is built on the opposite assumption. The business state comes first, the thinking comes from Salt, and the work arrives finished, waiting for your quick okay. If you want a tool to use, any of the products above is a reasonable choice. If you want the work done while you are out, that is Salt.",
    ],
    closingCtaLabel: "Join the waitlist",
    closingCtaHref: "#waitlist",
  },
  faq: {
    heading: "FAQ",
    items: [
      {
        question: "What is the best alternative to Salt?",
        answer:
          "It depends on what you want to keep doing yourself. Lindy if you enjoy building automations. HoneyBook or Dubsado if you want an organized place to do client admin manually. ChatGPT if you want answers on demand. A VA if you need a human. If you want the work itself done proactively across your whole business, there is no direct equivalent to Salt today; the closest categories are agent builders and chat coworkers, compared above.",
      },
      {
        question: "Is Salt a CRM replacement?",
        answer:
          "No. Salt connects to your existing tools, including CRMs, and does the work inside them. Some users simplify their stack after adopting Salt, but replacing your CRM is not required.",
      },
      {
        question: "Does Salt act without my permission?",
        answer:
          "Salt prepares the work and routine items run on rails you approve once. Anything outward-facing waits for your quick review — about 90 seconds a day. You stay in control without doing the work.",
      },
    ],
  },
};
