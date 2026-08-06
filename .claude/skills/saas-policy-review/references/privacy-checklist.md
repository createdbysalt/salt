# Privacy Policy Review Checklist

Read this before reading the document under review. Work through each section
and note presence, absence, and contradiction. Not every item applies to every
product: use the product context from Step 1 to decide what is in scope.

## Contents

1. Identity and scope
2. What is collected
3. Why it is collected (lawful basis and purpose)
4. Who it is shared with
5. AI and machine learning
6. Retention and deletion
7. International transfers
8. Individual rights
9. US state law requirements
10. Children
11. Cookies and tracking
12. Security
13. Changes and notice
14. DPA and subprocessor documents
15. Common contradictions

---

## 1. Identity and scope

- Legal entity name matches the actual contracting entity, including suffix
  (Inc., LLC, Ltd.). A mismatch here undermines every other commitment.
- Registered address and a working privacy contact address.
- EU or UK representative named if the company targets those markets without
  an establishment there (GDPR Article 27). Commonly missing at startups.
- DPO named if required, or an explanation of why one is not required.
- Scope statement: which products, domains, and apps this policy covers.
  Watch for a policy that covers "our website" when the actual data risk is in
  the product.
- Controller vs processor role is stated and correct. A B2B SaaS is usually a
  processor for customer data and a controller for its own account and
  marketing data. Policies that collapse these confuse everything downstream.

## 2. What is collected

- Categories are specific, not "information you provide to us."
- Data collected automatically is listed: IP, device identifiers, browser,
  usage telemetry, session recordings, crash logs.
- Data from third parties is listed: enrichment vendors, OAuth providers,
  advertising partners, resellers.
- Inferred and derived data is disclosed. Frequently omitted and frequently
  the most sensitive category.
- Sensitive categories are called out separately if collected: health,
  biometric, precise geolocation, racial or ethnic origin, sexual orientation,
  religious belief, union membership, government ID numbers, financial
  accounts, immigration status.
- Optional vs required is distinguished. If a field is required, the policy
  should not imply it is optional.

## 3. Why it is collected

- A purpose is stated for each category, not one blanket purpose list.
- GDPR lawful basis stated per purpose where the GDPR applies: consent,
  contract, legal obligation, vital interests, public task, legitimate
  interests.
- Where legitimate interests is claimed, the interest is actually named.
  "Legitimate interests" with no stated interest is not a lawful basis.
- Consent, where relied on, is described as freely given, specific, informed,
  unambiguous, and withdrawable. Check that a withdrawal mechanism actually
  exists in the product, not just in the policy.
- No purpose creep: a category collected for one purpose is not later used for
  an unrelated one without a basis.

## 4. Who it is shared with

- Categories of recipients, at minimum. A named subprocessor list is stronger
  and is what enterprise buyers will ask for.
- Purpose per recipient category.
- Whether any disclosure constitutes a "sale" or "share" under CCPA/CPRA. Note
  that "share" under CPRA covers cross-context behavioral advertising even with
  no money changing hands, which catches many companies that believe they do
  not sell data.
- Business transfer clause (merger, acquisition, bankruptcy).
- Legal process disclosure, ideally with a commitment to notify users where
  legally permitted.
- Affiliate sharing, if there are affiliates.

## 5. AI and machine learning

This is the highest-frequency gap in current SaaS policies and the fastest way
to lose an enterprise deal.

- Whether customer data is used to train, fine-tune, or evaluate models.
- Whether it is the company's own models or a third party provider's.
- Which third party model providers receive data, and under what data-use
  terms. Whether the provider's zero-retention or no-training option is
  actually enabled matters more than the policy language.
- Whether there is an opt-out, whether it is default-on or default-off, and
  whether the default differs between free and paid tiers.
- Whether human reviewers ever see customer content.
- Whether outputs are retained, and for how long.
- Automated decision-making disclosure if any decision produces legal or
  similarly significant effects (GDPR Article 22): the logic involved, the
  significance, and the right to human review.

## 6. Retention and deletion

- A stated period or a stated criterion per category. "As long as necessary"
  alone is not a retention policy.
- What happens on account deletion, and how fast.
- Backup reality is disclosed. See the worked example in SKILL.md: this is the
  single most common provably-false statement in startup privacy policies.
- Anonymized or aggregated data carve-out is honest about whether the data is
  actually anonymized (irreversible) or merely pseudonymized (reversible, and
  still personal data under GDPR).
- Legal hold and legal obligation exceptions.

## 7. International transfers

- Whether data leaves the EEA, UK, or Switzerland.
- The transfer mechanism named: Standard Contractual Clauses, UK IDTA or
  Addendum, adequacy decision, EU-US Data Privacy Framework certification.
- If DPF is claimed, the certification should be active and verifiable.
- Onward transfer by subprocessors addressed.
- Availability of the transfer safeguards on request.

## 8. Individual rights

- Access, rectification, erasure, restriction, portability, objection.
- Right to withdraw consent, and how.
- Right to complain to a supervisory authority, ideally naming the lead one.
- A working mechanism to exercise each right, with a response timeline.
- Identity verification process described without demanding excessive new data.
- No fee for the first request, and no retaliation.

## 9. US state law requirements

Applicable states now go well beyond California. Check for:

- Notice at collection at or before the point of collection, not only in the
  policy.
- Categories collected, sources, business purposes, and third parties
  disclosed in the CCPA-required format.
- "Do Not Sell or Share My Personal Information" link if there is any sale or
  share.
- Sensitive personal information limitation right, with its own link or a
  combined one.
- Global Privacy Control honored. This is enforced, not theoretical.
- Non-discrimination statement, and if there is a financial incentive program,
  a good-faith estimate of the value of the data.
- Authorized agent process.
- Metrics disclosure if the company meets the volume threshold.
- Other state regimes (Virginia, Colorado, Connecticut, Texas, Oregon,
  Montana, and others) impose overlapping but not identical duties, notably
  universal opt-out signals and data protection assessments for targeted
  advertising, sale, and profiling. Note the exposure and route jurisdiction
  specifics to counsel.

## 10. Children

- A minimum age is stated and matches the actual product gate.
- If under-13 data is collected knowingly, COPPA verifiable parental consent
  is addressed. If it is not addressed, this is a BLOCKER.
- Teen-specific protections where state law imposes them.
- What happens when the company learns it has collected a child's data.

## 11. Cookies and tracking

- Categories: strictly necessary, functional, analytics, advertising.
- Consent obtained before non-essential cookies fire in EU/UK, not after.
  Check the actual banner behavior if it is available, not just the policy.
- Reject is as easy as accept. A banner with a prominent Accept and a buried
  Reject is an enforcement target.
- Named third party tags, or a link to a live cookie inventory.
- Duration per cookie or cookie category.
- Do Not Track and Global Privacy Control statement.

## 12. Security

- Describes the actual control set at a level that is true: encryption in
  transit and at rest, access controls, logging, vendor review.
- Avoids absolute claims. "We guarantee your data is secure" is both false and
  quotable back at the company after an incident.
- Breach notification commitment and timeline.
- Certifications claimed (SOC 2, ISO 27001) are actually held and current.

## 13. Changes and notice

- How changes are communicated, and whether material changes get advance
  notice rather than silent republishing.
- Effective date and, ideally, a version history.
- Continued use as acceptance is workable for a privacy policy but does not
  substitute for fresh consent where consent is the lawful basis.

## 14. DPA and subprocessor documents

If a DPA or subprocessor list is in scope:

- Processing details: subject matter, duration, nature, purpose, categories of
  data and data subjects (GDPR Article 28(3)).
- Instruction-only processing, confidentiality obligations, security measures.
- Subprocessor authorization: general or specific, with a notice period and a
  right to object.
- Audit rights that are realistic (usually a report plus a limited audit right)
  rather than an unlimited on-site right the company cannot honor.
- Assistance with data subject requests, breach notification, and DPIAs.
- Deletion or return at termination.
- Transfer mechanism incorporated by reference.
- The subprocessor list is current. A stale list is worse than none: it is a
  documented misstatement.

## 15. Common contradictions

Check these specifically. They are the findings that carry the most weight
because they are objective rather than interpretive.

- Policy says data is never shared; the subprocessor list names ten vendors.
- Policy says immediate deletion; DPA or backup practice says 30 days.
- Policy says no AI training; the product changelog or marketing site says
  "learns from your usage."
- Policy names one entity; the ToS names another; Stripe charges under a third.
- Policy claims a DPF certification that is lapsed or was never filed.
- Policy says EU data stays in the EU; the hosting region or CDN says otherwise.
- Cookie policy lists three tags; the site fires eleven.
