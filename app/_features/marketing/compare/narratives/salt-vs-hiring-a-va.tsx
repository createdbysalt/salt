import type { CompareNarrativeConfig } from "../types";

export const saltVsHiringAVaNarrative: CompareNarrativeConfig = {
  intro: {
    title: "Why Salt is the #1 alternative to hiring a VA",
    subtitle:
      "Virtual assistants can be genuinely great. This comparison is about what most solo owners actually need help with — and what it really costs.",
  },
  featureBlocks: [
    {
      title: "What a great VA actually costs",
      visual: { kind: "mock", key: "connect" },
      accent: "violet",
      visualPlacement: "right",
      points: [
        {
          lead: "More than the invoice",
          body: "A capable part-time VA runs $800 to $1,500 a month. Around that sits hiring, training, managing, turnover risk, and limited hours.",
        },
        {
          lead: "You become a manager",
          body: "Permanent boss duty is the hidden line item — assigning, reviewing, answering, re-explaining. That is not passive help.",
        },
        {
          lead: "Order of operations matters",
          body: "None of this makes VAs a bad idea. It makes the commitment bigger than the sticker price suggests.",
        },
      ],
    },
    {
      title: "Where humans still win",
      visual: { kind: "mock", key: "morning" },
      accent: "sky",
      visualPlacement: "left",
      points: [
        {
          lead: "Calls, charm, judgment",
          body: "Phone calls, physical errands, difficult client video calls, genuinely novel situations — a human assistant still wins there.",
        },
        {
          lead: "Audit your actual week",
          body: "For most independents, the load is inbox triage, follow-ups, briefs, invoicing, filing, calendar sanity — not charm on a call.",
        },
        {
          lead: "That list is Salt's job",
          body: "Bulk digital operations with clear patterns — exactly what proactive software handles without management.",
        },
      ],
    },
    {
      title: "Salt first, human later — if ever",
      visual: { kind: "mock", key: "plays" },
      accent: "blush",
      visualPlacement: "right",
      points: [
        {
          lead: "Absorb the ops load first",
          body: "Let Salt handle inbox, follow-ups, invoicing, and noticing — for many solos that removes the reason to hire at all.",
        },
        {
          lead: "Better hire when you do",
          body: "If you grow into a human, hire for calls and relationships — with Salt running the machine underneath both of you.",
        },
        {
          lead: "Flat, always-on, no resignation",
          body: "One predictable price. No payroll. Knowledge stays when people do not.",
        },
      ],
    },
  ],
  closing: {
    title: "The honest recommendation",
    blocks: [
      {
        type: "paragraph",
        content: (
          <>
            Do it in this order: Salt first, human later, if ever. For most solo businesses that
            removes the reason to hire at all, at a fraction of the cost.
          </>
        ),
      },
      {
        type: "paragraph",
        content: (
          <>
            And if your business grows to where you do hire a human, you will hire a better job
            — not an inbox janitor, but someone for the calls, the relationships, and the
            judgment work, with Salt running the machine underneath both of you.
          </>
        ),
      },
    ],
    cta: { label: "Join the waitlist", href: "#waitlist" },
  },
};
