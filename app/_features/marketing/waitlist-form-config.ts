import type { FormDefinition, FormField } from "@/app/_lib/sanity/types";
import {
  WAITLIST_QUAL_STEPS,
  type WaitlistQualStep,
} from "@/app/_features/marketing/waitlist-qualification";

export const WAITLIST_FORM_KEY = "waitlist";

export const WAITLIST_FORM_FALLBACK: FormDefinition = {
  _type: "formDefinition",
  _id: "form-waitlist-fallback",
  key: WAITLIST_FORM_KEY,
  title: "Waitlist",
  route: "/waitlist",
  formKind: "waitlist",
  waitlistSource: "homepage",
  eyebrow: "Early access",
  heading: "Join the Salt waitlist",
  subheading:
    "Enter your email, then answer a few quick questions so we can prioritize your spot.",
  submitLabel: "Join the waitlist",
  gateSubmitLabel: "Continue",
  emailPlaceholder: "you@business.com",
  fields: WAITLIST_QUAL_STEPS.map((step, index) => ({
    _key: step.field,
    key: step.field,
    label: step.title,
    fieldType: step.type === "multi" ? "multi-select" : "radio",
    required: true,
    eyebrow: step.eyebrow,
    helpText: step.helpText,
    sortOrder: index + 1,
    options: step.options?.map((option) => ({
      _key: option.value,
      value: option.value,
      label: option.label,
    })),
  })),
};

export type ResolvedWaitlistForm = {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  submitLabel: string;
  emailContinueLabel: string;
  emailPlaceholder: string;
  waitlistSource: string;
  qualSteps: readonly WaitlistQualStep[];
};

export function qualStepsFromFormFields(
  fields?: FormField[] | null
): readonly WaitlistQualStep[] {
  if (!fields?.length) {
    return WAITLIST_QUAL_STEPS;
  }

  const steps = fields
    .filter((field) => field.key !== "email")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((field) => ({
      eyebrow: field.eyebrow,
      title: field.label,
      field: field.key,
      helpText: field.helpText,
      type:
        field.fieldType === "multi-select"
          ? ("multi" as const)
          : ("single" as const),
      options: field.options?.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    }))
    .filter((step) => (step.options?.length ?? 0) > 0);

  return steps.length > 0 ? steps : WAITLIST_QUAL_STEPS;
}

export function resolveWaitlistForm(
  doc?: FormDefinition | null
): ResolvedWaitlistForm {
  const fallback = WAITLIST_FORM_FALLBACK;

  return {
    eyebrow: doc?.eyebrow ?? fallback.eyebrow,
    heading: doc?.heading ?? fallback.heading ?? "Join the Salt waitlist",
    subheading: doc?.subheading ?? fallback.subheading,
    submitLabel: doc?.submitLabel ?? fallback.submitLabel ?? "Join the waitlist",
    emailContinueLabel:
      doc?.gateSubmitLabel ?? fallback.gateSubmitLabel ?? "Continue",
    emailPlaceholder:
      doc?.emailPlaceholder ?? fallback.emailPlaceholder ?? "you@business.com",
    waitlistSource: doc?.waitlistSource ?? fallback.waitlistSource ?? "homepage",
    qualSteps: qualStepsFromFormFields(doc?.fields ?? fallback.fields),
  };
}

export async function fetchResolvedWaitlistForm(
  preview = false
): Promise<ResolvedWaitlistForm> {
  const { getFormDefinition } = await import("@/app/_lib/sanity/queries");
  const doc = await getFormDefinition(WAITLIST_FORM_KEY, preview);
  return resolveWaitlistForm(doc);
}
