/**
 * Website Design Proposal Template
 *
 * Default template for website design projects.
 * Sections: Opportunity, Approach, Investment, Terms
 */

import type { DefaultTemplateDefinition } from "../types";

export const websiteDesignTemplate: DefaultTemplateDefinition = {
  name: "Website Design",
  description:
    "A comprehensive proposal template for website design and development projects.",
  sections: [
    {
      id: "opportunity",
      title: "The Opportunity",
      defaultContent: `## Project Overview

[Client Name] is seeking a new website that will [primary goal]. This project represents an opportunity to [value proposition].

### Business Goals
- Increase online visibility and brand presence
- Improve user experience and conversion rates
- Establish a modern, professional digital presence

### Target Audience
Describe your ideal website visitors and their needs.

### Success Metrics
How will we measure the success of this project?`,
    },
    {
      id: "approach",
      title: "Our Approach",
      defaultContent: `## Project Phases

### Phase 1: Discovery & Strategy
We'll begin by understanding your business, audience, and goals through collaborative workshops and research.

- Stakeholder interviews
- Competitive analysis
- User research and persona development
- Content strategy recommendations

### Phase 2: Design
We'll create a visual direction that reflects your brand and resonates with your audience.

- Wireframes and layout concepts
- Visual design mockups
- Responsive design for all devices
- Two rounds of revisions included

### Phase 3: Development
We'll build your website using modern, scalable technologies.

- Clean, semantic HTML/CSS
- Mobile-first responsive implementation
- Performance optimization
- SEO best practices
- CMS integration

### Phase 4: Launch & Handoff
We'll ensure a smooth launch and set you up for success.

- Quality assurance testing
- Content migration support
- Training and documentation
- 30-day post-launch support`,
    },
    {
      id: "investment",
      title: "Investment",
      defaultContent: `## Project Investment

The total investment for this project is **$[AMOUNT]**.

### Payment Schedule

| Milestone | Amount | Due Date |
|-----------|--------|----------|
| Project Kickoff (50%) | $[AMOUNT] | Upon signing |
| Design Approval | $[AMOUNT] | [DATE] |
| Final Delivery | $[AMOUNT] | [DATE] |

### What's Included
- Custom website design (up to [X] pages)
- Responsive development
- CMS setup and configuration
- Basic SEO optimization
- 30-day post-launch support

### Optional Add-ons
- Additional pages: $[X] per page
- E-commerce functionality: $[X]
- Custom integrations: Quoted separately`,
    },
    {
      id: "terms",
      title: "Terms & Conditions",
      defaultContent: `## Project Terms

### Timeline
The estimated project timeline is [X] weeks from kickoff to launch, subject to timely feedback and content delivery.

### Revisions
This proposal includes two rounds of design revisions. Additional revisions will be billed at our hourly rate.

### Content
Client is responsible for providing all written content and imagery. We can assist with content strategy and sourcing at additional cost.

### Ownership
Upon final payment, client receives full ownership of all custom design and code created for this project.

### Confidentiality
Both parties agree to keep project details confidential unless otherwise agreed.`,
    },
  ],
  defaultTerms: {
    validity_days: 30,
    payment_terms: "50% deposit to begin, remaining balance due upon completion",
    cancellation_policy:
      "Either party may cancel with 14 days written notice. Client pays for work completed to date.",
    revision_policy:
      "Two rounds of design revisions included. Additional revisions billed at hourly rate.",
    ownership_clause:
      "Upon final payment, client receives full ownership of all custom deliverables.",
    confidentiality_clause:
      "Both parties agree to maintain confidentiality of project details and proprietary information.",
  },
};
