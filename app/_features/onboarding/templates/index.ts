/**
 * Onboarding Templates
 *
 * Pre-defined onboarding checklist templates for different project types.
 */

import type { OnboardingTemplate } from "../types";
import { websiteOnboardingTemplate } from "./website-onboarding";
import { brandOnboardingTemplate } from "./brand-onboarding";

/**
 * Map of template names to templates
 */
export const onboardingTemplates: Record<string, OnboardingTemplate> = {
  "website-onboarding": websiteOnboardingTemplate,
  "brand-onboarding": brandOnboardingTemplate,
};

/**
 * Get a template by name
 */
export function getOnboardingTemplate(name: string): OnboardingTemplate | undefined {
  return onboardingTemplates[name];
}

/**
 * Default template to use if none specified
 */
export const DEFAULT_TEMPLATE = "website-onboarding";

export { websiteOnboardingTemplate, brandOnboardingTemplate };
