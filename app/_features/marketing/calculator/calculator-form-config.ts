import type { FormDefinition } from "@/app/_lib/sanity/types";
import { getFormDefinition } from "@/app/_lib/sanity/queries";

export const CALCULATOR_FORM_KEY = "money-on-the-table";

export type ResolvedCalculatorForm = {
  eyebrow: string;
  heading: string;
  subheading: string;
  submitLabel: string;
  waitlistSource: string;
};

const CALCULATOR_FORM_FALLBACK: ResolvedCalculatorForm = {
  eyebrow: "The money on the table calculator",
  heading: "How much is your business\nleaving on the table?",
  subheading:
    "Seven questions, two minutes. See an estimate of what slow replies, silent proposals, and admin hours cost a business like yours every year.",
  submitLabel: "Show me the money on the table",
  waitlistSource: "calculator",
};

export function resolveCalculatorForm(
  doc?: FormDefinition | null
): ResolvedCalculatorForm {
  return {
    eyebrow: doc?.eyebrow ?? CALCULATOR_FORM_FALLBACK.eyebrow,
    heading: doc?.heading ?? CALCULATOR_FORM_FALLBACK.heading,
    subheading: doc?.subheading ?? CALCULATOR_FORM_FALLBACK.subheading,
    submitLabel: doc?.submitLabel ?? CALCULATOR_FORM_FALLBACK.submitLabel,
    waitlistSource:
      doc?.waitlistSource ?? CALCULATOR_FORM_FALLBACK.waitlistSource,
  };
}

export async function fetchResolvedCalculatorForm(
  preview = false
): Promise<ResolvedCalculatorForm> {
  const doc = await getFormDefinition(CALCULATOR_FORM_KEY, preview);
  return resolveCalculatorForm(doc);
}
