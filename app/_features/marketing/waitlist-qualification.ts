export type WaitlistStepType = "single" | "multi";

export type WaitlistQualOption = {
  value: string;
  label: string;
};

export type WaitlistQualStep = {
  eyebrow?: string;
  title: string;
  field: string;
  type: WaitlistStepType;
  helpText?: string;
  options?: readonly WaitlistQualOption[];
};

export const WAITLIST_QUAL_STEPS: readonly WaitlistQualStep[] = [
  {
    eyebrow: "Join the Salt waitlist",
    title: "What's your primary business?",
    field: "primaryBusiness",
    type: "single",
    options: [
      { value: "creative-services", label: "Creative services" },
      { value: "coaching", label: "Coaching" },
      { value: "real-estate", label: "Real estate" },
      { value: "consulting", label: "Consulting" },
      { value: "financial-advisor", label: "Financial advisor" },
      { value: "wellness-therapy", label: "Wellness / therapy" },
      { value: "wedding-industry", label: "Wedding industry" },
      { value: "other", label: "Other" },
    ],
  },
  {
    title: "Annual revenue range?",
    field: "annualRevenue",
    type: "single",
    options: [
      { value: "50k-100k", label: "$50K–$100K" },
      { value: "100k-200k", label: "$100K–$200K" },
      { value: "200k-plus", label: "$200K+" },
      { value: "below-50k", label: "Below $50K" },
      { value: "prefer-not-to-say", label: "Prefer not to say" },
    ],
  },
  {
    title: "Biggest operational bottleneck?",
    field: "operationalBottleneck",
    type: "single",
    options: [
      { value: "follow-ups-slip", label: "Follow-ups slip" },
      { value: "invoicing-slow", label: "Invoicing takes forever" },
      { value: "growth-unclear", label: "Don't know what growth is worth" },
      { value: "crm-empty", label: "CRM stays empty" },
      { value: "context-lost", label: "Context gets lost" },
      { value: "other", label: "Other" },
    ],
  },
  {
    title: "Which tools do you use regularly?",
    field: "tools",
    type: "multi",
    helpText: "Pick at least one tool.",
    options: [
      { value: "stripe", label: "Stripe / payments" },
      { value: "calendar", label: "Google / Outlook Calendar" },
      { value: "email", label: "Gmail / email" },
      { value: "notion", label: "Notion" },
      { value: "clickup", label: "ClickUp" },
      { value: "crm", label: "CRM" },
      { value: "other", label: "Other" },
    ],
  },
  {
    title: "How did you hear about Salt?",
    field: "hearAbout",
    type: "single",
    options: [
      { value: "word-of-mouth", label: "Friend or colleague" },
      { value: "social", label: "Social media" },
      { value: "search", label: "Search engine" },
      { value: "podcast-video", label: "Podcast or video" },
      { value: "newsletter", label: "Newsletter or blog" },
      { value: "other", label: "Other" },
    ],
  },
];

export const WAITLIST_TOTAL_STEPS = WAITLIST_QUAL_STEPS.length;

export function isValidWaitlistEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function getWaitlistEmailValidationMessage(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Add your email to join the waitlist.";
  if (!isValidWaitlistEmail(trimmed)) {
    return "That doesn't look like an email address.";
  }
  return null;
}
