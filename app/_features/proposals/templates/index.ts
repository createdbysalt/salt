/**
 * Proposals Feature - Default Templates
 *
 * Code-based templates for common proposal types.
 * These serve as starting points for studio-customized templates.
 */

export { websiteDesignTemplate } from "./website-design";
export { brandIdentityTemplate } from "./brand-identity";
export { retainerTemplate } from "./retainer";

import { websiteDesignTemplate } from "./website-design";
import { brandIdentityTemplate } from "./brand-identity";
import { retainerTemplate } from "./retainer";
import type { DefaultTemplateDefinition } from "../types";

/**
 * All available default templates
 */
export const defaultTemplates: Record<string, DefaultTemplateDefinition> = {
  "website-design": websiteDesignTemplate,
  "brand-identity": brandIdentityTemplate,
  retainer: retainerTemplate,
};

/**
 * Get a template by its key
 */
export function getDefaultTemplate(
  key: string
): DefaultTemplateDefinition | undefined {
  return defaultTemplates[key];
}

/**
 * List all available template keys
 */
export function getTemplateKeys(): string[] {
  return Object.keys(defaultTemplates);
}
