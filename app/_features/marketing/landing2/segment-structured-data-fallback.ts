import type { HomepageStructuredDataFaq } from "@/app/_lib/sanity/types";
import type { SegmentLandingSlug } from "./segment-landings";

const SEGMENT_STRUCTURED_DATA_FAQS: Record<
  SegmentLandingSlug,
  HomepageStructuredDataFaq[]
> = {
  photographers: [
    {
      question: "Who is Salt for photographers?",
      answer:
        "Salt is for photographers and studio owners who need inquiries answered, galleries delivered, albums upsold, and edit backlogs organized while they are on shoots.",
    },
    {
      question: "Is Salt a CRM for photography workspaces?",
      answer:
        "No. Salt is a proactive AI operating layer that reads your connected tools and prepares studio follow-through for your approval. It is not a replacement CRM.",
    },
    {
      question: "Does Salt act without my approval?",
      answer:
        "No. Salt is approval-first. It drafts replies, follow-ups, and upsell steps, then waits for you to review before anything goes out.",
    },
  ],
  coaches: [
    {
      question: "Who is Salt for coaches?",
      answer:
        "Salt is for coaches who are strong in session but buried in proposals, recaps, check-ins, and renewals between calls.",
    },
    {
      question: "Will Salt write my client recaps?",
      answer:
        "Salt drafts recaps and follow-through from your session context and connected tools. You review and approve before anything is sent.",
    },
    {
      question: "Does Salt replace a virtual assistant?",
      answer:
        "Salt handles repeatable follow-through across your practice with business context, not generic task delegation. High-stakes actions still wait for your approval.",
    },
  ],
  consultants: [
    {
      question: "Who is Salt for consultants?",
      answer:
        "Salt is for independent consultants who need pipeline follow-up, change orders, and dormant leads handled while they are doing billable delivery work.",
    },
    {
      question: "How does Salt help when I am mid-engagement?",
      answer:
        "Salt keeps proposals, silent threads, and next-step outreach moving in the background so the next engagement is warm when the current one ends.",
    },
    {
      question: "Is Salt another CRM?",
      answer:
        "No. Salt reads your business context across connected accounts, prepares the next action, and waits for approval. It is an operating layer, not a CRM replacement.",
    },
  ],
  "real-estate-agents": [
    {
      question: "Who is Salt for real estate agents?",
      answer:
        "Salt is for agents who need fast lead response, sphere nurture between transactions, and contract deadline tracking without hiring an assistant.",
    },
    {
      question: "How fast does Salt respond to new leads?",
      answer:
        "Salt is built for speed-to-lead workflows so new inquiries get a relevant reply with listings and showing context in about 90 seconds.",
    },
    {
      question: "Does Salt charge per lead?",
      answer:
        "Salt is a proactive AI operating layer for your business, not a per-lead portal product. Pricing is tied to the product waitlist and launch plans.",
    },
  ],
};

export function resolveSegmentStructuredDataFaqs(
  slug: SegmentLandingSlug,
  faqs?: HomepageStructuredDataFaq[] | null
): HomepageStructuredDataFaq[] {
  const resolved =
    faqs
      ?.filter((item) => item.question?.trim() && item.answer?.trim())
      .map((item) => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
      })) ?? [];

  if (resolved.length > 0) {
    return resolved;
  }

  return SEGMENT_STRUCTURED_DATA_FAQS[slug];
}
