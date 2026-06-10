/**
 * Brand Onboarding Template
 *
 * Checklist items for onboarding clients who signed up for brand/identity projects.
 */

import type { OnboardingTemplate } from "../types";

export const brandOnboardingTemplate: OnboardingTemplate = {
  name: "brand-onboarding",
  description: "Standard onboarding checklist for brand identity projects",
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
      id: "discovery-call",
      title: "Book discovery call",
      description: "Schedule a 45-minute discovery session to dive deep into your brand vision.",
      required: true,
      order: 2,
      type: "booking",
    },
    {
      id: "brand-questionnaire",
      title: "Complete brand questionnaire",
      description: "Fill out our comprehensive brand discovery questionnaire.",
      required: true,
      order: 3,
      type: "form",
    },
    {
      id: "competitor-analysis",
      title: "Share competitor info",
      description: "List your main competitors and what makes you different from them.",
      required: true,
      order: 4,
      type: "task",
    },
    {
      id: "inspiration-board",
      title: "Create inspiration board",
      description: "Collect visual inspiration that resonates with your brand vision (Pinterest, mood boards, etc.).",
      required: false,
      order: 5,
      type: "task",
    },
    {
      id: "existing-materials",
      title: "Upload existing materials",
      description: "Share any existing brand materials, logos, or design assets.",
      required: false,
      order: 6,
      type: "upload",
    },
    {
      id: "target-audience",
      title: "Define target audience",
      description: "Provide details about your ideal customers and target market.",
      required: true,
      order: 7,
      type: "task",
    },
    {
      id: "portal-access",
      title: "Access Spaces",
      description: "Log in to Spaces to track project progress.",
      required: false,
      order: 8,
      type: "link",
    },
  ],
};
