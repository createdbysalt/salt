/**
 * Retainer Proposal Template
 *
 * Default template for ongoing retainer agreements.
 * Sections: Scope, Hours, Process, Renewal
 */

import type { DefaultTemplateDefinition } from "../types";

export const retainerTemplate: DefaultTemplateDefinition = {
  name: "Retainer Agreement",
  description:
    "A proposal template for ongoing retainer relationships and monthly service agreements.",
  sections: [
    {
      id: "scope",
      title: "Scope of Services",
      defaultContent: `## What's Included

This retainer agreement covers ongoing [design/development/creative] services for [Client Name].

### Services Included
- [Service 1]: Brief description
- [Service 2]: Brief description
- [Service 3]: Brief description

### Example Tasks
The following types of work are included in your retainer:
- Design updates and refinements
- New page/feature development
- Content updates and revisions
- Bug fixes and maintenance
- Strategy and consultation calls

### Out of Scope
The following require separate project proposals:
- Major redesigns or new product development
- Third-party integrations requiring research
- Work requiring specialized contractors
- Rush work outside normal turnaround times

### Turnaround Times
- Minor updates: 2-3 business days
- Medium tasks: 5-7 business days
- Larger requests: Estimated on request`,
    },
    {
      id: "hours",
      title: "Hours & Investment",
      defaultContent: `## Monthly Commitment

### Retainer Package
**[X] hours per month** at a preferred rate of **$[X]/hour**

**Monthly Investment: $[TOTAL]**

### Hour Usage
- Hours are available for any in-scope work
- Unused hours do not roll over to the following month
- Additional hours available at $[X]/hour (standard rate)

### Hour Tracking
- You'll receive a weekly summary of hours used
- Access to real-time hour tracking dashboard
- End-of-month report with detailed time breakdown

### Rate Comparison
| Rate Type | Hourly Rate |
|-----------|-------------|
| Retainer (preferred) | $[X]/hour |
| Standard (non-retainer) | $[X]/hour |
| Rush (under 48hr turnaround) | $[X]/hour |

**Your savings: $[X]/hour or [X]% off standard rates**`,
    },
    {
      id: "process",
      title: "How We Work",
      defaultContent: `## Working Together

### Communication
- **Primary Channel**: [Slack/Email/Project Management Tool]
- **Response Time**: Within 1 business day
- **Monthly Check-in**: 30-minute call to review priorities

### Request Process
1. **Submit**: Send requests via [preferred channel]
2. **Estimate**: We'll confirm hours needed within 24 hours
3. **Approve**: You approve or adjust scope
4. **Execute**: We complete the work
5. **Review**: You review and provide feedback

### Prioritization
You can adjust priorities at any time. We recommend:
- Submitting requests by [day] for the following week
- Flagging urgent items clearly
- Batching small requests when possible

### Feedback & Revisions
- One round of revisions included per task
- Additional revisions count against retainer hours
- Clear, consolidated feedback helps us work efficiently`,
    },
    {
      id: "renewal",
      title: "Terms & Renewal",
      defaultContent: `## Agreement Terms

### Duration
This retainer agreement is for an initial term of **[X] months**, beginning [START DATE].

### Billing
- Invoiced on the 1st of each month
- Payment due within 15 days
- Work pauses if payment is more than 30 days overdue

### Adjustments
- Hour packages can be adjusted with 30 days notice
- Rate changes communicated with 60 days notice
- Annual rate review each [month]

### Renewal
This agreement automatically renews month-to-month after the initial term unless:
- Either party provides 30 days written notice
- Terms are renegotiated for the renewal period

### Cancellation
- Either party may cancel with 30 days written notice
- Client pays for hours used in final month
- No refunds for unused hours in final month

### Availability Guarantee
As a retainer client, you receive:
- Priority scheduling over non-retainer work
- Guaranteed response within 1 business day
- First access to new services and capabilities`,
    },
  ],
  defaultTerms: {
    validity_days: 14,
    payment_terms:
      "Monthly retainer invoiced on the 1st, due within 15 days. First month due upon signing.",
    cancellation_policy:
      "Either party may cancel with 30 days written notice. Client pays for hours used; unused hours in final month are not refunded.",
    revision_policy:
      "One round of revisions included per task. Additional revisions count against retainer hours.",
    ownership_clause:
      "Client owns all work product created under this agreement upon payment.",
    confidentiality_clause:
      "Both parties agree to maintain confidentiality of business information and project details.",
  },
};
