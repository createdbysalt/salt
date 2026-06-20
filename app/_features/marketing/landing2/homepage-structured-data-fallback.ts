import type { HomepageStructuredDataFaq } from "@/app/_lib/sanity/types";

export const HOMEPAGE_STRUCTURED_DATA_FAQS_FALLBACK: HomepageStructuredDataFaq[] =
  [
    {
      question: "Who is Salt for?",
      answer:
        "Salt is for independent professionals who run client-shaped businesses and want their context, follow-through, and next steps prepared in one place.",
    },
    {
      question: "Is Salt another CRM or chatbot?",
      answer:
        "No. Salt is a proactive AI operating layer. It reads what changed across your business, prepares the next action, and waits for approval.",
    },
    {
      question: "Does Salt act without approval?",
      answer:
        "No. Salt is approval-first. It can draft and recommend work, but high-stakes actions stay queued for review.",
    },
    {
      question: "What does the waitlist unlock?",
      answer:
        "The waitlist is for early access to upcoming Salt cohorts as the product opens to more independent professionals.",
    },
  ];

export function resolveHomepageStructuredDataFaqs(
  faqs?: HomepageStructuredDataFaq[] | null
): HomepageStructuredDataFaq[] {
  const resolved =
    faqs
      ?.filter((item) => item.question?.trim() && item.answer?.trim())
      .map((item) => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
      })) ?? [];

  return resolved.length > 0
    ? resolved
    : HOMEPAGE_STRUCTURED_DATA_FAQS_FALLBACK;
}
