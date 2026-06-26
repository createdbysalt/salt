/**
 * Website Onboarding Template
 *
 * Checklist items for onboarding clients who signed up for website projects.
 */

import type { OnboardingTemplate } from "../types";

export const websiteOnboardingTemplate: OnboardingTemplate = {
  name: "website-onboarding",
  description: "Standard onboarding checklist for website design projects",
  items: [
    {
      id: "welcome",
      title: "Welcome email received",
      description: "Check your inbox for a welcome email with project details and next steps.",
      required: false,
      order: 1,
      type: "task",
    },
    {
      id: "kickoff-call",
      title: "Book kickoff call",
      description: "Schedule a 30-minute kickoff call to discuss project goals and timeline.",
      required: true,
      order: 2,
      type: "booking",
    },
    {
      id: "brand-assets",
      title: "Upload brand assets",
      description: "Share your logo, brand colors, fonts, and any existing brand guidelines.",
      required: true,
      order: 3,
      type: "upload",
    },
    {
      id: "content-brief",
      title: "Complete content brief",
      description: "Fill out the content questionnaire to help us understand your messaging.",
      required: true,
      order: 4,
      type: "form",
    },
    {
      id: "inspiration",
      title: "Share inspiration sites",
      description: "Provide 3-5 websites you admire for their design or functionality.",
      required: false,
      order: 5,
      type: "task",
    },
    {
      id: "review-timeline",
      title: "Review project timeline",
      description: "Review the proposed project timeline and milestones.",
      required: true,
      order: 6,
      type: "task",
    },
  ],
};
