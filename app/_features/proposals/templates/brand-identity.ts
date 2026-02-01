/**
 * Brand Identity Proposal Template
 *
 * Default template for brand identity and visual design projects.
 * Sections: Research, Concepts, Refinement, Delivery
 */

import type { DefaultTemplateDefinition } from "../types";

export const brandIdentityTemplate: DefaultTemplateDefinition = {
  name: "Brand Identity",
  description:
    "A comprehensive proposal template for brand identity and visual design projects.",
  sections: [
    {
      id: "research",
      title: "Research & Discovery",
      defaultContent: `## Understanding Your Brand

Every memorable brand starts with deep understanding. We'll begin by exploring who you are, who you serve, and what makes you different.

### Discovery Process
- Brand audit and competitive analysis
- Stakeholder interviews and workshops
- Target audience research
- Brand positioning workshop

### Deliverables
- **Brand Strategy Document**: Positioning, values, personality, and voice
- **Competitive Landscape Report**: Analysis of industry visual trends
- **Audience Insights**: Key findings about your target customers

### Timeline
[X] weeks`,
    },
    {
      id: "concepts",
      title: "Concept Development",
      defaultContent: `## Creative Exploration

Based on our research findings, we'll develop distinct creative directions for your brand identity.

### What to Expect
We'll present **3 unique concept directions**, each with:
- Logo mark and wordmark variations
- Color palette exploration
- Typography pairings
- Mood and style visualization

### Presentation Format
You'll receive a detailed presentation showing each concept in context—on business cards, signage, digital applications, and more.

### Selection Process
We'll schedule a concept review session to discuss each direction. You'll select one concept to move forward with, or we can combine elements from multiple directions.

### Timeline
[X] weeks`,
    },
    {
      id: "refinement",
      title: "Refinement & Finalization",
      defaultContent: `## Perfecting Your Identity

Once a direction is chosen, we'll refine every detail until your brand identity feels just right.

### Refinement Process
- Logo refinement and optimization
- Full color system development
- Typography hierarchy definition
- Graphic element development
- **Two rounds of refinements included**

### Feedback Rounds
- Round 1: Initial refinements based on concept selection feedback
- Round 2: Fine-tuning based on Round 1 feedback

### What We'll Finalize
- Primary and secondary logo lockups
- Color codes (CMYK, RGB, HEX, Pantone)
- Type specifications and usage
- Supporting graphic elements

### Timeline
[X] weeks`,
    },
    {
      id: "delivery",
      title: "Delivery & Guidelines",
      defaultContent: `## Your Brand Toolkit

We'll package your complete brand identity with everything needed to maintain consistency across all touchpoints.

### Final Deliverables

**Logo Package**
- All logo variations (primary, secondary, icon-only)
- File formats: AI, EPS, SVG, PNG, JPG
- Dark and light background versions
- Minimum size specifications

**Brand Guidelines Document**
- Logo usage rules and clear space
- Color specifications and usage
- Typography guidelines
- Do's and don'ts
- Application examples

**Digital Assets**
- Social media profile images and templates
- Email signature design
- Favicon and app icons

### Optional Extensions
- Business system design (cards, letterhead, envelopes)
- Marketing collateral templates
- Signage and environmental graphics
- Website style tiles

### Post-Delivery Support
30 days of support for questions and minor adjustments.`,
    },
  ],
  defaultTerms: {
    validity_days: 30,
    payment_terms:
      "50% deposit to begin, 25% upon concept approval, 25% upon final delivery",
    cancellation_policy:
      "Either party may cancel with 14 days written notice. Client pays for work completed to date plus any third-party costs incurred.",
    revision_policy:
      "Two rounds of refinements included in concept refinement phase. Additional revisions billed at hourly rate.",
    ownership_clause:
      "Upon final payment, client receives full ownership of the final approved brand identity. Unused concepts remain property of the studio.",
    confidentiality_clause:
      "Both parties agree to maintain confidentiality. Studio may use final work in portfolio after public launch.",
  },
};
