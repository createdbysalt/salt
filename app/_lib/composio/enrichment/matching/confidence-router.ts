import type { MatchMethod } from "./engine";

/**
 * Confidence router for field-level extraction decisions.
 * Routes extractions to: auto-accept, flag for review, or human review.
 *
 * Thresholds calibrated per research:
 * - High-stakes (financial): 0.98+ auto-accept
 * - Standard (business data): 0.90+ auto-accept
 * - Low-stakes (metadata): 0.80+ auto-accept
 */

export type FieldRiskLevel = "high_stakes" | "standard" | "low_stakes";
export type RoutingDecision = "auto_accept" | "flag_review" | "human_review";

interface ConfidenceThresholds {
  autoAccept: number;
  flagReview: number;
}

const CONFIDENCE_THRESHOLDS: Record<FieldRiskLevel, ConfidenceThresholds> = {
  high_stakes: { autoAccept: 0.98, flagReview: 0.90 },
  standard: { autoAccept: 0.90, flagReview: 0.75 },
  low_stakes: { autoAccept: 0.80, flagReview: 0.60 },
};

const FIELD_RISK_LEVELS: Record<string, FieldRiskLevel> = {
  amount_cents: "high_stakes",
  base_price_cents: "high_stakes",
  currency: "high_stakes",
  billing_email: "high_stakes",
  tax_id: "high_stakes",
  status: "high_stakes",

  email: "standard",
  name: "standard",
  phone: "standard",
  title: "standard",
  company: "standard",
  address_line_1: "standard",
  address_line_2: "standard",
  city: "standard",
  state: "standard",
  postal_code: "standard",
  country: "standard",
  website: "standard",
  domain: "standard",
  start_time: "standard",
  end_time: "standard",
  due_at: "standard",

  notes: "low_stakes",
  description: "low_stakes",
  value_proposition: "low_stakes",
  deliverables: "low_stakes",
  prerequisites: "low_stakes",
  differentiators: "low_stakes",
  linkedin_url: "low_stakes",
  twitter_handle: "low_stakes",
  timezone: "low_stakes",
  label: "low_stakes",
};

export function getFieldRiskLevel(fieldName: string): FieldRiskLevel {
  return FIELD_RISK_LEVELS[fieldName] ?? "standard";
}

export function routeByConfidence(fieldName: string, confidence: number): RoutingDecision {
  const riskLevel = getFieldRiskLevel(fieldName);
  const thresholds = CONFIDENCE_THRESHOLDS[riskLevel];

  if (confidence >= thresholds.autoAccept) return "auto_accept";
  if (confidence >= thresholds.flagReview) return "flag_review";
  return "human_review";
}

const METHOD_CONFIDENCE_CAPS: Record<MatchMethod, number> = {
  deterministic: 0.99,
  fuzzy: 0.95,
  semantic: 0.90,
  llm: 0.85,
};

const METHOD_DISCOUNT_FACTORS: Record<MatchMethod, number> = {
  deterministic: 1.0,
  fuzzy: 0.95,
  semantic: 0.90,
  llm: 0.85,
};

export function assignConfidence(method: MatchMethod, rawScore: number): number {
  const discountFactor = METHOD_DISCOUNT_FACTORS[method];
  const cap = METHOD_CONFIDENCE_CAPS[method];
  return Math.min(rawScore * discountFactor, cap);
}

export function shouldAutoAccept(fieldName: string, confidence: number): boolean {
  return routeByConfidence(fieldName, confidence) === "auto_accept";
}

export function shouldFlagForReview(fieldName: string, confidence: number): boolean {
  return routeByConfidence(fieldName, confidence) === "flag_review";
}

export function shouldRequireHumanReview(fieldName: string, confidence: number): boolean {
  return routeByConfidence(fieldName, confidence) === "human_review";
}

export interface RoutingResult {
  fieldName: string;
  confidence: number;
  riskLevel: FieldRiskLevel;
  decision: RoutingDecision;
  thresholds: ConfidenceThresholds;
}

export function routeFieldExtraction(fieldName: string, confidence: number): RoutingResult {
  const riskLevel = getFieldRiskLevel(fieldName);
  const thresholds = CONFIDENCE_THRESHOLDS[riskLevel];
  const decision = routeByConfidence(fieldName, confidence);

  return {
    fieldName,
    confidence,
    riskLevel,
    decision,
    thresholds,
  };
}

export function routeAllFields(
  fields: Array<{ fieldName: string; confidence: number }>
): {
  autoAccept: RoutingResult[];
  flagReview: RoutingResult[];
  humanReview: RoutingResult[];
} {
  const autoAccept: RoutingResult[] = [];
  const flagReview: RoutingResult[] = [];
  const humanReview: RoutingResult[] = [];

  for (const { fieldName, confidence } of fields) {
    const result = routeFieldExtraction(fieldName, confidence);

    switch (result.decision) {
      case "auto_accept":
        autoAccept.push(result);
        break;
      case "flag_review":
        flagReview.push(result);
        break;
      case "human_review":
        humanReview.push(result);
        break;
    }
  }

  return { autoAccept, flagReview, humanReview };
}
