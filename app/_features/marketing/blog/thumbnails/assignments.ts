import type { BlogThumbSpec } from "./templates";

/** Template + palette + thematic motif per article. */
export const blogThumbAssignments = {
  "introducing-supabase": {
    template: "codeWindow",
    palette: "ink",
    motif: "supabaseDatabase",
  },
  "how-to-price-your-projects": {
    template: "diagonalBlocks",
    palette: "cobalt",
    motif: "pricingTag",
  },
  "when-to-say-no-to-a-client": {
    template: "dotGrid",
    palette: "coral",
    motif: "declineProject",
  },
  "set-boundaries-before-the-project-starts": {
    template: "circleField",
    palette: "forest",
    motif: "boundaryContract",
  },
  "how-salt-drafts-proposals-and-followups": {
    template: "uiCollage",
    palette: "mint",
    motif: "proposalEmail",
  },
  "salt-reads-your-business": {
    template: "symbolCollage",
    palette: "cobalt",
    motif: "businessInsights",
  },
  "from-hired-hand-to-trusted-partner": {
    template: "diagonalBlocks",
    palette: "lilac",
    motif: "partnerTrust",
  },
  "what-is-proactive-ai": {
    template: "neonStreak",
    palette: "ink",
    motif: "proactiveRadar",
  },
  "proactive-ai-vs-reactive-ai": {
    template: "splitCompare",
    left: "sand",
    right: "cobalt",
    leftMotif: "reactiveIdle",
    rightMotif: "proactiveActive",
  },
  "how-proactive-ai-automates-operations": {
    template: "codeWindow",
    palette: "forest",
    motif: "automationPipeline",
  },
  "proactive-ai-examples-business": {
    template: "uiCollage",
    palette: "rose",
    motif: "examplesGrid",
  },
  "best-ai-tools-small-business": {
    template: "circleField",
    palette: "ink",
    motif: "toolsToolbox",
  },
  "what-can-proactive-ai-do": {
    template: "symbolCollage",
    palette: "lilac",
    motif: "capabilitiesHub",
  },
  "future-of-proactive-ai-trends": {
    template: "neonStreak",
    palette: "lilac",
    motif: "trendsForward",
  },
  "proactive-ai-vs-chatbot": {
    template: "splitCompare",
    left: "mint",
    right: "coral",
    leftMotif: "chatbotWaiting",
    rightMotif: "proactiveTasks",
  },
  "salt-vs-lindy": {
    template: "splitCompare",
    left: "sand",
    right: "cobalt",
    leftMotif: "lindyAgentBuilder",
    rightMotif: "saltWorkDone",
  },
  "salt-vs-viktor": {
    template: "splitCompare",
    left: "rose",
    right: "ink",
    leftMotif: "viktorCoworker",
    rightMotif: "saltBusinessOps",
  },
  "salt-vs-chatgpt": {
    template: "splitCompare",
    left: "mint",
    right: "forest",
    leftMotif: "chatgptAnswers",
    rightMotif: "saltExecutes",
  },
  "salt-vs-hiring-a-va": {
    template: "splitCompare",
    left: "sand",
    right: "forest",
    leftMotif: "vaEmptyDesk",
    rightMotif: "saltAlwaysOn",
  },
  "salt-alternatives": {
    template: "lineGrid",
    palette: "cobalt",
    motif: "alternativesFork",
  },
  "salt-pricing": {
    template: "pricingCard",
    palette: "sand",
    motif: "pricingFlat",
  },
} as const satisfies Record<string, BlogThumbSpec>;

export type BlogThumbSlug = keyof typeof blogThumbAssignments;
