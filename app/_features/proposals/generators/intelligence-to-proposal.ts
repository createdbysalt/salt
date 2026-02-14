/**
 * Intelligence to Proposal Generator
 *
 * Transforms extracted proposal insights into pre-filled proposal content.
 * Maps problems → opportunity section, goals → deliverables, etc.
 */

import type {
  ProposalExtractionResult,
  ExtractedProblem,
  ExtractedGoal,
  ExtractedQuote,
  ExtractedTimeline,
  ExtractedBudget,
} from "@/app/_features/intelligence/types/proposal-intelligence";
import type { ProposalContent, ProposalTerms, ProposalSection } from "../types";

// ============================================================================
// Types
// ============================================================================

export interface GeneratedProposalContent {
  content: ProposalContent;
  terms: ProposalTerms;
  suggestedAmount?: number;
  currency: string;
}

export interface GenerationOptions {
  /** Client name for personalization */
  clientName: string;
  /** Company name if available */
  companyName?: string;
  /** Include only high confidence items */
  highConfidenceOnly?: boolean;
  /** Template style to follow */
  templateStyle?: "formal" | "conversational" | "minimal";
}

// ============================================================================
// Section Generators
// ============================================================================

/**
 * Generate the "Opportunity" section from problems and goals
 */
function generateOpportunitySection(
  extraction: ProposalExtractionResult,
  options: GenerationOptions
): ProposalSection {
  const { clientName, companyName } = options;
  const displayName = companyName || clientName;

  // Filter by confidence if requested
  const problems = options.highConfidenceOnly
    ? extraction.problems.filter((p) => p.confidence === "high")
    : extraction.problems;

  const goals = options.highConfidenceOnly
    ? extraction.goals.filter((g) => g.confidence === "high")
    : extraction.goals;

  // Build problems list
  const problemsList = problems.length > 0
    ? `### Current Challenges\n\n${problems.map((p) => `- ${p.text}`).join("\n")}`
    : "";

  // Build goals list
  const goalsList = goals.length > 0
    ? `### Desired Outcomes\n\n${goals.map((g) => `- ${g.text}`).join("\n")}`
    : "";

  // Add a relevant quote if available
  const relevantQuote = extraction.quotes.find(
    (q) => q.category === "problem" || q.category === "goal"
  );
  const quoteBlock = relevantQuote
    ? `\n\n> "${relevantQuote.text}"\n> — ${relevantQuote.speaker}`
    : "";

  const content = `## Project Overview

${displayName} is seeking a solution that will address key business challenges and deliver measurable outcomes.

${problemsList}

${goalsList}${quoteBlock}

### Success Metrics

Based on our discovery conversations, success will be measured by:
${goals
  .filter((g) => g.successCriteria)
  .map((g) => `- ${g.successCriteria}`)
  .join("\n") || "- [To be defined collaboratively]"}
`.trim();

  return {
    id: "opportunity",
    title: "The Opportunity",
    content,
    order: 0,
  };
}

/**
 * Generate the "Approach" section from goals and timeline
 */
function generateApproachSection(
  extraction: ProposalExtractionResult,
  options: GenerationOptions
): ProposalSection {
  const timeline = extraction.timeline;
  const goals = extraction.goals;

  // Infer phases from goals
  const phases: string[] = [];

  // Discovery phase (always included)
  phases.push(`### Phase 1: Discovery & Strategy

We'll begin by deepening our understanding of your business, audience, and goals.

- Stakeholder alignment session
- Requirements documentation
- Success metrics definition`);

  // Design/development phases based on goal types
  const hasTransformationGoals = goals.some((g) => g.type === "transformation");
  const hasCapabilityGoals = goals.some((g) => g.type === "capability");

  if (hasTransformationGoals || hasCapabilityGoals) {
    phases.push(`### Phase 2: Design & Development

We'll create a solution that addresses your specific needs:

${goals
  .filter((g) => g.confidence === "high")
  .slice(0, 4)
  .map((g) => `- ${g.text}`)
  .join("\n")}`);
  }

  // Launch phase
  phases.push(`### Phase 3: Launch & Handoff

We'll ensure a smooth transition and set you up for success.

- Quality assurance testing
- Training and documentation
- Post-launch support period`);

  // Add timeline context if available
  const timelineNote = timeline
    ? `\n\n**Timeline:** ${timeline.text}${
        timeline.targetDate ? ` (Target: ${timeline.targetDate})` : ""
      }`
    : "";

  const content = `## Our Approach

${phases.join("\n\n")}${timelineNote}
`.trim();

  return {
    id: "approach",
    title: "Our Approach",
    content,
    order: 1,
  };
}

/**
 * Generate the "Investment" section from budget signals
 */
function generateInvestmentSection(
  extraction: ProposalExtractionResult,
  _options: GenerationOptions
): ProposalSection {
  const budget = extraction.budget;

  let investmentContext = "";
  if (budget) {
    if (budget.range?.min && budget.range?.max) {
      investmentContext = `Based on our discussions, we understand your investment range is ${budget.range.currency}${budget.range.min.toLocaleString()} - ${budget.range.currency}${budget.range.max.toLocaleString()}.`;
    } else if (budget.stance === "flexible") {
      investmentContext = "You've indicated flexibility in investment based on value delivered.";
    } else if (budget.stance === "constrained") {
      investmentContext = "We understand budget is a key consideration and have structured this proposal accordingly.";
    }
  }

  const content = `## Project Investment

${investmentContext}

The total investment for this project is **$[AMOUNT]**.

### Payment Schedule

| Milestone | Amount | Due Date |
|-----------|--------|----------|
| Project Kickoff (50%) | $[AMOUNT] | Upon signing |
| Mid-Project Milestone | $[AMOUNT] | [DATE] |
| Final Delivery | $[AMOUNT] | [DATE] |

### What's Included

- [Deliverable 1]
- [Deliverable 2]
- [Deliverable 3]
- Post-launch support period
`.trim();

  return {
    id: "investment",
    title: "Investment",
    content,
    order: 2,
  };
}

/**
 * Generate the "Terms" section with timeline and policies
 */
function generateTermsSection(
  extraction: ProposalExtractionResult,
  _options: GenerationOptions
): ProposalSection {
  const timeline = extraction.timeline;

  const timelineText = timeline
    ? `The estimated project timeline is ${timeline.text}.`
    : "The estimated project timeline is [X] weeks from kickoff to completion.";

  const content = `## Terms & Conditions

### Timeline
${timelineText}

### Revisions
This proposal includes two rounds of revisions per deliverable. Additional revisions will be billed at our standard rate.

### Ownership
Upon final payment, you receive full ownership of all custom deliverables created for this project.

### Confidentiality
Both parties agree to maintain confidentiality of project details and proprietary information.
`.trim();

  return {
    id: "terms",
    title: "Terms & Conditions",
    content,
    order: 3,
  };
}

/**
 * Generate "Why Us" section addressing objections proactively
 */
function generateWhyUsSection(
  extraction: ProposalExtractionResult,
  _options: GenerationOptions
): ProposalSection | null {
  const objections = extraction.objections;
  const antiGoals = extraction.antiGoals;

  if (objections.length === 0 && antiGoals.length === 0) {
    return null;
  }

  const addressedConcerns: string[] = [];

  // Address objections
  for (const obj of objections.slice(0, 3)) {
    if (obj.suggestedResponse) {
      addressedConcerns.push(
        `**Regarding ${obj.type.replace("_", " ")}:** ${obj.suggestedResponse}`
      );
    }
  }

  // Address anti-goals
  for (const anti of antiGoals.filter((a) => a.severity === "dealbreaker").slice(0, 2)) {
    addressedConcerns.push(
      `**We will avoid:** ${anti.text}${anti.pastExperience ? ` (We understand this has been an issue before.)` : ""}`
    );
  }

  if (addressedConcerns.length === 0) {
    return null;
  }

  const content = `## Our Commitment to You

We've listened carefully to your concerns and priorities:

${addressedConcerns.join("\n\n")}
`.trim();

  return {
    id: "why-us",
    title: "Our Commitment",
    content,
    order: 1.5, // Between approach and investment
  };
}

// ============================================================================
// Main Generator
// ============================================================================

/**
 * Generate complete proposal content from extracted insights
 */
export function generateProposalFromInsights(
  extraction: ProposalExtractionResult,
  options: GenerationOptions
): GeneratedProposalContent {
  const sections: ProposalSection[] = [];

  // Generate core sections
  sections.push(generateOpportunitySection(extraction, options));
  sections.push(generateApproachSection(extraction, options));

  // Add "Why Us" section if we have objections to address
  const whyUsSection = generateWhyUsSection(extraction, options);
  if (whyUsSection) {
    sections.push(whyUsSection);
  }

  sections.push(generateInvestmentSection(extraction, options));
  sections.push(generateTermsSection(extraction, options));

  // Sort by order and normalize
  sections.sort((a, b) => a.order - b.order);
  sections.forEach((s, i) => (s.order = i));

  // Generate terms from extraction
  const terms: ProposalTerms = {
    validity_days: 30,
    payment_terms: "50% deposit to begin, remaining balance due upon completion",
    cancellation_policy:
      "Either party may cancel with 14 days written notice. Client pays for work completed to date.",
    revision_policy:
      "Two rounds of revisions included per deliverable. Additional revisions billed at standard rate.",
    ownership_clause:
      "Upon final payment, client receives full ownership of all custom deliverables.",
    confidentiality_clause:
      "Both parties agree to maintain confidentiality of project details and proprietary information.",
  };

  // Suggest amount from budget if available
  let suggestedAmount: number | undefined;
  let currency = "USD";

  if (extraction.budget?.range) {
    const { min, max } = extraction.budget.range;
    if (min && max) {
      suggestedAmount = Math.round((min + max) / 2);
    } else if (min) {
      suggestedAmount = min;
    } else if (max) {
      suggestedAmount = max;
    }
    currency = extraction.budget.range.currency || "USD";
  }

  return {
    content: { sections },
    terms,
    suggestedAmount,
    currency: currency.toUpperCase() as "USD" | "EUR" | "GBP" | "CAD" | "AUD",
  };
}

/**
 * Check if extraction has enough content for proposal generation
 */
export function canGenerateProposal(extraction: ProposalExtractionResult): {
  canGenerate: boolean;
  reason?: string;
  score: number;
} {
  let score = 0;
  const issues: string[] = [];

  // Must have at least one problem or goal
  if (extraction.problems.length > 0) {
    score += 30;
  } else {
    issues.push("No problems identified");
  }

  if (extraction.goals.length > 0) {
    score += 30;
  } else {
    issues.push("No goals identified");
  }

  // Bonus for high-confidence items
  const highConfidenceCount =
    extraction.problems.filter((p) => p.confidence === "high").length +
    extraction.goals.filter((g) => g.confidence === "high").length;

  if (highConfidenceCount >= 2) {
    score += 20;
  }

  // Bonus for timeline/budget
  if (extraction.timeline) score += 10;
  if (extraction.budget) score += 10;

  const canGenerate = score >= 50;

  return {
    canGenerate,
    reason: canGenerate ? undefined : issues.join(", "),
    score,
  };
}
